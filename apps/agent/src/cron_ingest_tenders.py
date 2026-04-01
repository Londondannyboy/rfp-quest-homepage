"""
Daily cron ingestion for UK government tenders.
Fetches tenders published in the last 25 hours and upserts to Neon.
Run as Railway cron: 0 6 * * * (6am UTC daily)

Usage:
    cd apps/agent
    uv run python src/cron_ingest_tenders.py
"""

import os
import httpx
import psycopg2
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

OCDS_BASE = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search"

def get_db():
    return psycopg2.connect(DATABASE_URL)

def fetch_recent(hours=25):
    date_from = datetime.now() - timedelta(hours=hours)
    url = (
        f"{OCDS_BASE}?limit=100&format=json"
        f"&publishedFrom={date_from.strftime('%Y-%m-%d')}"
    )
    with httpx.Client(timeout=30) as client:
        resp = client.get(url)
        return resp.json().get("releases", [])

def main():
    print(f"Cron ingest started at {datetime.now().isoformat()}")
    releases = fetch_recent(hours=25)
    print(f"Fetched {len(releases)} releases from OCDS")

    if not releases:
        print("No new tenders found. Done.")
        return

    conn = get_db()
    added = 0

    with conn.cursor() as cur:
        for release in releases:
            tender = release.get("tender", {})
            ocid = release.get("ocid", "")
            if not ocid:
                continue
            cur.execute("""
                INSERT INTO tenders (ocid, title, buyer_name, value_amount, tender_end_date,
                    status, raw_ocds, source, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, NOW())
                ON CONFLICT (ocid) DO NOTHING
            """, (
                ocid,
                tender.get("title", "Untitled"),
                release.get("buyer", {}).get("name", "Unknown"),
                tender.get("value", {}).get("amount", 0),
                tender.get("tenderPeriod", {}).get("endDate", None),
                "Open" if "tender" in release.get("tag", []) else "Awarded",
                json.dumps(release),
                "ocds-cron",
            ))
            if cur.rowcount:
                added += 1

    conn.commit()
    conn.close()
    print(f"Done. {added} new tenders added to Neon.")

if __name__ == "__main__":
    main()
