"""
Find a Tender API ingestion script.
Fetches OCDS releases from find-tender.service.gov.uk and upserts to Neon.
Can run as one-time bulk load or daily cron (via Railway).

Usage:
    cd apps/agent
    uv run python src/find_a_tender_ingest.py                          # Last 7 days
    uv run python src/find_a_tender_ingest.py --full                   # From 2021-01-01
    uv run python src/find_a_tender_ingest.py --from-date=2023-06-01   # From specific date
    uv run python src/find_a_tender_ingest.py --days=30                # Last 30 days
    uv run python src/find_a_tender_ingest.py --limit=1000             # Max records

API: https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages
No auth required. Public API. Cursor-based pagination via links.next.
"""

import os
import sys
import time
import json
import math
import argparse
import uuid
import httpx
import psycopg2
import psycopg2.extras
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

FAT_API = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages"
REQUEST_DELAY = 0.5  # 500ms between requests, matching old TS implementation


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
    """JSON serialize with Infinity/NaN sanitization."""
    return json.dumps(sanitize_for_json(obj))


def get_db(retries=3, delay=5):
    for attempt in range(retries):
        try:
            conn = psycopg2.connect(DATABASE_URL)
            conn.autocommit = False
            return conn
        except Exception as e:
            if attempt < retries - 1:
                print(f"DB connect failed, retry {attempt+1}: {e}", flush=True)
                time.sleep(delay)
            else:
                raise


def fetch_page(url: str) -> tuple[list, str | None]:
    """Fetch a page of releases, return (releases, next_url)."""
    with httpx.Client(timeout=60) as client:
        resp = client.get(url, headers={"Accept": "application/json"})

        if resp.status_code in (429, 503):
            retry_after = int(resp.headers.get("Retry-After", "60"))
            print(f"  Rate limited. Waiting {retry_after}s...")
            time.sleep(retry_after)
            return fetch_page(url)  # Retry

        if resp.status_code != 200:
            print(f"  API error: {resp.status_code} {resp.text[:200]}")
            return [], None

        data = resp.json()
        releases = data.get("releases", [])
        next_url = data.get("links", {}).get("next")
        return releases, next_url


def get_stage(tags: list[str]) -> str:
    """Determine release stage from OCDS tags."""
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


def extract_cpv_codes(release: dict) -> list[str]:
    """Extract CPV codes from tender items classifications."""
    cpv_codes = []
    tender = release.get("tender", {})

    # Top-level classification
    classification = tender.get("classification", {})
    if classification.get("scheme") == "CPV" and classification.get("id"):
        cpv_codes.append(classification["id"])

    # Items
    for item in tender.get("items", []):
        item_class = item.get("classification", {})
        if item_class.get("scheme") == "CPV" and item_class.get("id"):
            cpv_codes.append(item_class["id"])
        for add_class in item.get("additionalClassifications", []):
            if add_class.get("scheme") == "CPV" and add_class.get("id"):
                cpv_codes.append(add_class["id"])

    return list(set(cpv_codes))


def extract_region(release: dict) -> str | None:
    """Extract region from delivery addresses."""
    tender = release.get("tender", {})
    addresses = tender.get("deliveryAddresses", [])
    if addresses:
        return addresses[0].get("region")
    return None


