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
def onboard_company(domain: str) -> Dict[str, Any]:
    """
    Auto-populate a company profile from a domain name.
    Scrapes the company website via Tavily to build a
    pre-populated profile for HITL confirmation.

    Args:
        domain: Company website domain (e.g. acmeconstruction.co.uk)

    Returns:
        Dictionary with pre-populated company profile fields.
    """
    clean_domain = domain.lower().strip().replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")
    search_term = clean_domain.split(".")[0]

    website = f"https://{clean_domain}"

    profile: Dict[str, Any] = {
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
        # The agent will parse the content to extract name, description, sectors

    return profile


@tool
def save_company_profile(profile_data: str) -> str:
    """
    Save a confirmed company profile to Neon database.
    Called after HITL confirmation of the onboarding profile.

    Args:
        profile_data: JSON string of the company profile fields.

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
        conn.commit()
        cur.close()
        conn.close()
        return f"Company profile saved. ID: {company_id}"
    except Exception as e:
        if conn:
            conn.close()
        return f"Error saving profile: {str(e)}"
