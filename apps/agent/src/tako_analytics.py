"""
Tako analytics tool — queries Neon tenders, converts to CSV,
calls Tako Visualize API, returns embed_url for chart rendering.

Checks category_insights table for pre-computed charts first.
If a fresh chart exists (< 24h old), returns it immediately.
Otherwise falls through to live Tako API call.
"""

import os
import io
import csv
import logging
from datetime import datetime, timedelta, timezone

import httpx
import psycopg2
import psycopg2.extras
from langchain.tools import tool
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


TAKO_VISUALIZE_URL = "https://tako.com/api/v1/beta/visualize"

# Category keywords for matching user questions to pre-computed insights
CATEGORY_KEYWORDS = {
    "NHS": ["nhs", "health", "hospital", "clinical"],
    "Construction": ["construction", "building", "demolition"],
    "IT": ["it ", "digital", "software", "technology", "cyber"],
    "Education": ["education", "school", "university", "college"],
    "Defence": ["defence", "defense", "military", "mod "],
    "Facilities": ["facilities", "cleaning", "maintenance", "catering"],
    "Transport": ["transport", "highway", "road", "rail"],
    "Social Care": ["social care", "care home", "domiciliary"],
    "Police": ["police", "policing"],
}


def _get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    return psycopg2.connect(database_url)


def _match_category(question: str) -> Optional[str]:
    """Match a user question to a pre-computed category, or None.
    Only matches for 'by year' queries — other breakdowns (by month,
    by buyer, etc.) skip the cache and go live."""
    q = question.lower()
    # Only use cache for "by year" type queries
    if not any(w in q for w in ["by year", "per year", "annual", "yearly"]):
        return None
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            return category
    return None


def _check_cached_insight(category: str) -> Optional[str]:
    """Check category_insights for a fresh (< 24h) cached embed_url."""
    conn = _get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT embed_url, created_at FROM category_insights
            WHERE category = %s AND created_at > NOW() - INTERVAL '24 hours'
            """,
            (category,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return row["embed_url"]
        return None
    except Exception:
        if conn:
            conn.close()
        return None


def _query_to_csv(query: str, params: tuple = ()) -> str:
    """Run a SQL query against Neon and return results as CSV string."""
    conn = _get_db_connection()
    if not conn:
        raise RuntimeError("DATABASE_URL not set")

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            raise ValueError("Query returned no results")

        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        return buf.getvalue()
    except Exception:
        if conn:
            conn.close()
        raise


def _call_tako(csv_string: str, question: str) -> str:
    """POST inline CSV to Tako Visualize API, return embed_url."""
    logger.info(f"Tako CSV preview:\n{csv_string[:500]}")
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

        try:
            data = resp.json()
        except Exception:
            raise ValueError(f"Tako returned non-JSON response: {resp.text[:200]}")

    if "error" in data:
        raise ValueError(f"Tako API error: {data['error']}")

    # Tako nests cards under outputs.knowledge_cards
    outputs = data.get("outputs", data)
    cards = outputs.get("knowledge_cards", [])
    if not cards:
        raise ValueError("Tako returned no knowledge cards")

    embed_url = cards[0].get("embed_url")
    if not embed_url:
        raise ValueError("Tako knowledge card missing embed_url")

    return embed_url


# Map common analytical questions to targeted SQL queries
SQL_TEMPLATES = {
    "spend_by_buyer": """
        SELECT buyer_name as buyer, COUNT(*) as tender_count,
               COALESCE(SUM(value_amount), 0) as total_value
        FROM tenders
        WHERE value_amount > 0
        GROUP BY buyer_name
        ORDER BY total_value DESC
        LIMIT 20
    """,
    "spend_by_year": """
        SELECT EXTRACT(YEAR FROM fetched_at)::int as year,
               COUNT(*) as tender_count,
               COALESCE(SUM(value_amount), 0) as total_value
        FROM tenders
        WHERE value_amount > 0
        GROUP BY year
        ORDER BY year
    """,
    "status_breakdown": """
        SELECT status, COUNT(*) as count,
               COALESCE(SUM(value_amount), 0) as total_value
        FROM tenders
        GROUP BY status
    """,
    "top_value": """
        SELECT title, buyer_name as buyer, value_amount as value, status
        FROM tenders
        WHERE value_amount > 0
        ORDER BY value_amount DESC
        LIMIT 20
    """,
    "spend_by_month": """
        SELECT TO_CHAR(COALESCE(published_date, fetched_at), 'YYYY-MM') as month,
               COUNT(*) as tender_count
        FROM tenders
        WHERE value_amount > 0
        GROUP BY month
        ORDER BY month
    """,
    "general": """
        SELECT buyer_name as buyer, title, value_amount as value, status,
               TO_CHAR(COALESCE(published_date, fetched_at), 'YYYY-MM') as month
        FROM tenders
        WHERE value_amount > 0
        ORDER BY fetched_at DESC
        LIMIT 200
    """,
}


def _pick_sql(question: str) -> str:
    """Pick the best SQL template based on the question keywords."""
    q = question.lower()
    if any(w in q for w in ["by buyer", "which buyer", "top buyer", "most tenders"]):
        return SQL_TEMPLATES["spend_by_buyer"]
    if any(w in q for w in ["by year", "per year", "annual", "yearly", "over time"]):
        return SQL_TEMPLATES["spend_by_year"]
    if any(w in q for w in ["by month", "per month", "monthly"]):
        return SQL_TEMPLATES["spend_by_month"]
    if any(w in q for w in ["status", "open vs", "awarded"]):
        return SQL_TEMPLATES["status_breakdown"]
    if any(w in q for w in ["highest value", "biggest", "largest", "top value"]):
        return SQL_TEMPLATES["top_value"]
    return SQL_TEMPLATES["general"]


@tool
def visualise_tender_analytics(question: str) -> str:
    """
    Create a Tako analytics chart from Neon tender data.
    Queries the tenders database, converts to CSV, sends to Tako Visualize API,
    and returns the embed_url for the chart.

    Use this when users ask analytical questions about tenders — trends,
    spending breakdowns, comparisons by buyer/sector/year, etc.

    Args:
        question: The user's analytics question in natural language,
                  e.g. "Show me NHS contract spend by year"

    Returns:
        The Tako chart embed URL. Include this URL on its own line in your
        response so the frontend can render it as an interactive chart.
    """
    try:
        embed_url = ""
        # Check for pre-computed category insight first
        category = _match_category(question)
        if category:
            cached_url = _check_cached_insight(category)
            if cached_url:
                logger.info(f"Tako analytics: cache HIT for category '{category}'")
                embed_url = cached_url

        if not embed_url:
            if category:
                logger.info(f"Tako analytics: cache MISS for category '{category}'")
            sql = _pick_sql(question)
            logger.info(f"Tako analytics: question='{question}', sql template selected")
            csv_string = _query_to_csv(sql)
            logger.info(f"Tako analytics: CSV generated, {len(csv_string)} bytes")
            embed_url = _call_tako(csv_string, question)
            logger.info(f"Tako analytics: embed_url={embed_url}")

        return embed_url

    except Exception as e:
        logger.error(f"Tako analytics error: {e}", exc_info=True)
        return f"Analytics error: {e}"
