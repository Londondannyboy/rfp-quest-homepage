#!/usr/bin/env python3
"""
Run the mandatory diagnosis queries before SEO pages implementation.
From HANDOFF.md Phase 6c gate test requirements.
"""
import os
import psycopg2
import psycopg2.extras

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

def main():
    """Run all four mandatory diagnosis queries."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    queries = [
        ("Non-Other sectors", "SELECT COUNT(*) FROM tender_categories WHERE primary_sector != 'Other';"),
        ("Grouped suppliers", "SELECT COUNT(*) FROM supplier_lookup WHERE group_name IS NOT NULL;"),
        ("Buyer intelligence records", "SELECT COUNT(*) FROM buyer_intelligence;"),
        ("Total tenders", "SELECT COUNT(*) FROM tenders;")
    ]
    
    print("🔍 Running mandatory diagnosis queries...")
    print()
    
    for description, sql in queries:
        try:
            cur.execute(sql)
            result = cur.fetchone()[0]
            print(f"✅ {description}: {result:,}")
        except Exception as e:
            print(f"❌ {description}: ERROR - {e}")
    
    cur.close()
    conn.close()
    print()
    print("✅ Diagnosis complete. Ready to proceed with SEO pages implementation.")

if __name__ == "__main__":
    main()