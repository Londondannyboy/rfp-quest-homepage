#!/usr/bin/env python3
"""
Check what value-related fields are available in the tenders table
to understand how to fix the inflated calculations.
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
    """Check value fields in tenders table."""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("🔍 Checking value-related fields in tenders table...")
    print()
    
    # 1. Check schema for value fields
    schema_query = """
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'tenders' 
        AND column_name LIKE '%value%'
        ORDER BY ordinal_position
    """
    
    cur.execute(schema_query)
    columns = cur.fetchall()
    print("📋 Value-related columns in tenders table:")
    for col_name, data_type, nullable in columns:
        print(f"   {col_name} ({data_type}) - nullable: {nullable}")
    print()
    
    # 2. Sample a few tenders to see what's in the value fields
    sample_query = """
        SELECT 
            ocid,
            title,
            value_amount,
            value_max,
            value_currency,
            source,
            procedure_type,
            stage,
            buyer_name
        FROM tenders 
        WHERE value_amount > 1000000000  -- Over £1B
        ORDER BY value_amount DESC
        LIMIT 5
    """
    
    cur.execute(sample_query)
    samples = cur.fetchall()
    print("🔍 Sample high-value tenders:")
    for ocid, title, value_amount, value_max, currency, source, proc_type, stage, buyer in samples:
        print(f"   OCID: {ocid}")
        print(f"   Title: {title[:80]}...")
        print(f"   value_amount: £{float(value_amount):,.0f}")
        print(f"   value_max: {value_max}")
        print(f"   currency: {currency}")
        print(f"   source: {source}")
        print(f"   procedure_type: {proc_type}")
        print(f"   stage: {stage}")
        print(f"   buyer: {buyer}")
        print()
    
    # 3. Check distribution of procedure types and stages
    print("📊 Distribution by stage and procedure type:")
    dist_query = """
        SELECT 
            stage,
            COUNT(*) as count,
            AVG(CASE WHEN value_amount > 0 THEN value_amount END) as avg_value,
            MAX(value_amount) as max_value
        FROM tenders
        WHERE value_amount > 0
        GROUP BY stage
        ORDER BY avg_value DESC
    """
    
    cur.execute(dist_query)
    stage_dist = cur.fetchall()
    for stage, count, avg_val, max_val in stage_dist:
        print(f"   {stage}: {count:,} tenders, avg £{float(avg_val):,.0f}, max £{float(max_val):,.0f}")
    print()
    
    # 4. Check if there's a pattern with frameworks
    framework_query = """
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN title ILIKE '%framework%' THEN 1 END) as framework_count,
            AVG(CASE WHEN title ILIKE '%framework%' AND value_amount > 0 THEN value_amount END) as framework_avg,
            AVG(CASE WHEN title NOT ILIKE '%framework%' AND value_amount > 0 THEN value_amount END) as non_framework_avg
        FROM tenders
        WHERE value_amount > 0
    """
    
    cur.execute(framework_query)
    result = cur.fetchone()
    if result:
        total, framework_count, framework_avg, non_framework_avg = result
        print("🏗️ Framework vs Non-Framework Analysis:")
        print(f"   Total tenders with value: {total:,}")
        print(f"   Framework tenders: {framework_count:,}")
        print(f"   Framework avg value: £{float(framework_avg):,.0f}")
        print(f"   Non-framework avg value: £{float(non_framework_avg):,.0f}")
    
    cur.close()
    conn.close()
    print()
    print("✅ Analysis complete.")

if __name__ == "__main__":
    main()