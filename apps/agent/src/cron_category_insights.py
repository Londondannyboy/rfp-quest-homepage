"""
Nightly cron: pre-compute Tako charts for 9 tender categories.
Queries Neon for each category, sends CSV to Tako Visualize API,
stores embed_url in category_insights table.

Run as Railway cron: 0 5 * * * (5am UTC daily, before main cron at 6am)

Usage:
    cd apps/agent
    uv run python src/cron_category_insights.py
"""

import os
import io
import csv
import json
import logging
from datetime import datetime

import httpx
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "").replace(
    "channel_binding=require&", ""
).replace("&channel_binding=require", "").replace(
    "channel_binding=require", ""
)

TAKO_VISUALIZE_URL = "https://tako.com/api/v1/beta/visualize"

# Each category: name, SQL WHERE clause for matching tenders, Tako question
CATEGORIES = [
    {
        "name": "NHS",
        "where": "title ILIKE '%nhs%' OR buyer_name ILIKE '%nhs%' OR buyer_name ILIKE '%health%'",
        "question": "Bar chart of NHS procurement spend in millions GBP by year",
    },
    {
        "name": "Construction",
        "where": "title ILIKE '%construction%' OR title ILIKE '%building%' OR title ILIKE '%demolition%'",
        "question": "Bar chart of construction contract spend in millions GBP by year",
    },
    {
        "name": "IT",
        "where": "title ILIKE '%digital%' OR title ILIKE '%software%' OR title ILIKE '%IT %' OR title ILIKE '%technology%'",
        "question": "Bar chart of IT and digital contract spend in millions GBP by year",
    },
    {
        "name": "Education",
        "where": "title ILIKE '%school%' OR title ILIKE '%university%' OR title ILIKE '%education%' OR buyer_name ILIKE '%university%'",
        "question": "Bar chart of education sector contract spend in millions GBP by year",
    },
    {
        "name": "Defence",
        "where": "title ILIKE '%defence%' OR title ILIKE '%military%' OR buyer_name ILIKE '%ministry of defence%'",
        "question": "Bar chart of defence contract spend in millions GBP by year",
    },
    {
        "name": "Facilities",
        "where": "title ILIKE '%facilities%' OR title ILIKE '%cleaning%' OR title ILIKE '%maintenance%' OR title ILIKE '%catering%'",
        "question": "Bar chart of facilities management contract spend in millions GBP by year",
    },
    {
        "name": "Transport",
        "where": "title ILIKE '%transport%' OR title ILIKE '%highway%' OR title ILIKE '%road%' OR title ILIKE '%rail%'",
        "question": "Bar chart of transport contract spend in millions GBP by year",
    },
    {
        "name": "Social Care",
        "where": "title ILIKE '%social care%' OR title ILIKE '%care home%' OR title ILIKE '%domiciliary%' OR buyer_name ILIKE '%social care%'",
        "question": "Bar chart of social care contract spend in millions GBP by year",
    },
    {
        "name": "Police",
        "where": "title ILIKE '%police%' OR buyer_name ILIKE '%police%' OR title ILIKE '%policing%'",
        "question": "Bar chart of police and policing contract spend in millions GBP by year",
    },
]


def get_db():
    return psycopg2.connect(DATABASE_URL)


def query_category_csv(conn, category):
    """Query Neon for a category's spend by year, return CSV string."""
    sql = f"""
        SELECT EXTRACT(YEAR FROM COALESCE(published_date, fetched_at))::int AS year,
               COUNT(*) AS tender_count,
               ROUND(COALESCE(SUM(value_amount), 0) / 1000000, 1) AS "spend_millions_GBP"
        FROM tenders
        WHERE {category['where']}
        GROUP BY year
        ORDER BY year
    """
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute(sql)
    rows = cur.fetchall()
    cur.close()

    if not rows:
        return None, 0

    total_count = sum(r["tender_count"] for r in rows)

    # Send only year and spend to Tako — forces it to chart spend
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["year", "spend_millions_GBP"])
    writer.writeheader()
    for r in rows:
        writer.writerow({"year": r["year"], "spend_millions_GBP": r["spend_millions_GBP"]})
    return buf.getvalue(), total_count


def call_tako(csv_string, question):
    """POST inline CSV to Tako Visualize API, return embed_url."""
    api_key = os.getenv("TAKO_API_KEY")
    if not api_key:
        raise RuntimeError("TAKO_API_KEY not set")

    with httpx.Client(timeout=30) as client:
        resp = client.post(
            TAKO_VISUALIZE_URL,
            headers={
                "X-API-Key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "csv": [csv_string],
                "query": question,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    if "error" in data:
        raise ValueError(f"Tako API error: {data['error']}")

    outputs = data.get("outputs", data)
    cards = outputs.get("knowledge_cards", [])
    if not cards:
        raise ValueError("Tako returned no knowledge cards")

    embed_url = cards[0].get("embed_url")
    if not embed_url:
        raise ValueError("Tako knowledge card missing embed_url")

    return embed_url


def upsert_insight(conn, category_name, embed_url, question, row_count):
    """Upsert a category insight row."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO category_insights (category, embed_url, query_used, row_count, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (category) DO UPDATE SET
                embed_url = EXCLUDED.embed_url,
                query_used = EXCLUDED.query_used,
                row_count = EXCLUDED.row_count,
                created_at = NOW()
            """,
            (category_name, embed_url, question, row_count),
        )
    conn.commit()


def main():
    print(f"Category insights cron started at {datetime.now().isoformat()}")

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set")
        return

    if not os.getenv("TAKO_API_KEY"):
        print("ERROR: TAKO_API_KEY not set")
        return

    conn = get_db()
    success = 0
    failed = 0

    for cat in CATEGORIES:
        try:
            logger.info(f"Processing category: {cat['name']}")
            csv_string, row_count = query_category_csv(conn, cat)

            if not csv_string:
                logger.warning(f"No data for category: {cat['name']}")
                continue

            embed_url = call_tako(csv_string, cat["question"])
            upsert_insight(conn, cat["name"], embed_url, cat["question"], row_count)
            logger.info(f"  {cat['name']}: embed_url={embed_url}, rows={row_count}")
            success += 1

        except Exception as e:
            logger.error(f"  {cat['name']} FAILED: {e}")
            failed += 1

    conn.close()
    print(f"Done. {success} categories updated, {failed} failed.")


if __name__ == "__main__":
    main()
