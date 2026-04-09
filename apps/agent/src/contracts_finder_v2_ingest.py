"""
Contracts Finder REST v2 bulk ingestion.
Uses POST /api/rest/2/search_notices/json with adaptive date narrowing.
Coverage: 2000-01-01 to today (~25 years).

Usage:
    cd apps/agent
    uv run python src/contracts_finder_v2_ingest.py                        # From 2000-01-01
    uv run python src/contracts_finder_v2_ingest.py --from-date=2024-01-01 # From specific date
    uv run python src/contracts_finder_v2_ingest.py --days=30              # Last 30 days

API: POST https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json
No auth required. Returns up to 1000 per request with hitCount.
Adaptive date narrowing: 30d → 14d → 7d → 1d if hitCount > 1000.
"""

import os
import re
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

CF_API = "https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json"
REQUEST_DELAY = 0.5
DEFAULT_START = datetime(2000, 1, 1)


def sanitize_for_json(obj):
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


def strip_html(text: str | None) -> str | None:
    if not text:
        return None
    return re.sub(r"<[^>]+>", " ", text).strip()


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


def fetch_notices(date_from: datetime, date_to: datetime, size: int = 1000) -> tuple[list, int]:
    """Fetch notices for a date range. Returns (notices, hitCount)."""
    payload = {
        "searchCriteria": {
            "publishedFrom": date_from.strftime("%Y-%m-%d"),
            "publishedTo": date_to.strftime("%Y-%m-%d"),
        },
        "size": size,
    }
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                CF_API,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", "30"))
                print(f"  Rate limited, waiting {retry_after}s...", flush=True)
                time.sleep(retry_after)
                return fetch_notices(date_from, date_to, size)
            if resp.status_code != 200:
                print(f"  API error {resp.status_code}: {resp.text[:200]}", flush=True)
                return [], 0
            data = resp.json()
            notices = data.get("noticeList", [])
            hit_count = data.get("hitCount", 0)
            return notices, hit_count
    except Exception as e:
        print(f"  Fetch error: {e}", flush=True)
        return [], 0


def parse_notice(notice: dict) -> dict:
    """Parse a REST v2 notice into the tenders schema."""
    item = notice.get("item", {})

    # CPV codes — single string or comma-separated
    cpv_raw = item.get("cpvCodes") or ""
    cpv_codes = [c.strip() for c in cpv_raw.split(",") if c.strip()] if cpv_raw else []
    # Also check cpvCodesExtended
    cpv_ext = item.get("cpvCodesExtended") or ""
    if cpv_ext:
        cpv_codes.extend([c.strip() for c in cpv_ext.split(",") if c.strip()])
        cpv_codes = list(set(cpv_codes))

    # Determine stage/status from noticeType
    notice_type = item.get("noticeType") or ""
    if notice_type == "ContractAward":
        stage = "award"
        status = "Awarded"
    elif notice_type == "ContractNotice":
        stage = "tender"
        status = "Open"
    elif notice_type == "Contract":
        stage = "contract"
        status = "Contract"
    else:
        stage = notice_type.lower() if notice_type else "unknown"
        status = item.get("noticeStatus") or "Unknown"

    # Value — use awardedValue if > 0, otherwise valueHigh
    awarded_value = item.get("awardedValue")
    value_low = item.get("valueLow")
    value_high = item.get("valueHigh")
    value_amount = None
    if awarded_value and awarded_value > 0:
        value_amount = awarded_value
    elif value_high and value_high > 0:
        value_amount = value_high

    return {
        "ocid": item.get("id", ""),
        "release_id": item.get("noticeIdentifier"),
        "parent_id": item.get("parentId"),
        "title": item.get("title") or "Untitled",
        "description": strip_html(item.get("description")),
        "status": status,
        "stage": stage,
        "buyer_name": item.get("organisationName") or "Unknown",
        "buyer_id": None,
        "value_amount": value_amount,
        "value_currency": "GBP",
        "value_min": value_low if value_low and value_low > 0 else None,
        "value_max": value_high if value_high and value_high > 0 else None,
        "published_date": item.get("publishedDate") or None,
        "tender_start_date": None,
        "tender_end_date": item.get("deadlineDate") or None,
        "contract_start_date": item.get("start") or item.get("awardedDate") or None,
        "contract_end_date": item.get("end") or None,
        "cpv_codes": json.dumps(cpv_codes),
        "region": (item.get("region") or "")[:255] or None,
        "raw_ocds": safe_json_dumps(item),
        "source": "contracts-finder-v2",
        "notice_type": notice_type,
        "procedure_type": item.get("procedureType"),
        "winner": item.get("awardedSupplier"),
        "is_sme_suitable": bool(item.get("isSuitableForSme")),
        "is_vcse_suitable": bool(item.get("isSuitableForVco")),
        "awarded_to_sme": bool(item.get("awardedToSme")),
        "awarded_to_vcse": bool(item.get("awardedToVcse")),
    }


