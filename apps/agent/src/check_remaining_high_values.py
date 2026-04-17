#!/usr/bin/env python3
"""
Check what high values remain after our initial filtering.
"""
import os
import psycopg2

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
    """Check what high values remain after filtering."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("🔍 Checking remaining high values after filtering...")
    print()
    
    # Check values that pass our current filter but are still very high
    high_values_query = """
        SELECT 
            t.ocid,
            t.title,
            t.value_amount,
            t.source,
            t.stage,
            t.buyer_name
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
        AND t.value_amount > 0 
        AND t.value_amount < 100000000000  -- Our current filter
        AND t.value_amount != 999999999999  
        AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
        AND t.value_amount > 1000000000  -- Still over £1B
        ORDER BY t.value_amount DESC
        LIMIT 20
    """
    
    cur.execute(high_values_query)
    high_values = cur.fetchall()
    
    if high_values:
        print("🚨 High values still passing the filter (over £1B):")
        for ocid, title, value, source, stage, buyer in high_values:
            print(f"   £{float(value):,.0f} - {title[:60]}...")
            print(f"      Stage: {stage}, Source: {source}")
            print(f"      Buyer: {buyer}")
            print()
    
    # Check distribution after our filter
    print("📊 Value distribution after current filter:")
    dist_query = """
        SELECT 
            CASE 
                WHEN t.value_amount < 1000 THEN 'Under £1K'
                WHEN t.value_amount < 10000 THEN '£1K-£10K'
                WHEN t.value_amount < 100000 THEN '£10K-£100K'
                WHEN t.value_amount < 1000000 THEN '£100K-£1M'
                WHEN t.value_amount < 10000000 THEN '£1M-£10M'
                WHEN t.value_amount < 100000000 THEN '£10M-£100M'
                WHEN t.value_amount < 1000000000 THEN '£100M-£1B'
                ELSE 'Over £1B'
            END as value_range,
            COUNT(*) as count,
            SUM(t.value_amount) as total_in_range
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
        AND t.value_amount > 0 
        AND t.value_amount < 100000000000
        AND t.value_amount != 999999999999
        AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
        GROUP BY 
            CASE 
                WHEN t.value_amount < 1000 THEN 'Under £1K'
                WHEN t.value_amount < 10000 THEN '£1K-£10K'
                WHEN t.value_amount < 100000 THEN '£10K-£100K'
                WHEN t.value_amount < 1000000 THEN '£100K-£1M'
                WHEN t.value_amount < 10000000 THEN '£1M-£10M'
                WHEN t.value_amount < 100000000 THEN '£10M-£100M'
                WHEN t.value_amount < 1000000000 THEN '£100M-£1B'
                ELSE 'Over £1B'
            END
        ORDER BY MIN(t.value_amount)
    """
    
    cur.execute(dist_query)
    distribution = cur.fetchall()
    
    total_filtered_value = 0
    for value_range, count, total_range in distribution:
        total_filtered_value += float(total_range)
        print(f"   {value_range:15} {count:7,} tenders  £{float(total_range):13,.0f} ({float(total_range)/total_filtered_value*100:.1f}%)")
    
    print(f"\n   Total after filter: £{total_filtered_value:,.0f}")
    
    # Check if we should cap at £10B instead of £100B
    print("\n🔧 Testing with £10B cap instead of £100B:")
    
    capped_query = """
        SELECT 
               SUM(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount < 10000000000  -- £10B cap instead of £100B
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN t.value_amount 
                 ELSE 0 
               END) as total_10b_cap,
               COUNT(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount < 10000000000
                 AND t.value_amount != 999999999999
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
                 THEN 1 
               END) as count_10b_cap
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
    """
    
    cur.execute(capped_query)
    result = cur.fetchone()
    if result:
        total_10b, count_10b = result
        print(f"   With £10B cap: £{float(total_10b):,.0f} ({float(total_10b)/1e9:.1f}B) from {count_10b:,} tenders")
        avg_10b = float(total_10b) / count_10b if count_10b > 0 else 0
        print(f"   Average: £{avg_10b:,.0f}")
    
    cur.close()
    conn.close()
    print("\n✅ Analysis complete.")

if __name__ == "__main__":
    main()