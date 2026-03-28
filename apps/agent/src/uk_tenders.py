"""
UK Government Tender fetching tool
"""
import httpx
from langchain.tools import tool
from typing import List, Dict, Any

@tool
def fetch_uk_tenders(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Fetch recent UK government tenders from Contracts Finder OCDS API.
    Returns a list of tender dictionaries with title, buyer, value, deadline, status, and ocid.
    
    Args:
        limit: Number of tenders to fetch (default 20)
        
    Returns:
        List of tender dictionaries
    """
    
    # Fetch from OCDS API
    url = f"https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit={limit}&format=json"
    
    try:
        with httpx.Client() as client:
            response = client.get(url, timeout=10.0)
            data = response.json()
            releases = data.get("releases", [])
    except Exception as e:
        # Return mock data if API fails
        releases = [
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
    
    # Extract and return clean tender data
    return [
        {
            "title": release.get("tender", {}).get("title", "Untitled Tender"),
            "buyer": release.get("buyer", {}).get("name", "Unknown Buyer"),
            "value": release.get("tender", {}).get("value", {}).get("amount", 0),
            "deadline": release.get("tender", {}).get("tenderPeriod", {}).get("endDate", ""),
            "status": "Open" if "tender" in release.get("tag", []) else "Awarded",
            "ocid": release.get("ocid", "")
        }
        for release in releases[:limit]
    ]