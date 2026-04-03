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
            SELECT ocid, title, buyer_name, value_amount, tender_end_date, status, stage,
                   ts_rank(to_tsvector('english', title), query) AS rank
            FROM tenders, plainto_tsquery('english', %s) query
            WHERE to_tsvector('english', title) @@ query
            ORDER BY rank DESC,
                     (value_amount IS NOT NULL AND value_amount > 0) DESC,
                     published_date DESC NULLS LAST
            LIMIT 20
            """,
            (query,)
        )
        results = cur.fetchall()

        # Step 2: If no full-text matches, try ILIKE on individual words
        if not results:
            words = [w for w in query.split() if len(w) > 2]
            if words:
                ilike_conditions = " OR ".join(
                    ["title ILIKE %s OR buyer_name ILIKE %s"] * len(words)
                )
                ilike_params = []
                for w in words:
                    ilike_params.extend([f"%{w}%", f"%{w}%"])
                cur.execute(
                    f"""
                    SELECT ocid, title, buyer_name, value_amount, tender_end_date, status, stage
                    FROM tenders
                    WHERE {ilike_conditions}
                    ORDER BY (value_amount IS NOT NULL AND value_amount > 0) DESC,
                             published_date DESC NULLS LAST
                    LIMIT 20
                    """,
                    ilike_params,
                )
                results = cur.fetchall()

        # Step 3: If still no matches, return most recent tenders (browse mode)
        if not results:
            cur.execute(
                """
                SELECT ocid, title, buyer_name, value_amount, tender_end_date, status, stage
                FROM tenders
                ORDER BY published_date DESC NULLS LAST
                LIMIT 20
                """
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
