"""
Query tenders from Neon database — full-text search + enrichment JOINs + personalised matching.
Joins supplier_lookup, buyer_lookup, tender_categories, buyer_intelligence
for enriched results. All JOINs are LEFT — never excludes tenders lacking enrichment.
"""
import os
import json
import psycopg2
import psycopg2.extras
from langchain.tools import tool
from typing import List, Dict, Any


# Sector/vertical keywords for query filtering
SECTOR_KEYWORDS = {
    "Digital & Technology": ["digital", "technology", "it ", "software", "cyber", "cybersecurity"],
    "Healthcare": ["health", "nhs", "medical", "clinical", "hospital"],
    "Construction": ["construction", "building", "civil engineering"],
    "Facilities Management": ["facilities", "cleaning", "maintenance", "fm "],
    "Professional Services": ["consulting", "consultancy", "advisory", "audit", "legal"],
    "Transport": ["transport", "rail", "bus ", "fleet", "vehicle"],
    "Defence": ["defence", "military", "mod "],
    "Education": ["education", "school", "university", "training"],
    "Social Care": ["social care", "care home", "fostering"],
    "Energy & Environment": ["energy", "renewable", "environmental"],
    "Housing": ["housing", "social housing"],
    "Financial Services": ["banking", "insurance", "pension", "financial"],
}

VERTICAL_KEYWORDS = {
    "IT Services & Consulting": ["it services", "it consulting", "helpdesk"],
    "Software & Licensing": ["software", "licensing", "saas"],
    "Architecture, Engineering & Planning": ["architecture", "engineering", "planning"],
    "Construction & Civil Engineering": ["construction", "civil engineering"],
    "Health & Social Care Services": ["health service", "social care", "nhs"],
    "Medical Equipment & Supplies": ["medical equipment", "medical device"],
    "Business & Professional Services": ["consulting", "advisory", "management"],
    "IT Hardware & Equipment": ["hardware", "laptop", "desktop", "server"],
    "Telecoms Equipment & Services": ["telecoms", "broadband", "network"],
    "Environmental & Waste Services": ["waste", "recycling", "environmental"],
    "Security & Defence Equipment": ["security", "defence equipment", "surveillance"],
}


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
    value = float(tender.get("value_amount") or 0)
    min_val = profile.get("min_contract_value") or 0
    max_val = profile.get("max_contract_value") or 999999999
    if value > 0 and min_val <= value <= max_val:
        score += 25
    elif value > 0:
        score += 5
    region = (profile.get("region") or "").lower()
    if region and region in buyer_lower:
        score += 20
    if profile.get("is_sme") and value > 0 and value < 5000000:
        score += 15
    score = min(score, 100)
    if score >= 60:
        tag = "Strong match"
    elif score >= 30:
        tag = "Possible match"
    else:
        tag = "Outside profile"
    return score, tag


def _detect_sector_filter(query: str) -> str | None:
    """Detect if query mentions a sector — return sector name or None."""
    q = query.lower()
    for sector, keywords in SECTOR_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            return sector
    return None


def _detect_vertical_filter(query: str) -> str | None:
    """Detect if query mentions a vertical — return vertical name or None."""
    q = query.lower()
    for vertical, keywords in VERTICAL_KEYWORDS.items():
        if any(kw in q for kw in keywords):
            return vertical
    return None


# Base SELECT with enrichment LEFT JOINs
ENRICHED_SELECT = """
    SELECT t.ocid, t.title, t.buyer_name, t.value_amount, t.tender_end_date,
           t.status, t.stage, t.winner, t.is_sme_suitable,
           tc.primary_sector, tc.vertical, tc.niche,
           bl.canonical_name as canonical_buyer, bl.buyer_type, bl.parent_org,
           bi.sme_award_rate, bi.total_contracts as buyer_total_contracts,
           bi.top_suppliers as buyer_top_suppliers,
           sl.canonical_name as canonical_supplier, sl.group_name as supplier_group
    FROM tenders t
    LEFT JOIN tender_categories tc ON t.ocid = tc.tender_ocid
    LEFT JOIN buyer_lookup bl ON t.buyer_name = bl.raw_name
    LEFT JOIN buyer_intelligence bi ON bl.canonical_name = bi.canonical_buyer_name
    LEFT JOIN supplier_lookup sl ON t.winner = sl.raw_name
"""


