"""
Query tenders from Neon database — exact title match + full-text search.
pgvector similarity search will be added once embeddings are populated.
"""
import os
import psycopg2
import psycopg2.extras
from langchain.tools import tool
from typing import List, Dict, Any


def _get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    return psycopg2.connect(database_url)


@tool
def query_neon_tenders(query: str) -> List[Dict[str, Any]]:
    """
    Search for tenders in the Neon database by title, buyer, or description.
    Use this as the primary lookup when a user asks about a specific tender.
    Returns matching tenders from the Neon database.

    Args:
        query: Search string — tender title, buyer name, or keywords

    Returns:
        List of matching tender dictionaries with title, buyer, value, deadline, status, ocid.
        Returns empty list if database is unavailable or no matches found.
    """
    conn = _get_db_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Step 1: Full-text search on title
        cur.execute(
            """
            SELECT ocid, title, buyer_name, value_amount, tender_end_date, status, stage
            FROM tenders
            WHERE to_tsvector('english', title) @@ plainto_tsquery('english', %s)
            ORDER BY published_date DESC NULLS LAST, fetched_at DESC
            LIMIT 5
            """,
            (query,)
        )
        results = cur.fetchall()

        # Step 2: If no full-text matches, try ILIKE fuzzy match
        if not results:
            cur.execute(
                """
                SELECT ocid, title, buyer_name, value_amount, tender_end_date, status, stage
                FROM tenders
                WHERE title ILIKE %s OR buyer_name ILIKE %s
                ORDER BY published_date DESC NULLS LAST, fetched_at DESC
                LIMIT 5
                """,
                (f"%{query}%", f"%{query}%")
            )
            results = cur.fetchall()

        cur.close()
        conn.close()

        # Convert to plain dicts with serializable values
        tenders = []
        for row in results:
            tenders.append({
                "ocid": row["ocid"],
                "title": row["title"],
                "buyer": row["buyer_name"] or "Unknown Buyer",
                "value": float(row["value_amount"]) if row["value_amount"] else 0,
                "deadline": row["tender_end_date"].isoformat() if row["tender_end_date"] else "",
                "status": row["status"] or "Open",
                "stage": row["stage"] or "",
            })

        return tenders

    except Exception:
        if conn:
            conn.close()
        return []
