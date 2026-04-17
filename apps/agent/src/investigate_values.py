#!/usr/bin/env python3
"""
Investigate the inflated value calculations in sector pages.
The user reported £3.1T for Digital & Technology and £2T for Healthcare which is implausible.
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
    """Investigate value calculation problems."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("🔍 Investigating value calculation issues...")
    print()
    
    # 1. Check the exact query used in getSectorData
    print("1️⃣ Current sector statistics query for Digital & Technology:")
    sector_query = """
        SELECT primary_sector as sector_name,
               COUNT(*) as tender_count,
               SUM(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE 0 END) as total_value,
               AVG(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE NULL END) as avg_value,
               MAX(t.value_amount) as max_value,
               MIN(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE NULL END) as min_value
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
        GROUP BY tc.primary_sector
    """
    
    cur.execute(sector_query)
    result = cur.fetchone()
    if result:
        sector, count, total, avg, max_val, min_val = result
        print(f"   Sector: {sector}")
        print(f"   Count: {count:,}")
        print(f"   Total: £{float(total):,.0f} ({float(total)/1e12:.1f}T)")
        print(f"   Average: £{float(avg):,.0f}")
        print(f"   Max: £{float(max_val):,.0f}")
        print(f"   Min: £{float(min_val):,.0f}")
    print()
    
    # 2. Check for duplicate OCIDs
    print("2️⃣ Checking for duplicate OCIDs in Digital & Technology:")
    dup_query = """
        SELECT tc.tender_ocid, COUNT(*) as duplicate_count
        FROM tender_categories tc
        WHERE tc.primary_sector = 'Digital & Technology'
        GROUP BY tc.tender_ocid
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
        LIMIT 10
    """
    
    cur.execute(dup_query)
    dups = cur.fetchall()
    if dups:
        print(f"   Found {len(dups)} OCIDs with duplicates:")
        for ocid, dup_count in dups[:5]:
            print(f"   {ocid}: {dup_count} duplicates")
    else:
        print("   ✅ No duplicate OCIDs found")
    print()
    
    # 3. Check value_amount distribution
    print("3️⃣ Value distribution for Digital & Technology:")
    dist_query = """
        SELECT 
            COUNT(*) as count,
            COUNT(CASE WHEN t.value_amount > 0 THEN 1 END) as with_positive_value,
            COUNT(CASE WHEN t.value_amount > 1000000 THEN 1 END) as over_1m,
            COUNT(CASE WHEN t.value_amount > 100000000 THEN 1 END) as over_100m,
            COUNT(CASE WHEN t.value_amount > 1000000000 THEN 1 END) as over_1b
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
    """
    
    cur.execute(dist_query)
    result = cur.fetchone()
    if result:
        total, positive, over_1m, over_100m, over_1b = result
        print(f"   Total tenders: {total:,}")
        print(f"   With positive value: {positive:,}")
        print(f"   Over £1M: {over_1m:,}")
        print(f"   Over £100M: {over_100m:,}")
        print(f"   Over £1B: {over_1b:,}")
    print()
    
    # 4. Check top 10 highest value tenders
    print("4️⃣ Top 10 highest value tenders in Digital & Technology:")
    top_query = """
        SELECT 
            t.ocid,
            t.title,
            t.value_amount,
            t.source,
            t.buyer_name
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = 'Digital & Technology'
        AND t.value_amount > 0
        ORDER BY t.value_amount DESC
        LIMIT 10
    """
    
    cur.execute(top_query)
    top_tenders = cur.fetchall()
    for i, (ocid, title, value, source, buyer) in enumerate(top_tenders, 1):
        print(f"   {i}. £{value:,.0f} - {title[:60]}...")
        print(f"      OCID: {ocid}, Source: {source}")
        print(f"      Buyer: {buyer}")
        print()
    
    # 5. Compare with Healthcare
    print("5️⃣ Healthcare sector for comparison:")
    cur.execute(sector_query.replace("Digital & Technology", "Healthcare"))
    result = cur.fetchone()
    if result:
        sector, count, total, avg, max_val, min_val = result
        print(f"   Healthcare Total: £{float(total):,.0f} ({float(total)/1e12:.1f}T)")
        print(f"   Healthcare Count: {count:,}")
        print(f"   Healthcare Average: £{float(avg):,.0f}")
    print()
    
    # 6. Check if we're double-counting across tender_categories
    print("6️⃣ Checking tender_categories structure:")
    structure_query = """
        SELECT 
            COUNT(*) as total_category_rows,
            COUNT(DISTINCT tender_ocid) as unique_ocids
        FROM tender_categories tc
        WHERE tc.primary_sector = 'Digital & Technology'
    """
    
    cur.execute(structure_query)
    result = cur.fetchone()
    if result:
        total_rows, unique_ocids = result
        print(f"   Total category rows: {total_rows:,}")
        print(f"   Unique OCIDs: {unique_ocids:,}")
        if total_rows > unique_ocids:
            print(f"   ⚠️  PROBLEM: {total_rows - unique_ocids:,} duplicate OCID entries!")
            print(f"   This means we're counting the same tender value multiple times!")
        else:
            print(f"   ✅ No duplicate OCID entries")
    
    cur.close()
    conn.close()
    print()
    print("✅ Investigation complete.")

if __name__ == "__main__":
    main()