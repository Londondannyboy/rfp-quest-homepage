"""
One-time historical bulk loader for UK government tenders.
Walks Contracts Finder OCDS API backwards in 7-day windows from today to 2024-01-01.
Upserts each release to Neon with rich schema (all release types: tender, award, planning, contract).
Resumable — skips existing ocids.

Usage:
    cd apps/agent
    uv run python src/bulk_load_tenders.py

Expected runtime: 30-90 minutes depending on volume.
Expected output: 10,000-50,000 releases loaded.
"""

import os
import sys
import time
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
REQUEST_DELAY = 1.0  # seconds between API requests to avoid rate limiting


def get_db():
    return psycopg2.connect(DATABASE_URL)


def fetch_window(date_from: datetime, date_to: datetime):
    """Fetch all releases in a date window, handling pagination."""
    releases = []
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
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", "10"))
                    print(f"  Rate limited, waiting {retry_after}s...")
                    time.sleep(retry_after)
                    continue
                data = resp.json()
                batch = data.get("releases", [])
                if not batch:
                    break
                releases.extend(batch)
                if len(batch) < 100:
                    break
                page += 1
                time.sleep(REQUEST_DELAY)
        except Exception as e:
            print(f"  Error fetching page {page}: {e}")
            break
    return releases


def get_stage(release):
    """Determine release stage from OCDS tags."""
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
    """Extract CPV codes from tender items classifications."""
    cpv_codes = []
    tender = release.get("tender", {})

    # From tender-level classification
    classification = tender.get("classification", {})
    if classification.get("scheme") == "CPV" and classification.get("id"):
        cpv_codes.append(classification["id"])

    # From items
    for item in tender.get("items", []):
        item_class = item.get("classification", {})
        if item_class.get("scheme") == "CPV" and item_class.get("id"):
            cpv_codes.append(item_class["id"])
        # Additional classifications
        for add_class in item.get("additionalClassifications", []):
            if add_class.get("scheme") == "CPV" and add_class.get("id"):
                cpv_codes.append(add_class["id"])

    return list(set(cpv_codes))


def extract_value(release):
    """Extract value_amount, value_min, value_max from the right OCDS location."""
    tender = release.get("tender", {})
    stage = get_stage(release)

    value_amount = None
    value_min = None
    value_max = None

    # Tender stage: value is in tender.value
    if stage in ("tender", "tenderCancellation", "planning"):
        value_obj = tender.get("value", {})
        value_amount = value_obj.get("amount")
        min_obj = tender.get("minValue", {})
        max_obj = tender.get("maxValue", {}) or value_obj
        value_min = min_obj.get("amount") if min_obj else None
        value_max = max_obj.get("amount") if max_obj else None

    # Award stage: value is in awards[0].value
    elif stage == "award":
        awards = release.get("awards", [])
        if awards:
            award_val = awards[0].get("value", {})
            value_amount = award_val.get("amount")

    # Contract stage: value is in contracts[0].value
    elif stage == "contract":
        contracts = release.get("contracts", [])
        if contracts:
            contract_val = contracts[0].get("value", {})
            value_amount = contract_val.get("amount")

    return value_amount, value_min, value_max


def extract_region(release):
    """Extract region from delivery addresses."""
    tender = release.get("tender", {})
    addresses = tender.get("deliveryAddresses", [])
    if addresses:
        return addresses[0].get("region")
    return None


def parse_release(release):
    """Parse an OCDS release into the rich tenders schema."""
    tender = release.get("tender", {})
    stage = get_stage(release)
    value_amount, value_min, value_max = extract_value(release)
    cpv_codes = extract_cpv_codes(release)

    # Determine status
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

    # Extract buyer
    buyer = release.get("buyer", {})
    buyer_name = buyer.get("name", "Unknown")
    buyer_id = buyer.get("id")

    # If no buyer at top level, check parties
    if buyer_name == "Unknown":
        for party in release.get("parties", []):
            if "buyer" in party.get("roles", []):
                buyer_name = party.get("name", "Unknown")
                buyer_id = party.get("id")
                break

    # Extract dates
    tender_period = tender.get("tenderPeriod", {})
    contract_period = tender.get("contractPeriod", {})

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
        "region": extract_region(release),
        "raw_ocds": json.dumps(release),
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
    conn.commit()


def main():
    # Flush print output immediately (for Railway/background processes)
    sys.stdout.reconfigure(line_buffering=True)

    conn = get_db()
    total = 0
    current = datetime.now()

    print(f"Starting bulk load from {START_DATE.date()} to {current.date()}")

    while current > START_DATE:
        window_start = current - timedelta(days=WINDOW_DAYS)
        if window_start < START_DATE:
            window_start = START_DATE

        print(f"Fetching {window_start.date()} → {current.date()}...", end=" ", flush=True)
        releases = fetch_window(window_start, current)

        if releases:
            parsed = [parse_release(r) for r in releases]
            for i in range(0, len(parsed), BATCH_SIZE):
                upsert_batch(conn, parsed[i:i + BATCH_SIZE])
            total += len(parsed)
            print(f"{len(releases)} releases ({total} total)")
        else:
            print("0 releases")

        current = window_start
        time.sleep(REQUEST_DELAY)

    conn.close()
    print(f"\nDone. Total releases processed: {total}")


if __name__ == "__main__":
    main()
