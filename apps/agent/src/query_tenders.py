"""
Query tenders from Neon database — full-text search + personalised matching.
pgvector similarity search will be added once embeddings are populated.
"""
import os
import json
import psycopg2
import psycopg2.extras
from langchain.tools import tool
from typing import List, Dict, Any


def _get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    clean_url = database_url.replace(
        "channel_binding=require&", ""
    ).replace("&channel_binding=require", "").replace(
        "channel_binding=require", ""
    )
    return psycopg2.connect(clean_url)


def _get_company_profile(conn, company_id: str) -> dict | None:
    """Fetch company profile for personalised matching."""
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            "SELECT sectors, cpv_codes, region, min_contract_value, max_contract_value, is_sme FROM company_profiles WHERE id = %s",
            (company_id,)
        )
        row = cur.fetchone()
        cur.close()
        return dict(row) if row else None
    except Exception:
        return None


def _score_match(tender: dict, profile: dict) -> tuple[int, str]:
    """Score a tender against a company profile. Returns (score 0-100, tag)."""
    score = 0

    # Sector match (title contains sector keywords)
    sectors = profile.get("sectors") or []
    if isinstance(sectors, str):
        try:
            sectors = json.loads(sectors)
        except Exception:
            sectors = []
    title_lower = (tender.get("title") or "").lower()
    buyer_lower = (tender.get("buyer_name") or "").lower()
    for sector in sectors:
        s = sector.lower() if isinstance(sector, str) else ""
        if s and (s in title_lower or s in buyer_lower):
            score += 40
            break

    # Value range match
    value = float(tender.get("value_amount") or 0)
    min_val = profile.get("min_contract_value") or 0
    max_val = profile.get("max_contract_value") or 999999999
    if value > 0 and min_val <= value <= max_val:
        score += 25
    elif value > 0:
        score += 5  # has a value but outside range

    # Region match (buyer name contains region keywords)
    region = (profile.get("region") or "").lower()
    if region and region in buyer_lower:
        score += 20

    # SME suitability (lower value tenders more likely SME suitable)
    if profile.get("is_sme") and value > 0 and value < 5000000:
        score += 15

    # Cap at 100
    score = min(score, 100)

    if score >= 60:
        tag = "Strong match"
    elif score >= 30:
        tag = "Possible match"
    else:
        tag = "Outside profile"

    return score, tag


@tool
def query_neon_tenders(query: str, company_id: str = "") -> List[Dict[str, Any]]:
    """
    Search for tenders in the Neon database by title, buyer, or description.
    Use this as the primary lookup when a user asks about a specific tender.
    Returns matching tenders from the Neon database.

    If company_id is provided, tenders are scored and tagged against the
    company profile: Strong match, Possible match, or Outside profile.

    Args:
        query: Search string — tender title, buyer name, or keywords
        company_id: Optional company profile ID for personalised matching

    Returns:
        List of matching tender dictionaries with title, buyer, value, deadline, status, ocid.
        If company_id provided, includes match_score and match_tag fields.
        Returns empty list if database is unavailable or no matches found.
    """
    conn = _get_db_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Load company profile if provided
        profile = None
        if company_id:
            profile = _get_company_profile(conn, company_id)

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
            tender = {
                "ocid": row["ocid"],
                "title": row["title"],
                "buyer": row["buyer_name"] or "Unknown Buyer",
                "value": float(row["value_amount"]) if row["value_amount"] else 0,
                "deadline": row["tender_end_date"].isoformat() if row["tender_end_date"] else "",
                "status": row["status"] or "Open",
                "stage": row["stage"] or "",
            }

            # Add match scoring if company profile available
            if profile:
                score, tag = _score_match(row, profile)
                tender["match_score"] = score
                tender["match_tag"] = tag

            tenders.append(tender)

        # Sort by match score if personalised
        if profile:
            tenders.sort(key=lambda t: t.get("match_score", 0), reverse=True)

        return tenders

    except Exception:
        if conn:
            conn.close()
        return []
