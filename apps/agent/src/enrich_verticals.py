"""
Populate vertical and niche columns in tender_categories from CPV codes.
Uses the cpv_taxonomy lookup — no API calls, no LLM, pure mapping.
Does NOT mutate the tenders table.

Usage:
    cd apps/agent
    uv run python src/enrich_verticals.py
"""

import os
import sys
import time
import json
import psycopg2
import psycopg2.extras
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from cpv_taxonomy import cpv_to_vertical, cpv_to_niche

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

BATCH_SIZE = 10000
SLEEP = 1


def main():
    sys.stdout.reconfigure(line_buffering=True)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Count tenders with CPV codes
    cur.execute("""
        SELECT COUNT(*) as c FROM tenders
        WHERE cpv_codes IS NOT NULL AND cpv_codes != '[]'::jsonb
    """)
    total = cur.fetchone()["c"]
    print(f"Tenders with CPV codes: {total}", flush=True)

    offset = 0
    updated = 0
    batch_num = 0

    while offset < total:
        batch_num += 1
        cur.execute("""
            SELECT t.ocid, t.cpv_codes
            FROM tenders t
            WHERE t.cpv_codes IS NOT NULL AND t.cpv_codes != '[]'::jsonb
            ORDER BY t.ocid
            LIMIT %s OFFSET %s
        """, (BATCH_SIZE, offset))
        rows = cur.fetchall()

        if not rows:
            break

        values = []
        for row in rows:
            cpv_list = row["cpv_codes"]
            if isinstance(cpv_list, str):
                cpv_list = json.loads(cpv_list)

            # Use first CPV code for vertical/niche
            first_cpv = cpv_list[0] if cpv_list else None
            vertical = cpv_to_vertical(first_cpv) if first_cpv else None
            niche = cpv_to_niche(first_cpv) if first_cpv else None

            if vertical or niche:
                values.append((row["ocid"], vertical, niche))

        if values:
            execute_values(
                cur,
                """INSERT INTO tender_categories (tender_ocid, vertical, niche)
                   VALUES %s
                   ON CONFLICT (tender_ocid) DO UPDATE SET
                       vertical = EXCLUDED.vertical,
                       niche = EXCLUDED.niche""",
                values,
                page_size=1000,
            )
            updated += len(values)

        conn.commit()
        offset += BATCH_SIZE
        print(f"  Batch {batch_num}: {updated} updated ({offset*100//total}%)", flush=True)
        time.sleep(SLEEP)

    # Report distribution
    cur.execute("""
        SELECT vertical, COUNT(*) as c
        FROM tender_categories
        WHERE vertical IS NOT NULL
        GROUP BY vertical
        ORDER BY c DESC
    """)
    print(f"\nVertical distribution:", flush=True)
    for row in cur.fetchall():
        print(f"  {row['vertical']:45} {row['c']:>8}", flush=True)

    cur.execute("SELECT COUNT(*) as c FROM tender_categories WHERE vertical IS NOT NULL;")
    with_vertical = cur.fetchone()["c"]
    cur.execute("SELECT COUNT(*) as c FROM tender_categories WHERE niche IS NOT NULL;")
    with_niche = cur.fetchone()["c"]

    cur.close()
    conn.close()

    print(f"\nDone. Vertical: {with_vertical}, Niche: {with_niche}, Total updated: {updated}")


if __name__ == "__main__":
    main()