@tool
def query_neon_tenders(query: str, company_id: str = "") -> List[Dict[str, Any]]:
    """
    Search for tenders in the Neon database by title, buyer, sector, or vertical.
    Returns enriched results with sector classification, buyer intelligence,
    and supplier grouping from the Phase 6c enrichment pipeline.

    If company_id is provided, tenders are scored against the company profile.

    Args:
        query: Search string — tender title, buyer name, sector, or keywords
        company_id: Optional company profile ID for personalised matching

    Returns:
        List of enriched tender dictionaries. Returns empty list if unavailable.
    """
    conn = _get_db_connection()
    if not conn:
        return []

    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        profile = None
        if company_id:
            profile = _get_company_profile(conn, company_id)

        results = []

        # Check for sector/vertical filter
        sector_filter = _detect_sector_filter(query)
        vertical_filter = _detect_vertical_filter(query)

        if sector_filter:
            # Sector-filtered search
            cur.execute(
                ENRICHED_SELECT + """
                WHERE tc.primary_sector = %s
                ORDER BY (t.value_amount IS NOT NULL AND t.value_amount > 0) DESC,
                         t.published_date DESC NULLS LAST
                LIMIT 20
                """,
                (sector_filter,)
            )
            results = cur.fetchall()

        elif vertical_filter:
            # Vertical-filtered search
            cur.execute(
                ENRICHED_SELECT + """
                WHERE tc.vertical = %s
                ORDER BY (t.value_amount IS NOT NULL AND t.value_amount > 0) DESC,
                         t.published_date DESC NULLS LAST
                LIMIT 20
                """,
                (vertical_filter,)
            )
            results = cur.fetchall()

        if not results:
            # Full-text search with enrichment
            cur.execute(
                ENRICHED_SELECT + """
                , plainto_tsquery('english', %s) query
                WHERE to_tsvector('english', t.title) @@ query
                ORDER BY ts_rank(to_tsvector('english', t.title), query) DESC,
                         (t.value_amount IS NOT NULL AND t.value_amount > 0) DESC,
                         t.published_date DESC NULLS LAST
                LIMIT 20
                """,
                (query,)
            )
            results = cur.fetchall()

        # Fallback: ILIKE on individual words
        if not results:
            words = [w for w in query.split() if len(w) > 2]
            if words:
                ilike_conditions = " OR ".join(
                    ["t.title ILIKE %s OR t.buyer_name ILIKE %s"] * len(words)
                )
                ilike_params = []
                for w in words:
                    ilike_params.extend([f"%{w}%", f"%{w}%"])
                cur.execute(
                    ENRICHED_SELECT + f"""
                    WHERE {ilike_conditions}
                    ORDER BY (t.value_amount IS NOT NULL AND t.value_amount > 0) DESC,
                             t.published_date DESC NULLS LAST
                    LIMIT 20
                    """,
                    ilike_params,
                )
                results = cur.fetchall()

        # Final fallback: browse mode
        if not results:
            cur.execute(
                ENRICHED_SELECT + """
                ORDER BY t.published_date DESC NULLS LAST
                LIMIT 20
                """
            )
            results = cur.fetchall()

        cur.close()
        conn.close()

        # Convert to enriched dicts
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
                # Enrichment fields
                "sector": row.get("primary_sector") or "",
                "vertical": row.get("vertical") or "",
                "niche": row.get("niche") or "",
                "canonical_buyer": row.get("canonical_buyer") or "",
                "buyer_type": row.get("buyer_type") or "",
                "parent_org": row.get("parent_org") or "",
                "sme_award_rate": round(float(row["sme_award_rate"]), 2) if row.get("sme_award_rate") else None,
                "winner": row.get("winner") or "",
                "supplier_group": row.get("supplier_group") or "",
                "is_sme_suitable": row.get("is_sme_suitable") or False,
            }

            if profile:
                score, tag = _score_match(row, profile)
                tender["match_score"] = score
                tender["match_tag"] = tag

            tenders.append(tender)

        if profile:
            tenders.sort(key=lambda t: t.get("match_score", 0), reverse=True)

        return tenders

    except Exception:
        if conn:
            conn.close()
        return []