def parse_release(release: dict) -> dict:
    """Parse an OCDS release into the tenders schema."""
    tender = release.get("tender", {})
    tags = release.get("tag", [])
    stage = get_stage(tags)

    # Extract buyer — top level or from parties
    buyer = release.get("buyer", {})
    buyer_name = buyer.get("name")
    buyer_id = buyer.get("id")
    if not buyer_name:
        for party in release.get("parties", []):
            if "buyer" in party.get("roles", []):
                buyer_name = party.get("name")
                buyer_id = party.get("id")
                break

    # Determine status
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
        status = tender.get("status") or "Unknown"

    tender_period = tender.get("tenderPeriod", {})
    contract_period = tender.get("contractPeriod", {})

    return {
        "ocid": release.get("ocid", ""),
        "release_id": release.get("id"),
        "title": tender.get("title") or "Untitled",
        "description": tender.get("description"),
        "status": status,
        "stage": stage,
        "buyer_name": buyer_name or "Unknown",
        "buyer_id": buyer_id,
        "value_amount": tender.get("value", {}).get("amount"),
        "value_currency": tender.get("value", {}).get("currency", "GBP"),
        "value_min": tender.get("minValue", {}).get("amount"),
        "value_max": (tender.get("maxValue") or tender.get("value", {})).get("amount"),
        "published_date": release.get("date"),
        "tender_start_date": tender_period.get("startDate"),
        "tender_end_date": tender_period.get("endDate"),
        "contract_start_date": contract_period.get("startDate"),
        "contract_end_date": contract_period.get("endDate"),
        "cpv_codes": json.dumps(extract_cpv_codes(release)),
        "region": extract_region(release),
        "raw_ocds": safe_json_dumps(release),
        "source": "find-a-tender",
    }


INSERT_SQL = """
    INSERT INTO tenders (
        ocid, release_id, title, description, status, stage,
        buyer_name, buyer_id, value_amount, value_currency,
        value_min, value_max, published_date, tender_start_date,
        tender_end_date, contract_start_date, contract_end_date,
        cpv_codes, region, raw_ocds, source, synced_at, fetched_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s,
        %s::jsonb, %s, %s::jsonb, %s, NOW(), NOW()
    )
    ON CONFLICT (ocid) DO UPDATE SET
        release_id = EXCLUDED.release_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        stage = EXCLUDED.stage,
        buyer_name = EXCLUDED.buyer_name,
        buyer_id = EXCLUDED.buyer_id,
        value_amount = EXCLUDED.value_amount,
        value_currency = EXCLUDED.value_currency,
        value_min = EXCLUDED.value_min,
        value_max = EXCLUDED.value_max,
        published_date = EXCLUDED.published_date,
        tender_start_date = EXCLUDED.tender_start_date,
        tender_end_date = EXCLUDED.tender_end_date,
        contract_start_date = EXCLUDED.contract_start_date,
        contract_end_date = EXCLUDED.contract_end_date,
        cpv_codes = EXCLUDED.cpv_codes,
        region = EXCLUDED.region,
        raw_ocds = EXCLUDED.raw_ocds,
        synced_at = NOW(),
        updated_at = NOW()
"""


CHUNK_DAYS = 30


def fetch_and_insert_chunk(conn, chunk_start, chunk_end, total_fetched, total_inserted):
    """Fetch and insert all pages for one date chunk. Returns (fetched, inserted)."""
    url = (
        f"{FAT_API}?limit=100"
        f"&updatedFrom={chunk_start.strftime('%Y-%m-%dT00:00:00Z')}"
        f"&updatedTo={chunk_end.strftime('%Y-%m-%dT23:59:59Z')}"
    )
    page_num = 0
    chunk_inserted = 0

    while url:
        page_num += 1
        releases, next_url = fetch_page(url)

        if not releases:
            break

        batch_inserted = 0
        with conn.cursor() as cur:
            for release in releases:
                parsed = parse_release(release)
                if not parsed["ocid"]:
                    continue

                try:
                    cur.execute("SAVEPOINT insert_row")
                    cur.execute(INSERT_SQL, (
                        parsed["ocid"], parsed["release_id"], parsed["title"],
                        parsed["description"], parsed["status"], parsed["stage"],
                        parsed["buyer_name"], parsed["buyer_id"],
                        parsed["value_amount"], parsed["value_currency"],
                        parsed["value_min"], parsed["value_max"],
                        parsed["published_date"], parsed["tender_start_date"],
                        parsed["tender_end_date"], parsed["contract_start_date"],
                        parsed["contract_end_date"],
                        parsed["cpv_codes"], parsed["region"],
                        parsed["raw_ocds"], parsed["source"],
                    ))
                    cur.execute("RELEASE SAVEPOINT insert_row")
                    if cur.rowcount:
                        total_inserted += 1
                        batch_inserted += 1
                        chunk_inserted += 1
                except Exception as e:
                    cur.execute("ROLLBACK TO SAVEPOINT insert_row")
                    print(f"  Skipped {parsed['ocid']}: {str(e)[:100]}", flush=True)
                total_fetched += 1

        conn.commit()
        print(f"  {chunk_start.date()} p{page_num}: +{batch_inserted} new ({total_fetched} fetched, {total_inserted} inserted)", flush=True)

        if len(releases) < 100:
            break

        url = next_url
        if url:
            time.sleep(REQUEST_DELAY)

    return total_fetched, total_inserted, chunk_inserted


