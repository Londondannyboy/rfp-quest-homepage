"""
One-time historical bulk loader for UK government tenders.
Walks Contracts Finder OCDS API backwards in 7-day windows from today to 2024-01-01.
Upserts each page of 100 releases immediately — no memory buffering.
Resumable — skips existing ocids.

Usage:
    cd apps/agent
    uv run python src/bulk_load_tenders.py

Expected runtime: 2-6 hours depending on API speed.
Expected output: 10,000-50,000 releases loaded.
"""

import os
import sys
import time
import math
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
REQUEST_DELAY = 0.5


def sanitize_for_json(obj):
    """Recursively replace Infinity/NaN with None for PostgreSQL JSONB compatibility."""
    if isinstance(obj, float):
        if math.isinf(obj) or math.isnan(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    return obj


def safe_json_dumps(obj) -> str:
    return json.dumps(sanitize_for_json(obj))


def get_db():
    return psycopg2.connect(DATABASE_URL)


def fetch_one_page(date_from, date_to, page):
    """Fetch a single page of 100 releases from OCDS API."""
    url = (
        f"{OCDS_BASE}?limit=100&format=json&page={page}"
        f"&publishedFrom={date_from.strftime('%Y-%m-%d')}"
        f"&publishedTo={date_to.strftime('%Y-%m-%d')}"
    )
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.get(url)
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", "10"))
                print(f"  Rate limited, waiting {retry_after}s...", flush=True)
                time.sleep(retry_after)
                return fetch_one_page(date_from, date_to, page)
            return resp.json().get("releases", [])
    except Exception as e:
        print(f"  Error fetching page {page}: {e}", flush=True)
        return []


def get_stage(release):
    tags = release.get("tag", [])
    for tag in tags:
        if tag in ("award", "awardUpdate"):
            return "award"
        if tag in ("tender", "tenderUpdate", "tenderAmendment"):
            return "tender"
        if tag in ("planning", "planningUpdate"):
            return "planning"
        if tag in ("contract", "contractAmendment", "contractTermination"):
            return "contract"
        if tag == "tenderCancellation":
            return "tenderCancellation"
    return tags[0] if tags else "unknown"


def extract_cpv_codes(release):
    cpv_codes = []
    tender = release.get("tender", {})
    classification = tender.get("classification", {})
    if classification.get("scheme") == "CPV" and classification.get("id"):
        cpv_codes.append(classification["id"])
    for item in tender.get("items", []):
        item_class = item.get("classification", {})
        if item_class.get("scheme") == "CPV" and item_class.get("id"):
            cpv_codes.append(item_class["id"])
        for add_class in item.get("additionalClassifications", []):
            if add_class.get("scheme") == "CPV" and add_class.get("id"):
                cpv_codes.append(add_class["id"])
    return list(set(cpv_codes))


def extract_value(release):
    tender = release.get("tender", {})
    stage = get_stage(release)
    value_amount = value_min = value_max = None

    if stage in ("tender", "tenderCancellation", "planning"):
        value_obj = tender.get("value", {})
        value_amount = value_obj.get("amount")
        min_obj = tender.get("minValue", {})
        max_obj = tender.get("maxValue", {}) or value_obj
        value_min = min_obj.get("amount") if min_obj else None
        value_max = max_obj.get("amount") if max_obj else None
    elif stage == "award":
        awards = release.get("awards", [])
        if awards:
            value_amount = awards[0].get("value", {}).get("amount")
    elif stage == "contract":
        contracts = release.get("contracts", [])
        if contracts:
            value_amount = contracts[0].get("value", {}).get("amount")

    return value_amount, value_min, value_max


def parse_release(release):
    tender = release.get("tender", {})
    stage = get_stage(release)
    value_amount, value_min, value_max = extract_value(release)
    cpv_codes = extract_cpv_codes(release)
    tags = release.get("tag", [])

    if "tenderCancellation" in tags:
        status = "Cancelled"
    elif "award" in tags or "awardUpdate" in tags:
        status = "Awarded"
    elif "tender" in tags or "tenderUpdate" in tags:
        status = "Open"
    elif "planning" in tags:
        status = "Planning"
    elif "contract" in tags or "contractAmendment" in tags:
        status = "Contract"
    else:
        status = "Unknown"

    buyer = release.get("buyer", {})
    buyer_name = buyer.get("name", "Unknown")
    buyer_id = buyer.get("id")
    if buyer_name == "Unknown":
        for party in release.get("parties", []):
            if "buyer" in party.get("roles", []):
                buyer_name = party.get("name", "Unknown")
                buyer_id = party.get("id")
                break

    tender_period = tender.get("tenderPeriod", {})
    contract_period = tender.get("contractPeriod", {})
    region = None
    addresses = tender.get("deliveryAddresses", [])
    if addresses:
        region = addresses[0].get("region")

    return {
        "ocid": release.get("ocid", ""),
        "release_id": release.get("id"),
        "title": tender.get("title") or release.get("title", "Untitled"),
        "description": tender.get("description"),
        "status": status,
        "stage": stage,
        "buyer_name": buyer_name,
        "buyer_id": buyer_id,
        "value_amount": value_amount,
        "value_currency": tender.get("value", {}).get("currency", "GBP"),
        "value_min": value_min,
        "value_max": value_max,
        "published_date": release.get("date"),
        "tender_start_date": tender_period.get("startDate"),
        "tender_end_date": tender_period.get("endDate"),
        "contract_start_date": contract_period.get("startDate"),
        "contract_end_date": contract_period.get("endDate"),
        "cpv_codes": json.dumps(cpv_codes),
        "region": region,
        "raw_ocds": safe_json_dumps(release),
        "source": "contracts-finder",
    }


INSERT_SQL = """
    INSERT INTO tenders (
        ocid, release_id, title, description, status, stage,
        buyer_name, buyer_id, value_amount, value_currency,
        value_min, value_max, published_date, tender_start_date,
        tender_end_date, contract_start_date, contract_end_date,
        cpv_codes, region, raw_ocds, source, fetched_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s,
        %s::jsonb, %s, %s::jsonb, %s, NOW()
    )
    ON CONFLICT (ocid) DO NOTHING
"""


def upsert_batch(conn, parsed_releases):
    with conn.cursor() as cur:
        for t in parsed_releases:
            if not t["ocid"]:
                continue
            try:
                cur.execute("SAVEPOINT insert_row")
                cur.execute(INSERT_SQL, (
                    t["ocid"], t["release_id"], t["title"], t["description"],
                    t["status"], t["stage"],
                    t["buyer_name"], t["buyer_id"],
                    t["value_amount"], t["value_currency"],
                    t["value_min"], t["value_max"],
                    t["published_date"], t["tender_start_date"],
                    t["tender_end_date"], t["contract_start_date"],
                    t["contract_end_date"],
                    t["cpv_codes"], t["region"],
                    t["raw_ocds"], t["source"],
                ))
                cur.execute("RELEASE SAVEPOINT insert_row")
            except Exception as e:
                cur.execute("ROLLBACK TO SAVEPOINT insert_row")
                print(f"  Skipped {t['ocid']}: {str(e)[:100]}", flush=True)
    conn.commit()


def fetch_and_insert_window(conn, date_from, date_to, cumulative_total):
    """Fetch and insert one 7-day window, page by page. Returns rows added."""
    page = 1
    window_total = 0
    while True:
        releases = fetch_one_page(date_from, date_to, page)
        if not releases:
            break
        parsed = [parse_release(r) for r in releases]
        upsert_batch(conn, parsed)
        window_total += len(releases)
        cumulative_total += len(releases)
        print(f"  {date_from.date()} p{page}: +{len(releases)} rows ({cumulative_total} total)", flush=True)
        if len(releases) < 100:
            break
        page += 1
        time.sleep(REQUEST_DELAY)
    return window_total, cumulative_total


def main():
    sys.stdout.reconfigure(line_buffering=True)
    conn = get_db()
    total = 0
    current = datetime.now()

    print(f"Starting bulk load from {START_DATE.date()} to {current.date()}")

    while current > START_DATE:
        window_start = current - timedelta(days=WINDOW_DAYS)
        if window_start < START_DATE:
            window_start = START_DATE

        print(f"Window {window_start.date()} → {current.date()}", flush=True)
        window_count, total = fetch_and_insert_window(conn, window_start, current, total)

        if window_count == 0:
            print(f"  0 releases", flush=True)

        current = window_start
        time.sleep(REQUEST_DELAY)

    conn.close()
    print(f"\nDone. Total releases processed: {total}")


if __name__ == "__main__":
    main()
