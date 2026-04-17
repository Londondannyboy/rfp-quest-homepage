#!/usr/bin/env python3
"""
Test the £1B cap fix for sector values.
"""
import os
import psycopg2

def get_db_connection():
    """Get a connection to Neon database."""
    database_url = os.getenv("DATABASE_URL")
    clean_url = database_url.replace(
        "channel_binding=require&", ""
    ).replace("&channel_binding=require", "").replace(
        "channel_binding=require", ""
    )
    return psycopg2.connect(clean_url)

def main():
    """Test the £1B cap fix."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("🔧 Testing £1B cap fix...")
    print()
    
    # Test the updated query with £1B cap
    fixed_query = """
        SELECT primary_sector as sector_name,
               COUNT(*) as tender_count,
               SUM(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount <= 1000000000  -- Cap at £1B
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN t.value_amount 
                 ELSE 0 
               END) as total_value,
               AVG(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount <= 1000000000
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN t.value_amount 
                 ELSE NULL 
               END) as avg_value,
               COUNT(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount <= 1000000000
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN 1 
               END) as realistic_count
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = %s
        GROUP BY tc.primary_sector
    """
    
    sectors = ['Digital & Technology', 'Healthcare', 'Construction', 'Education']
    
    for sector in sectors:
        print(f"📊 {sector}:")
        cur.execute(fixed_query, (sector,))
        result = cur.fetchone()
        
        if result:
            sector_name, total_count, total_value, avg_value, realistic_count = result
            print(f"   Total tenders: {total_count:,}")
            print(f"   With realistic values (≤£1B): {realistic_count:,}")
            print(f"   Total value: £{float(total_value):,.0f} ({float(total_value)/1e9:.1f}B)")
            print(f"   Average value: £{float(avg_value):,.0f}")
            print()
        else:
            print(f"   No data found")
            print()
    
    # Show the dramatic improvement
    print("🎯 Comparison of approaches for Digital & Technology:")
    
    comparison_query = """
        SELECT 
               SUM(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE 0 END) as original_total,
               SUM(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount <= 1000000000
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN t.value_amount 
                 ELSE 0 
               END) as fixed_total
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
    """
    
    cur.execute(comparison_query)
    result = cur.fetchone()
    if result:
        original, fixed = result
        print(f"   Original (no filtering): £{float(original):,.0f} ({float(original)/1e12:.1f}T)")
        print(f"   Fixed (£1B cap + filters): £{float(fixed):,.0f} ({float(fixed)/1e9:.1f}B)")
        reduction = ((float(original) - float(fixed)) / float(original)) * 100
        print(f"   Reduction: {reduction:.1f}%")
        print(f"   Ratio: {float(original) / float(fixed):.1f}x reduction")
    
    cur.close()
    conn.close()
    print()
    print("✅ Test complete. These values look much more realistic!")

if __name__ == "__main__":
    main()