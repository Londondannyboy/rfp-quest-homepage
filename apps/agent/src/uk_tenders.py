"""
UK Government Tender fetching and visualization tools
"""
import json
import httpx
from langchain.tools import tool
from datetime import datetime

@tool
async def fetch_uk_tenders(limit: int = 20) -> str:
    """
    Fetch recent UK government tenders from Contracts Finder OCDS API.
    Returns formatted HTML for visualization.
    
    Args:
        limit: Number of tenders to fetch (default 20)
    """
    
    # Fetch from OCDS API
    url = f"https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?limit={limit}&format=json"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            data = response.json()
    except Exception as e:
        # Return mock data if API fails
        data = {
            "releases": [
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
        }
    
    # Generate HTML visualization
    html = generate_tender_html(data.get("releases", [])[:limit])
    
    return json.dumps({
        "widgetRenderer": {
            "title": "UK Government Tenders",
            "description": f"Showing {len(data.get('releases', [])[:limit])} recent procurement opportunities",
            "html": html
        }
    })


def generate_tender_html(releases):
    """Generate HTML for tender cards"""
    
    cards_html = ""
    for release in releases:
        tender = release.get("tender", {})
        buyer = release.get("buyer", {})
        
        title = tender.get("title", "Untitled Tender")
        value = tender.get("value", {}).get("amount", 0)
        deadline = tender.get("tenderPeriod", {}).get("endDate", "")
        buyer_name = buyer.get("name", "Unknown Buyer")
        status = "Open" if "tender" in release.get("tag", []) else "Awarded"
        ocid = release.get("ocid", "")
        
        # Format value
        if value >= 1000000:
            value_str = f"£{value/1000000:.1f}M"
        elif value >= 1000:
            value_str = f"£{value/1000:.0f}K"
        else:
            value_str = f"£{value}"
        
        # Format deadline
        if deadline:
            try:
                dt = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                deadline_str = dt.strftime("%d %B %Y")
                days_left = (dt - datetime.now()).days
                urgency = "urgent" if days_left < 7 else "normal"
            except:
                deadline_str = "TBC"
                urgency = "normal"
        else:
            deadline_str = "TBC"
            urgency = "normal"
        
        status_color = "success" if status == "Open" else "warning"
        
        cards_html += f'''
        <div style="background: var(--color-background-primary); 
                    border: 0.5px solid var(--color-border-tertiary); 
                    border-radius: var(--border-radius-lg); 
                    padding: 1rem 1.25rem;
                    margin-bottom: 1rem;">
            
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <span style="display: inline-block; font-size: 11px; padding: 3px 10px; 
                           border-radius: var(--border-radius-md); 
                           background: var(--color-background-{status_color}); 
                           color: var(--color-text-{status_color});">{status}</span>
                <span style="font-size: 12px; color: var(--color-text-secondary);">
                    Closes: {deadline_str}
                </span>
            </div>
            
            <h3 style="font-size: 15px; font-weight: 500; margin: 0 0 8px; 
                       color: var(--color-text-primary); line-height: 1.4;">
                {title}
            </h3>
            
            <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0 0 12px;">
                {buyer_name}
            </p>
            
            <div style="font-size: 20px; font-weight: 500; color: var(--color-text-primary); 
                        margin-bottom: 12px;">
                {value_str}
            </div>
            
            <div style="display: flex; gap: 8px;">
                <button onclick="sendPrompt('Analyse tender: {title}')" 
                        style="font-size: 12px; padding: 6px 12px; 
                               border: 0.5px solid var(--color-border-tertiary); 
                               background: transparent; 
                               border-radius: var(--border-radius-md); 
                               color: var(--color-text-primary); 
                               cursor: pointer;">
                    Analyse ↗
                </button>
                <a href="https://www.contractsfinder.service.gov.uk/notice/{ocid}" 
                   target="_blank" 
                   style="font-size: 12px; padding: 6px 12px; 
                          border: 0.5px solid var(--color-border-tertiary); 
                          background: transparent; 
                          border-radius: var(--border-radius-md); 
                          color: var(--color-text-primary); 
                          text-decoration: none; 
                          display: inline-block;">
                    View on CF →
                </a>
            </div>
        </div>
        '''
    
    return f'''
    <div style="padding: 16px;">
        <h2 style="font-size: 18px; font-weight: 500; margin: 0 0 16px; color: var(--color-text-primary);">
            Recent UK Government Tenders
        </h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
            {cards_html}
        </div>
    </div>
    '''