"""
Onboarding tool: auto-populate company profile from domain via Tavily.
Companies House integration deferred to Phase 7.
"""
import os
import json
import httpx
import psycopg2
import psycopg2.extras
from langchain.tools import tool
from typing import Dict, Any


def _get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    clean_url = database_url.replace(
        "channel_binding=require&", ""
    ).replace("&channel_binding=require", "").replace(
        "channel_binding=require", ""
    )
    return psycopg2.connect(clean_url)


def _scrape_with_tavily(url: str) -> dict:
    """Use Tavily Extract API to crawl a specific URL and return page content."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return {"error": "TAVILY_API_KEY not set"}
    try:
        with httpx.Client(timeout=20) as client:
            resp = client.post(
                "https://api.tavily.com/extract",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "urls": url,
                    "extract_depth": "basic",
                    "format": "markdown",
                    "include_images": False,
                },
            )
            if resp.status_code != 200:
                return {"error": f"Tavily returned {resp.status_code}"}
            data = resp.json()
            results = data.get("results", [])
            if not results:
                return {"error": "Tavily returned no results"}
            content = results[0].get("raw_content", "") or results[0].get("content", "")
            return {
                "content": content[:2000] if content else "",
                "url": results[0].get("url", url),
            }
    except Exception as e:
        return {"error": str(e)}


@tool
def get_user_company(user_id: str = "", email: str = "") -> Dict[str, Any]:
    """
    Look up the company profile linked to a user.
    Can search by user_id or email address.
    Returns company details if found, or empty dict if user
    has no company profile (needs onboarding).

    Args:
        user_id: The authenticated user's ID from Neon Auth.
        email: The user's email address (alternative lookup).

    Returns:
        Company profile dict, or {"has_company": false}.
    """
    if not user_id and not email:
        return {"has_company": False, "error": "need user_id or email"}

    conn = _get_db_connection()
    if not conn:
        return {"has_company": False, "error": "db connection failed"}
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if user_id:
            cur.execute(
                """
                SELECT cp.id as company_id, cp.domain, cp.name, cp.sectors,
                       cp.region, cp.is_sme, cp.description,
                       pp.role, pp.display_name, pp.user_id
                FROM person_profiles pp
                JOIN company_profiles cp ON pp.company_id = cp.id
                WHERE pp.user_id = %s
                """,
                (user_id,)
            )
        else:
            cur.execute(
                """
                SELECT cp.id as company_id, cp.domain, cp.name, cp.sectors,
                       cp.region, cp.is_sme, cp.description,
                       pp.role, pp.display_name, pp.user_id
                FROM person_profiles pp
                JOIN company_profiles cp ON pp.company_id = cp.id
                WHERE pp.email = %s
                """,
                (email,)
            )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            result = dict(row)
            result["has_company"] = True
            result["company_id"] = str(result["company_id"])
            return result
        return {"has_company": False}
    except Exception:
        if conn:
            conn.close()
        return {"has_company": False}


@tool
def onboard_company(domain: str) -> Dict[str, Any]:
    """
    Auto-populate a company profile from a confirmed domain.
    Only call this AFTER the user has confirmed their website URL.
    Checks for duplicate domains first, then scrapes via Tavily Extract.

    Args:
        domain: User-confirmed website domain (e.g. acmeconstruction.co.uk)

    Returns:
        Dictionary with pre-populated company profile fields.
        If domain already exists, returns {"duplicate": true, "name": "..."}.
    """
    clean_domain = domain.lower().strip().replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")
    search_term = clean_domain.split(".")[0]

    # Check for duplicate domain in Neon
    conn = _get_db_connection()
    if conn:
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                "SELECT id, name, domain FROM company_profiles WHERE domain = %s",
                (clean_domain,)
            )
            existing = cur.fetchone()
            cur.close()
            conn.close()
            if existing:
                return {
                    "duplicate": True,
                    "existing_company_id": str(existing["id"]),
                    "existing_name": existing["name"],
                    "domain": clean_domain,
                }
        except Exception:
            if conn:
                conn.close()

    website = f"https://{clean_domain}"

    profile: Dict[str, Any] = {
        "duplicate": False,
        "domain": clean_domain,
        "name": search_term.replace("-", " ").title(),
        "description": "",
        "website": website,
        "sectors": [],
        "region": "",
        "is_sme": False,
        "source": "tavily",
        "tavily_error": "",
    }

    # Tavily Extract — crawl the actual homepage
    tavily_data = _scrape_with_tavily(website)
    if tavily_data.get("error"):
        profile["tavily_error"] = tavily_data["error"]
    elif tavily_data.get("content"):
        profile["page_content"] = tavily_data["content"]

    return profile


@tool
def save_company_profile(profile_data: str, user_id: str = "") -> str:
    """
    Save a confirmed company profile to Neon database and link
    the current user as admin. Called after HITL confirmation.

    Args:
        profile_data: JSON string of the company profile fields.
        user_id: The authenticated user's ID from Neon Auth.
            If provided, creates a person_profiles row linking
            this user to the company as admin.

    Returns:
        Success message with company ID, or error message.
    """
    try:
        data = json.loads(profile_data) if isinstance(profile_data, str) else profile_data
    except json.JSONDecodeError:
        return "Error: invalid JSON"

    conn = _get_db_connection()
    if not conn:
        return "Error: database connection failed"

    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO company_profiles (
                domain, name, sectors, region,
                description, website, is_sme, verified
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, false
            )
            ON CONFLICT (domain) DO UPDATE SET
                name = EXCLUDED.name,
                sectors = EXCLUDED.sectors,
                region = EXCLUDED.region,
                description = EXCLUDED.description,
                updated_at = NOW()
            RETURNING id
            """,
            (
                data.get("domain"),
                data.get("name"),
                json.dumps(data.get("sectors", [])),
                data.get("region"),
                data.get("description"),
                data.get("website"),
                data.get("is_sme", False),
            ),
        )
        company_id = cur.fetchone()[0]

        # Link user to company as admin
        if user_id:
            cur.execute(
                """
                INSERT INTO person_profiles
                (user_id, company_id, role, display_name, email)
                VALUES (%s, %s, 'admin', %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    company_id = EXCLUDED.company_id,
                    role = 'admin'
                """,
                (user_id, str(company_id), data.get("name", ""), data.get("email", "")),
            )

        conn.commit()
        cur.close()
        conn.close()
        return f"Company profile saved. ID: {company_id}. User linked as admin."
    except Exception as e:
        if conn:
            conn.close()
        return f"Error saving profile: {str(e)}"
