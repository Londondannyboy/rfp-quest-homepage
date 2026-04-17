"""
SEO routes for sector pages.
Serves pre-computed sector data for Next.js static site generation.
Phase 6d Step 1: Sector pages only.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import psycopg2
import psycopg2.extras
import json
import os
from .get_db import get_db_connection

router = APIRouter(prefix="/seo", tags=["seo"])

SECTOR_MAPPING = {
    'digital-technology': 'Digital & Technology',
    'healthcare': 'Healthcare', 
    'construction': 'Construction',
    'education': 'Education',
    'facilities-management': 'Facilities Management',
    'transport': 'Transport',
    'professional-services': 'Professional Services',
    'housing': 'Housing',
    'energy-environment': 'Energy & Environment',
    'financial-services': 'Financial Services',
    'social-care': 'Social Care',
    'defence': 'Defence'
}

@router.get("/sectors")
async def get_all_sectors() -> List[Dict[str, Any]]:
    """Get list of all sectors for sitemap generation."""
    try:
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=503, detail="Database unavailable")
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Get sector counts
        cur.execute("""
            SELECT primary_sector as sector_name,
                   COUNT(*) as tender_count
            FROM tender_categories
            WHERE primary_sector IS NOT NULL 
            AND primary_sector != 'Other'
            GROUP BY primary_sector
            ORDER BY COUNT(*) DESC
        """)
        
        sectors = []
        for row in cur.fetchall():
            sector_name = row['sector_name']
            slug = sector_name.lower().replace(" & ", "-").replace(" ", "-").replace("&", "and")
            if slug in SECTOR_MAPPING:
                sectors.append({
                    "slug": slug,
                    "name": sector_name,
                    "tender_count": row['tender_count']
                })
        
        cur.close()
        conn.close()
        return sectors
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sectors: {str(e)}")

@router.get("/sectors/{slug}")
async def get_sector_data(slug: str) -> Dict[str, Any]:
    """Get detailed sector data for a specific sector page."""
    try:
        sector_name = SECTOR_MAPPING.get(slug)
        if not sector_name:
            raise HTTPException(status_code=404, detail="Sector not found")
        
        conn = get_db_connection()
        if not conn:
            raise HTTPException(status_code=503, detail="Database unavailable")
        
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Get sector statistics
        cur.execute("""
            SELECT tc.primary_sector as sector_name,
                   COUNT(*) as tender_count,
                   SUM(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE 0 END) as total_value,
                   AVG(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE NULL END) as avg_value
            FROM tender_categories tc
            LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
            WHERE tc.primary_sector = %s
            GROUP BY tc.primary_sector
        """, (sector_name,))
        
        stats = cur.fetchone()
        if not stats:
            raise HTTPException(status_code=404, detail="No data found for sector")
        
        # Get top buyers
        cur.execute("""
            SELECT bl.canonical_name as buyer_name,
                   COUNT(*) as tender_count
            FROM tender_categories tc
            LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
            LEFT JOIN buyer_lookup bl ON t.buyer_name = bl.raw_name
            WHERE tc.primary_sector = %s
            AND bl.canonical_name IS NOT NULL
            GROUP BY bl.canonical_name
            ORDER BY COUNT(*) DESC
            LIMIT 5
        """, (sector_name,))
        
        top_buyers = [dict(row) for row in cur.fetchall()]
        
        # Get top verticals
        cur.execute("""
            SELECT tc.vertical,
                   COUNT(*) as tender_count
            FROM tender_categories tc
            WHERE tc.primary_sector = %s
            AND tc.vertical IS NOT NULL
            AND tc.vertical != ''
            GROUP BY tc.vertical
            ORDER BY COUNT(*) DESC
            LIMIT 5
        """, (sector_name,))
        
        top_verticals = [dict(row) for row in cur.fetchall()]
        
        # Get award statistics
        cur.execute("""
            SELECT 
                COUNT(*) as total_count,
                COUNT(CASE WHEN t.winner IS NOT NULL AND t.winner != '' THEN 1 END) as awarded_count,
                COUNT(CASE WHEN t.is_sme_suitable = true THEN 1 END) as sme_suitable_count
            FROM tender_categories tc
            LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
            WHERE tc.primary_sector = %s
        """, (sector_name,))
        
        award_stats = dict(cur.fetchone())
        
        cur.close()
        conn.close()
        
        # Format response
        total_value = float(stats['total_value'] or 0)
        avg_value = float(stats['avg_value'] or 0)
        
        return {
            "slug": slug,
            "sector_name": sector_name,
            "tender_count": stats['tender_count'],
            "total_value_gbp": int(total_value),
            "avg_value_gbp": int(avg_value),
            "top_buyers": top_buyers,
            "top_verticals": top_verticals,
            "award_stats": award_stats,
            "description": f"UK government procurement opportunities in {sector_name}. {stats['tender_count']:,} tenders worth £{int(total_value/1000000000):,.1f}B from major public sector buyers.",
            "meta_title": f"{sector_name} Procurement Opportunities | RFP.quest",
            "meta_description": f"Find {sector_name.lower()} tenders from UK government buyers. {stats['tender_count']:,} opportunities with intelligent matching and bid analysis."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sector data: {str(e)}")