#!/usr/bin/env python3
"""
Extract sector page data from tender_categories for SEO pages.
Creates seo_sector_pages table with pre-computed statistics and insights.
Phase 6d Step 1: Sector pages only.
"""
import os
import psycopg2
import psycopg2.extras
from datetime import datetime
import json

def get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")
    
    # Strip channel_binding to avoid psycopg2 errors (D22)
    clean_url = database_url.replace(
        "channel_binding=require&", ""
    ).replace("&channel_binding=require", "").replace(
        "channel_binding=require", ""
    )
    return psycopg2.connect(clean_url)

def create_seo_sector_pages_table(conn):
    """Create table for SEO sector page data."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS seo_sector_pages (
            id SERIAL PRIMARY KEY,
            sector_slug VARCHAR(100) UNIQUE NOT NULL,
            sector_name VARCHAR(200) NOT NULL,
            tender_count INTEGER NOT NULL,
            total_value_gbp BIGINT NOT NULL,
            avg_value_gbp INTEGER NOT NULL,
            top_buyers JSON NOT NULL,
            top_verticals JSON NOT NULL,
            award_stats JSON NOT NULL,
            description TEXT NOT NULL,
            meta_title VARCHAR(200) NOT NULL,
            meta_description VARCHAR(300) NOT NULL,
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    cur.close()

def generate_sector_slug(sector_name):
    """Convert sector name to URL-safe slug."""
    return sector_name.lower().replace(" & ", "-").replace(" ", "-").replace("&", "and")

def extract_sector_data(conn):
    """Extract sector statistics from tender_categories and related tables."""
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Get all sectors with tender counts (optimized query)
    cur.execute("""
        SELECT tc.primary_sector as sector_name,
               COUNT(*) as tender_count,
               SUM(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE 0 END) as total_value,
               AVG(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE NULL END) as avg_value
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector IS NOT NULL 
        AND tc.primary_sector != 'Other'
        GROUP BY tc.primary_sector
        HAVING COUNT(*) >= 10000
        ORDER BY COUNT(*) DESC
        LIMIT 15
    """)
    
    sectors = cur.fetchall()
    print(f"Found {len(sectors)} sectors with >= 10,000 tenders")
    
    sector_data = []
    
    for sector in sectors:
        sector_name = sector['sector_name']
        sector_slug = generate_sector_slug(sector_name)
        
        print(f"Processing sector: {sector_name}")
        
        # Get top buyers for this sector (optimized)
        cur.execute("""
            SELECT bl.canonical_name as buyer_name,
                   COUNT(*) as tender_count,
                   SUM(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE 0 END) as total_value
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
        
        # Get top verticals for this sector (optimized)
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
        
        # Get award statistics (optimized)
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
        
        # Generate description and meta content
        description = f"UK government procurement opportunities in {sector_name}. {sector['tender_count']:,} tenders worth £{int(sector['total_value'] or 0):,} from {len(top_buyers)} major buyers including " + ", ".join([b['buyer_name'] for b in top_buyers[:3]]) + "."
        
        meta_title = f"{sector_name} Procurement Opportunities | RFP.quest"
        meta_description = f"Find {sector_name.lower()} tenders from UK government buyers. {sector['tender_count']:,} opportunities worth £{int(sector['total_value'] or 0):,} with intelligent matching and bid analysis."
        
        sector_data.append({
            'sector_slug': sector_slug,
            'sector_name': sector_name,
            'tender_count': sector['tender_count'],
            'total_value_gbp': int(sector['total_value'] or 0),
            'avg_value_gbp': int(sector['avg_value'] or 0),
            'top_buyers': top_buyers,
            'top_verticals': top_verticals,
            'award_stats': award_stats,
            'description': description,
            'meta_title': meta_title,
            'meta_description': meta_description
        })
    
    cur.close()
    return sector_data

def insert_sector_pages(conn, sector_data):
    """Insert sector page data into seo_sector_pages table."""
    cur = conn.cursor()
    
    # Clear existing data
    cur.execute("TRUNCATE TABLE seo_sector_pages")
    
    for data in sector_data:
        cur.execute("""
            INSERT INTO seo_sector_pages 
            (sector_slug, sector_name, tender_count, total_value_gbp, avg_value_gbp,
             top_buyers, top_verticals, award_stats, description, meta_title, meta_description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['sector_slug'],
            data['sector_name'], 
            data['tender_count'],
            data['total_value_gbp'],
            data['avg_value_gbp'],
            json.dumps(data['top_buyers']),
            json.dumps(data['top_verticals']),
            json.dumps(data['award_stats']),
            data['description'],
            data['meta_title'],
            data['meta_description']
        ))
    
    conn.commit()
    cur.close()
    print(f"✅ Inserted {len(sector_data)} sector pages into seo_sector_pages table")

def main():
    """Extract sector data and populate seo_sector_pages table."""
    print("🔍 Extracting sector data for SEO pages...")
    
    conn = get_db_connection()
    
    # Create table if it doesn't exist
    create_seo_sector_pages_table(conn)
    
    # Extract sector statistics
    sector_data = extract_sector_data(conn)
    
    if not sector_data:
        print("❌ No sector data found")
        return
    
    # Insert into seo_sector_pages table
    insert_sector_pages(conn, sector_data)
    
    # Show summary
    print(f"\n📊 Generated {len(sector_data)} sector pages:")
    for data in sector_data:
        print(f"  - /{data['sector_slug']} ({data['tender_count']:,} tenders)")
    
    conn.close()
    print("\n✅ SEO sector data extraction complete")

if __name__ == "__main__":
    main()