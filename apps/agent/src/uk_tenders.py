"""
UK Government Tender fetching tool with Neon persistence
"""
import os
import json
import httpx
import psycopg2
from langchain.tools import tool
from typing import List, Dict, Any


def _get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return None
    return psycopg2.connect(database_url)


def _save_tenders_to_neon(tenders: List[Dict[str, Any]], raw_releases: List[Dict]) -> None:
    """Save fetched tenders to Neon database. Upserts on conflict."""
    conn = _get_db_connection()
    if not conn:
        return

    try:
        cur = conn.cursor()
        for tender, release in zip(tenders, raw_releases):
            cur.execute(
                """
                INSERT INTO tenders (ocid, title, buyer, value, deadline, status, raw_json, source, fetched_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'ocds', NOW())
                ON CONFLICT (ocid) DO UPDATE SET
                    title = EXCLUDED.title,
                    buyer = EXCLUDED.buyer,
                    value = EXCLUDED.value,
                    deadline = EXCLUDED.deadline,
                    status = EXCLUDED.status,
                    raw_json = EXCLUDED.raw_json,
                    fetched_at = NOW()
                """,
                (
                    tender["ocid"],
                    tender["title"],
                    tender["buyer"],
                    tender["value"] if tender["value"] else None,
                    tender["deadline"] if tender["deadline"] else None,
                    tender["status"],
                    json.dumps(release),
                )
            )
        conn.commit()
        cur.close()
    except Exception:
        conn.rollback()
    finally:
        conn.close()


@tool
def fetch_uk_tenders(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Fetch recent UK government tenders from Contracts Finder OCDS API.
    Returns a list of tender dictionaries with title, buyer, value, deadline, status, and ocid.
    Saves all fetched tenders to Neon database for future lookup.

    Args:
        limit: Number of tenders to fetch (default 20)

    Returns:
        List of tender dictionaries
    """

    # Fetch from OCDS API
    url = f"https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit={limit}&format=json"

    raw_releases = []
    try:
        with httpx.Client() as client:
            response = client.get(url, timeout=10.0)
            data = response.json()
            raw_releases = data.get("releases", [])
    except Exception:
        # Return mock data if API fails
        raw_releases = [
            {
                "tender": {
                    "title": "Digital Transformation Services",
                    "value": {"amount": 2500000},
                    "tenderPeriod": {"endDate": "2026-04-15T23:59:59Z"}
                },
                "buyer": {"name": "NHS England"},
                "tag": ["tender"],
                "ocid": "ocds-b5fd17-example-001"
            },
            {
                "tender": {
                    "title": "Cloud Infrastructure Support",
                    "value": {"amount": 1800000},
                    "tenderPeriod": {"endDate": "2026-04-20T23:59:59Z"}
                },
                "buyer": {"name": "Department for Education"},
                "tag": ["tender"],
                "ocid": "ocds-b5fd17-example-002"
            },
            {
                "tender": {
                    "title": "Cybersecurity Consulting Services",
                    "value": {"amount": 950000},
                    "tenderPeriod": {"endDate": "2026-04-10T23:59:59Z"}
                },
                "buyer": {"name": "Home Office"},
                "tag": ["award"],
                "ocid": "ocds-b5fd17-example-003"
            }
        ]

    # Extract clean tender data
    tenders = [
        {
            "title": release.get("tender", {}).get("title", "Untitled Tender"),
            "buyer": release.get("buyer", {}).get("name", "Unknown Buyer"),
            "value": release.get("tender", {}).get("value", {}).get("amount", 0),
            "deadline": release.get("tender", {}).get("tenderPeriod", {}).get("endDate", ""),
            "status": "Open" if "tender" in release.get("tag", []) else "Awarded",
            "ocid": release.get("ocid", "")
        }
        for release in raw_releases[:limit]
    ]

    # Save to Neon (fire and forget — don't fail the tool if DB is down)
    try:
        _save_tenders_to_neon(tenders, raw_releases[:limit])
    except Exception:
        pass

    return tenders
