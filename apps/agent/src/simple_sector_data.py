#!/usr/bin/env python3
"""
Quick sector data extraction without heavy joins.
"""
import os
import psycopg2
import psycopg2.extras
import json

def get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")
    
    clean_url = database_url.replace(
        "channel_binding=require&", ""
    ).replace("&channel_binding=require", "").replace(
        "channel_binding=require", ""
    )
    return psycopg2.connect(clean_url)

def main():
    """Get basic sector counts."""
    print("🔍 Getting sector counts...")
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    # Simple sector count query
    cur.execute("""
        SELECT primary_sector as sector_name,
               COUNT(*) as tender_count
        FROM tender_categories
        WHERE primary_sector IS NOT NULL 
        AND primary_sector != 'Other'
        GROUP BY primary_sector
        ORDER BY COUNT(*) DESC
        LIMIT 15
    """)
    
    sectors = cur.fetchall()
    print(f"\n📊 Top sectors by tender count:")
    for sector in sectors:
        sector_name = sector['sector_name']
        count = sector['tender_count']
        slug = sector_name.lower().replace(" & ", "-").replace(" ", "-").replace("&", "and")
        print(f"  - {sector_name}: {count:,} tenders (slug: {slug})")
    
    cur.close()
    conn.close()
    print(f"\n✅ Found {len(sectors)} sectors for SEO pages")

if __name__ == "__main__":
    main()