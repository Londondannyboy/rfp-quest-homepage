"""
One-time historical bulk loader for UK government tenders.
Walks OCDS API backwards in 7-day windows from today to 2024-01-01.
Upserts each tender to Neon. Resumable — skips existing ocids.

Usage:
    cd apps/agent
    uv run python src/bulk_load_tenders.py

Expected runtime: 30-90 minutes depending on volume.
Expected output: 10,000-50,000 tenders loaded.
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
START_DATE = datetime(2024, 1, 1)
WINDOW_DAYS = 7
BATCH_SIZE = 50

def get_db():
    return psycopg2.connect(DATABASE_URL)

def fetch_window(date_from: datetime, date_to: datetime):
    """Fetch all tenders in a date window, handling pagination."""
    tenders = []
    page = 1
    while True:
        url = (
            f"{OCDS_BASE}?limit=100&format=json&page={page}"
            f"&publishedFrom={date_from.strftime('%Y-%m-%d')}"
            f"&publishedTo={date_to.strftime('%Y-%m-%d')}"
        )
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.get(url)
                data = resp.json()
                releases = data.get("releases", [])
                if not releases:
                    break
                tenders.extend(releases)
                if len(releases) < 100:
                    break
                page += 1
        except Exception as e:
            print(f"  Error fetching page {page}: {e}")
            break
    return tenders

def parse_tender(release):
    tender = release.get("tender", {})
    return {
        "ocid": release.get("ocid", ""),
        "title": tender.get("title", "Untitled"),
        "buyer": release.get("buyer", {}).get("name", "Unknown"),
        "value": tender.get("value", {}).get("amount", 0),
        "deadline": tender.get("tenderPeriod", {}).get("endDate", None),
        "status": "Open" if "tender" in release.get("tag", []) else "Awarded",
        "raw_json": json.dumps(release),
        "source": "ocds-bulk",
    }

def upsert_batch(conn, tenders):
    with conn.cursor() as cur:
        for t in tenders:
            if not t["ocid"]:
                continue
            cur.execute("""
                INSERT INTO tenders (ocid, title, buyer, value, deadline,
                    status, raw_json, source, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (ocid) DO NOTHING
            """, (
                t["ocid"], t["title"], t["buyer"], t["value"],
                t["deadline"], t["status"], t["raw_json"], t["source"]
            ))
    conn.commit()

def main():
    conn = get_db()
    total = 0
    current = datetime.now()

    print(f"Starting bulk load from {START_DATE.date()} to {current.date()}")

    while current > START_DATE:
        window_start = current - timedelta(days=WINDOW_DAYS)
        if window_start < START_DATE:
            window_start = START_DATE

        print(f"Fetching {window_start.date()} → {current.date()}...", end=" ")
        releases = fetch_window(window_start, current)

        if releases:
            tenders = [parse_tender(r) for r in releases]
            for i in range(0, len(tenders), BATCH_SIZE):
                upsert_batch(conn, tenders[i:i+BATCH_SIZE])
            total += len(tenders)
            print(f"{len(tenders)} tenders ({total} total)")
        else:
            print("0 tenders")

        current = window_start

    conn.close()
    print(f"\nDone. Total tenders processed: {total}")

if __name__ == "__main__":
    main()