INSERT_SQL = """
    INSERT INTO tenders (
        ocid, release_id, parent_id, title, description, status, stage,
        buyer_name, buyer_id, value_amount, value_currency,
        value_min, value_max, published_date, tender_start_date,
        tender_end_date, contract_start_date, contract_end_date,
        cpv_codes, region, raw_ocds, source, notice_type,
        procedure_type, winner, is_sme_suitable, is_vcse_suitable,
        awarded_to_sme, awarded_to_vcse, synced_at, fetched_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s,
        %s::jsonb, %s, %s::jsonb, %s, %s,
        %s, %s, %s, %s,
        %s, %s, NOW(), NOW()
    )
    ON CONFLICT (ocid) DO UPDATE SET
        release_id = EXCLUDED.release_id,
        parent_id = EXCLUDED.parent_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        stage = EXCLUDED.stage,
        buyer_name = EXCLUDED.buyer_name,
        value_amount = EXCLUDED.value_amount,
        value_min = EXCLUDED.value_min,
        value_max = EXCLUDED.value_max,
        published_date = EXCLUDED.published_date,
        tender_end_date = EXCLUDED.tender_end_date,
        contract_start_date = EXCLUDED.contract_start_date,
        contract_end_date = EXCLUDED.contract_end_date,
        cpv_codes = EXCLUDED.cpv_codes,
        region = EXCLUDED.region,
        raw_ocds = EXCLUDED.raw_ocds,
        notice_type = EXCLUDED.notice_type,
        procedure_type = EXCLUDED.procedure_type,
        winner = EXCLUDED.winner,
        is_sme_suitable = EXCLUDED.is_sme_suitable,
        is_vcse_suitable = EXCLUDED.is_vcse_suitable,
        awarded_to_sme = EXCLUDED.awarded_to_sme,
        awarded_to_vcse = EXCLUDED.awarded_to_vcse,
        synced_at = NOW(),
        updated_at = NOW()
"""


def upsert_batch(conn, parsed_notices):
    inserted = 0
    with conn.cursor() as cur:
        for t in parsed_notices:
            if not t["ocid"]:
                continue
            try:
                cur.execute("SAVEPOINT insert_row")
                cur.execute(INSERT_SQL, (
                    t["ocid"], t["release_id"], t["parent_id"],
                    t["title"], t["description"],
                    t["status"], t["stage"],
                    t["buyer_name"], t["buyer_id"],
                    t["value_amount"], t["value_currency"],
                    t["value_min"], t["value_max"],
                    t["published_date"], t["tender_start_date"],
                    t["tender_end_date"], t["contract_start_date"],
                    t["contract_end_date"],
                    t["cpv_codes"], t["region"],
                    t["raw_ocds"], t["source"], t["notice_type"],
                    t["procedure_type"], t["winner"],
                    t["is_sme_suitable"], t["is_vcse_suitable"],
                    t["awarded_to_sme"], t["awarded_to_vcse"],
                ))
                cur.execute("RELEASE SAVEPOINT insert_row")
                if cur.rowcount:
                    inserted += 1
            except Exception as e:
                try:
                    cur.execute("ROLLBACK TO SAVEPOINT insert_row")
                except Exception:
                    raise  # connection dead — let outer retry handle it
                print(f"  Skipped {t['ocid']}: {str(e)[:100]}", flush=True)
    conn.commit()
    return inserted


