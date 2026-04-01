"""
One-time migration: copy 5,604 tenders from rfp.quest old DB
(square-waterfall-95675895, EU West 2) to rfp-quest-production
(calm-dust-71989092, US East 1).

Usage:
    cd apps/agent
    OLD_DATABASE_URL="postgresql://..." uv run python src/migrate_from_old_db.py

Requires both DATABASE_URL (new, in .env) and OLD_DATABASE_URL (old, passed as env var).
"""

import os
import json
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

NEW_DB_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

OLD_DB_URL = os.getenv("OLD_DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

BATCH_SIZE = 100

COLUMNS = [
    "ocid", "release_id", "title", "description", "status", "stage",
    "buyer_name", "buyer_id", "value_amount", "value_currency",
    "value_min", "value_max", "published_date", "tender_start_date",
    "tender_end_date", "contract_start_date", "contract_end_date",
    "cpv_codes", "sectors", "region", "delivery_locations",
    "raw_ocds", "source", "synced_at", "created_at", "updated_at",
    "slug", "main_category", "lead_category", "category_tags",
    "category_confidence", "categorized_at",
]


def main():
    if not OLD_DB_URL:
        print("ERROR: OLD_DATABASE_URL not set. Pass it as an environment variable:")
        print('  OLD_DATABASE_URL="postgresql://..." uv run python src/migrate_from_old_db.py')
        return

    if not NEW_DB_URL:
        print("ERROR: DATABASE_URL not set in .env")
        return

    old_conn = psycopg2.connect(OLD_DB_URL)
    new_conn = psycopg2.connect(NEW_DB_URL)

    old_cur = old_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    new_cur = new_conn.cursor()

    # Fetch all rows from old DB
    select_cols = ", ".join(COLUMNS)
    old_cur.execute(f"SELECT {select_cols} FROM tenders ORDER BY created_at")
    rows = old_cur.fetchall()
    print(f"Fetched {len(rows)} rows from old DB")

    # Build insert statement
    placeholders = ", ".join(["%s"] * len(COLUMNS))
    insert_sql = f"""
        INSERT INTO tenders ({select_cols})
        VALUES ({placeholders})
        ON CONFLICT (ocid) DO UPDATE SET
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
            sectors = EXCLUDED.sectors,
            region = EXCLUDED.region,
            delivery_locations = EXCLUDED.delivery_locations,
            raw_ocds = EXCLUDED.raw_ocds,
            source = EXCLUDED.source,
            synced_at = EXCLUDED.synced_at,
            updated_at = NOW(),
            slug = EXCLUDED.slug,
            main_category = EXCLUDED.main_category,
            lead_category = EXCLUDED.lead_category,
            category_tags = EXCLUDED.category_tags,
            category_confidence = EXCLUDED.category_confidence,
            categorized_at = EXCLUDED.categorized_at
    """

    inserted = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        for row in batch:
            # Convert jsonb fields to JSON strings for psycopg2
            values = []
            for col in COLUMNS:
                val = row[col]
                if col in ("cpv_codes", "sectors", "delivery_locations", "raw_ocds", "category_tags"):
                    values.append(json.dumps(val) if val is not None else None)
                else:
                    values.append(val)
            new_cur.execute(insert_sql, values)
        new_conn.commit()
        inserted += len(batch)
        print(f"  Migrated {inserted}/{len(rows)} rows")

    old_cur.close()
    old_conn.close()
    new_cur.close()
    new_conn.close()
    print(f"\nDone. {inserted} rows migrated to new DB.")


if __name__ == "__main__":
    main()
