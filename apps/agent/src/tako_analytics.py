"""
Tako analytics tool — queries Neon tenders, converts to CSV,
calls Tako Visualize API, returns embed_url for chart rendering.
"""

import os
import io
import csv
import httpx
import psycopg2
import psycopg2.extras
from langchain.tools import tool
from typing import Dict, Any


TAKO_VISUALIZE_URL = "https://tako.com/api/v1/beta/visualize"


def _get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    return psycopg2.connect(database_url)


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

    cards = data.get("knowledge_cards", [])
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
    if any(w in q for w in ["status", "open vs", "awarded"]):
        return SQL_TEMPLATES["status_breakdown"]
    if any(w in q for w in ["highest value", "biggest", "largest", "top value"]):
        return SQL_TEMPLATES["top_value"]
    return SQL_TEMPLATES["general"]


@tool
def visualise_tender_analytics(question: str) -> Dict[str, Any]:
    """
    Create a Tako analytics chart from Neon tender data.
    Queries the tenders database, converts to CSV, sends to Tako Visualize API,
    and returns an embed_url for rendering as an interactive chart.

    Use this when users ask analytical questions about tenders — trends,
    spending breakdowns, comparisons by buyer/sector/year, etc.

    Args:
        question: The user's analytics question in natural language,
                  e.g. "Show me NHS contract spend by year"

    Returns:
        Dictionary with embed_url (string) and title (string) for the chart.
    """
    try:
        sql = _pick_sql(question)
        csv_string = _query_to_csv(sql)
        embed_url = _call_tako(csv_string, question)
        return {
            "embed_url": embed_url,
            "title": question,
        }
    except Exception as e:
        return {
            "error": str(e),
            "embed_url": "",
            "title": question,
        }
