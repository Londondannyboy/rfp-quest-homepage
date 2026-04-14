"""
Buyer intelligence aggregation — computes stats per canonical buyer
from award records. Writes to buyer_intelligence table.
Does NOT mutate the tenders table.

Usage:
    cd apps/agent
    uv run python src/enrich_buyer_intelligence.py
"""

import os
import sys
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)


def main():
    sys.stdout.reconfigure(line_buffering=True)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get all canonical buyers from buyer_lookup
    print("Fetching canonical buyers...", flush=True)
    cur.execute("SELECT DISTINCT canonical_name FROM buyer_lookup;")
    buyers = [row["canonical_name"] for row in cur.fetchall()]
    print(f"Found {len(buyers)} canonical buyers", flush=True)

    inserted = 0
    for i, buyer in enumerate(buyers):
        # Get all raw names for this canonical buyer
        cur.execute(
            "SELECT raw_name FROM buyer_lookup WHERE canonical_name = %s",
            (buyer,)
        )
        raw_names = [row["raw_name"] for row in cur.fetchall()]

        if not raw_names:
            continue

        # Use tuple for IN clause
        raw_tuple = tuple(raw_names)

        # Aggregate stats from tenders
        cur.execute("""
            SELECT
                COUNT(*) as total_contracts,
                COALESCE(SUM(value_amount), 0) as total_value,
                COALESCE(AVG(value_amount), 0) as avg_value,
                CASE WHEN COUNT(*) > 0
                    THEN COUNT(CASE WHEN awarded_to_sme = true THEN 1 END)::float / COUNT(*)
                    ELSE 0
                END as sme_rate
            FROM tenders
            WHERE buyer_name IN %s
        """, (raw_tuple,))
        stats = cur.fetchone()

        # Get top 5 suppliers (using group_name if available)
        cur.execute("""
            SELECT COALESCE(sl.group_name, t.winner) as supplier, COUNT(*) as c
            FROM tenders t
            LEFT JOIN supplier_lookup sl ON t.winner = sl.raw_name
            WHERE t.buyer_name IN %s
            AND t.winner IS NOT NULL AND t.winner != '' AND t.winner NOT LIKE '%%,%%'
            GROUP BY COALESCE(sl.group_name, t.winner)
            ORDER BY c DESC
            LIMIT 5
        """, (raw_tuple,))
        top_suppliers = [row["supplier"] for row in cur.fetchall()]

        # Detect framework usage
        cur.execute("""
            SELECT COUNT(*) as fw_count
            FROM tenders
            WHERE buyer_name IN %s
            AND (procedure_type IS NOT NULL OR notice_type = 'Pipeline')
        """, (raw_tuple,))
        fw = cur.fetchone()
        uses_frameworks = fw["fw_count"] > 0

        # Get parent org and primary sectors from buyer_lookup
        cur.execute(
            "SELECT parent_org FROM buyer_lookup WHERE canonical_name = %s LIMIT 1",
            (buyer,)
        )
        parent = cur.fetchone()
        primary_sectors = [parent["parent_org"]] if parent and parent["parent_org"] else []

        # Upsert to buyer_intelligence
        cur.execute("""
            INSERT INTO buyer_intelligence (
                canonical_buyer_name, total_contracts, total_value,
                avg_contract_value, sme_award_rate, top_suppliers,
                primary_sectors, uses_frameworks, last_computed
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (canonical_buyer_name) DO UPDATE SET
                total_contracts = EXCLUDED.total_contracts,
                total_value = EXCLUDED.total_value,
                avg_contract_value = EXCLUDED.avg_contract_value,
                sme_award_rate = EXCLUDED.sme_award_rate,
                top_suppliers = EXCLUDED.top_suppliers,
                primary_sectors = EXCLUDED.primary_sectors,
                uses_frameworks = EXCLUDED.uses_frameworks,
                last_computed = NOW()
        """, (
            buyer, stats["total_contracts"], stats["total_value"],
            stats["avg_value"], stats["sme_rate"], top_suppliers,
            primary_sectors, uses_frameworks
        ))
        inserted += 1

        if (i + 1) % 100 == 0:
            conn.commit()
            print(f"  Processed {i + 1}/{len(buyers)} buyers", flush=True)

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDone. {inserted} buyer intelligence records created.")


if __name__ == "__main__":
    main()
