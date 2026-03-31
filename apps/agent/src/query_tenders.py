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
    Use this BEFORE fetch_uk_tenders when a user asks to analyse a specific tender.
    Returns matching tenders plus related tenders.

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
            SELECT ocid, title, buyer, value, deadline, status
            FROM tenders
            WHERE to_tsvector('english', title) @@ plainto_tsquery('english', %s)
            ORDER BY fetched_at DESC
            LIMIT 5
            """,
            (query,)
        )
        results = cur.fetchall()

        # Step 2: If no full-text matches, try ILIKE fuzzy match
        if not results:
            cur.execute(
                """
                SELECT ocid, title, buyer, value, deadline, status
                FROM tenders
                WHERE title ILIKE %s OR buyer ILIKE %s
                ORDER BY fetched_at DESC
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
                "buyer": row["buyer"] or "Unknown Buyer",
                "value": float(row["value"]) if row["value"] else 0,
                "deadline": row["deadline"].isoformat() if row["deadline"] else "",
                "status": row["status"] or "Open",
            })

        return tenders

    except Exception:
        if conn:
            conn.close()
        return []