def main():
    sys.stdout.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser(description="Find a Tender ingestion")
    parser.add_argument("--full", action="store_true", help="From 2021-01-01")
    parser.add_argument("--from-date", type=str, help="Start date YYYY-MM-DD")
    parser.add_argument("--days", type=int, default=7, help="Days to look back (default 7)")
    args = parser.parse_args()

    # Determine start date
    if args.from_date:
        start_date = datetime.strptime(args.from_date, "%Y-%m-%d")
        print(f"Fetching Find a Tender releases from {args.from_date}")
    elif args.full:
        start_date = datetime(2021, 1, 1)
        print("Fetching ALL Find a Tender releases from 2021-01-01")
    else:
        start_date = datetime.now() - timedelta(days=args.days)
        print(f"Fetching Find a Tender releases from last {args.days} days")

    # Create sync log entry
    conn = get_db()
    log_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO tender_sync_log (id, params) VALUES (%s, %s::jsonb)",
            (log_id, json.dumps({"from_date": start_date.isoformat(), "full": args.full, "source": "find-a-tender"}))
        )
    conn.commit()
    conn.close()

    total_fetched = 0
    total_inserted = 0
    today = datetime.now()

    try:
        chunk_start = start_date
        while chunk_start < today:
            chunk_end = min(chunk_start + timedelta(days=CHUNK_DAYS), today)
            print(f"Chunk {chunk_start.date()} → {chunk_end.date()}", flush=True)

            # Fresh connection per chunk — retry on Neon suspension (D38)
            try:
                conn = get_db()
                total_fetched, total_inserted, chunk_inserted = fetch_and_insert_chunk(
                    conn, chunk_start, chunk_end, total_fetched, total_inserted
                )
                conn.close()
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
                print(f"  Connection lost, retrying chunk: {e}", flush=True)
                time.sleep(10)
                conn = get_db()
                total_fetched, total_inserted, chunk_inserted = fetch_and_insert_chunk(
                    conn, chunk_start, chunk_end, total_fetched, total_inserted
                )
                conn.close()

            if chunk_inserted == 0:
                print(f"  0 releases", flush=True)

            chunk_start = chunk_end
            time.sleep(REQUEST_DELAY)

        # Update sync log — success
        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE tender_sync_log
                SET completed_at = NOW(), status = 'completed',
                    records_fetched = %s, records_inserted = %s
                WHERE id = %s
            """, (total_fetched, total_inserted, log_id))
        conn.commit()
        conn.close()

    except Exception as e:
        # Update sync log — error
        try:
            conn = get_db()
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE tender_sync_log
                    SET completed_at = NOW(), status = 'error',
                        records_fetched = %s, records_inserted = %s,
                        error_message = %s
                    WHERE id = %s
                """, (total_fetched, total_inserted, str(e), log_id))
            conn.commit()
            conn.close()
        except Exception:
            pass
        raise

    print(f"\nDone. Fetched: {total_fetched}, Inserted: {total_inserted}")


if __name__ == "__main__":
    main()