def fetch_and_insert_window(conn_unused, date_from, date_to, cumulative):
    """Fetch notices for a window with adaptive narrowing. Fresh DB per insert."""
    notices, hit_count = fetch_notices(date_from, date_to)

    if hit_count > 1000:
        # Narrow the window
        days = (date_to - date_from).days
        if days > 14:
            narrow = 14
        elif days > 7:
            narrow = 7
        elif days > 1:
            narrow = 1
        else:
            # Can't narrow further — process what we have
            print(f"  WARNING: {hit_count} hits in 1 day ({date_from.date()}), processing first 1000", flush=True)
            parsed = [parse_notice(n) for n in notices]
            conn = get_db()
            inserted = upsert_batch(conn, parsed)
            conn.close()
            cumulative += inserted
            print(f"  {date_from.date()} → {date_to.date()}: {hit_count} hits, +{inserted} new ({cumulative} total)", flush=True)
            return cumulative

        # Recurse with narrower windows
        chunk_start = date_from
        while chunk_start < date_to:
            chunk_end = min(chunk_start + timedelta(days=narrow), date_to)
            cumulative = fetch_and_insert_window(None, chunk_start, chunk_end, cumulative)
            chunk_start = chunk_end
            time.sleep(REQUEST_DELAY)
        return cumulative

    if not notices:
        print(f"  {date_from.date()} → {date_to.date()}: 0 hits", flush=True)
        return cumulative

    parsed = [parse_notice(n) for n in notices]
    conn = get_db()
    inserted = upsert_batch(conn, parsed)
    conn.close()
    cumulative += inserted
    print(f"  {date_from.date()} → {date_to.date()}: {hit_count} hits, +{inserted} new ({cumulative} total)", flush=True)
    return cumulative


def main():
    sys.stdout.reconfigure(line_buffering=True)

    parser = argparse.ArgumentParser(description="Contracts Finder v2 ingestion")
    parser.add_argument("--from-date", type=str, help="Start date YYYY-MM-DD (default 2000-01-01)")
    parser.add_argument("--days", type=int, help="Days to look back")
    args = parser.parse_args()

    if args.from_date:
        start_date = datetime.strptime(args.from_date, "%Y-%m-%d")
    elif args.days:
        start_date = datetime.now() - timedelta(days=args.days)
    else:
        start_date = DEFAULT_START

    print(f"Contracts Finder v2: {start_date.date()} → {datetime.now().date()}")

    # Sync log
    conn = get_db()
    log_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO tender_sync_log (id, params) VALUES (%s, %s::jsonb)",
            (log_id, json.dumps({"from_date": start_date.isoformat(), "source": "contracts-finder-v2"}))
        )
    conn.commit()
    conn.close()

    cumulative = 0
    today = datetime.now()
    window_days = 7

    try:
        chunk_start = start_date
        while chunk_start < today:
            chunk_end = min(chunk_start + timedelta(days=window_days), today)

            # Retry entire window on any DB error (D39)
            for chunk_attempt in range(3):
                try:
                    conn = get_db()
                    cumulative = fetch_and_insert_window(conn, chunk_start, chunk_end, cumulative)
                    conn.close()
                    break
                except (psycopg2.OperationalError, psycopg2.InterfaceError,
                        psycopg2.errors.InFailedSqlTransaction) as e:
                    print(f"  Window failed attempt {chunk_attempt+1}: {e}", flush=True)
                    try:
                        conn.close()
                    except Exception:
                        pass
                    if chunk_attempt < 2:
                        time.sleep(30)
                    else:
                        raise

            chunk_start = chunk_end
            time.sleep(REQUEST_DELAY)

        conn = get_db()
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE tender_sync_log
                SET completed_at = NOW(), status = 'completed',
                    records_fetched = %s, records_inserted = %s
                WHERE id = %s
            """, (cumulative, cumulative, log_id))
        conn.commit()
        conn.close()

    except Exception as e:
        try:
            conn = get_db()
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE tender_sync_log
                    SET completed_at = NOW(), status = 'error',
                        records_fetched = %s, records_inserted = %s,
                        error_message = %s
                    WHERE id = %s
                """, (cumulative, cumulative, str(e), log_id))
            conn.commit()
            conn.close()
        except Exception:
            pass
        raise

    print(f"\nDone. Total inserted: {cumulative}")


if __name__ == "__main__":
    main()
