#!/usr/bin/env python3
"""
Test the fixed value calculation for sector pages.
"""
import os
import psycopg2

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
    """Test the fixed sector statistics query."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("🔧 Testing fixed value calculations...")
    print()
    
    # Fixed query matching the updated page.tsx
    fixed_query = """
        SELECT primary_sector as sector_name,
               COUNT(*) as tender_count,
               SUM(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount < 100000000000  -- Less than £100B (exclude framework ceilings)
                 AND t.value_amount != 999999999999  -- Exclude £999B placeholder values
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)  -- Focus on actual contracts/awards
                 THEN t.value_amount 
                 ELSE 0 
               END) as total_value,
               AVG(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount < 100000000000  -- Less than £100B
                 AND t.value_amount != 999999999999  -- Exclude placeholders
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)  -- Focus on actual contracts/awards
                 THEN t.value_amount 
                 ELSE NULL 
               END) as avg_value,
               COUNT(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount < 100000000000
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN 1 
               END) as realistic_value_count
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = %s
        GROUP BY tc.primary_sector
    """
    
    sectors = ['Digital & Technology', 'Healthcare', 'Construction']
    
    for sector in sectors:
        print(f"📊 {sector}:")
        cur.execute(fixed_query, (sector,))
        result = cur.fetchone()
        
        if result:
            sector_name, count, total, avg, realistic_count = result
            print(f"   Total tenders: {count:,}")
            print(f"   With realistic values: {realistic_count:,}")
            print(f"   Fixed total value: £{float(total):,.0f} ({float(total)/1e9:.1f}B)")
            print(f"   Fixed average value: £{float(avg):,.0f}")
            print()
        else:
            print(f"   No data found")
            print()
    
    # Compare with original problematic query
    print("🔍 Original vs Fixed comparison for Digital & Technology:")
    
    original_query = """
        SELECT 
               COUNT(*) as tender_count,
               SUM(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE 0 END) as original_total,
               SUM(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount < 100000000000
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN t.value_amount 
                 ELSE 0 
               END) as fixed_total
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
    """
    
    cur.execute(original_query)
    result = cur.fetchone()
    if result:
        count, original_total, fixed_total = result
        print(f"   Original total: £{float(original_total):,.0f} ({float(original_total)/1e12:.1f}T)")
        print(f"   Fixed total: £{float(fixed_total):,.0f} ({float(fixed_total)/1e9:.1f}B)")
        reduction = ((float(original_total) - float(fixed_total)) / float(original_total)) * 100
        print(f"   Reduction: {reduction:.1f}%")
    
    cur.close()
    conn.close()
    print()
    print("✅ Test complete.")

if __name__ == "__main__":
    main()