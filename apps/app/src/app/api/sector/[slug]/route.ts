import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Map slug back to sector name
    const sectorMapping: { [key: string]: string } = {
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
    };
    
    const sectorName = sectorMapping[slug];
    if (!sectorName) {
      return NextResponse.json({ error: 'Sector not found' }, { status: 404 });
    }
    
    const client = await pool.connect();
    
    try {
      // Get sector statistics
      const sectorStatsQuery = `
        SELECT primary_sector as sector_name,
               COUNT(*) as tender_count,
               SUM(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE 0 END) as total_value,
               AVG(CASE WHEN t.value_amount > 0 THEN t.value_amount ELSE NULL END) as avg_value
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = $1
        GROUP BY tc.primary_sector
      `;
      
      const statsResult = await client.query(sectorStatsQuery, [sectorName]);
      const stats = statsResult.rows[0];
      
      // Get top buyers
      const buyersQuery = `
        SELECT bl.canonical_name as buyer_name,
               COUNT(*) as tender_count
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        LEFT JOIN buyer_lookup bl ON t.buyer_name = bl.raw_name
        WHERE tc.primary_sector = $1
        AND bl.canonical_name IS NOT NULL
        GROUP BY bl.canonical_name
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `;
      
      const buyersResult = await client.query(buyersQuery, [sectorName]);
      
      // Get top verticals
      const verticalsQuery = `
        SELECT tc.vertical,
               COUNT(*) as tender_count
        FROM tender_categories tc
        WHERE tc.primary_sector = $1
        AND tc.vertical IS NOT NULL
        AND tc.vertical != ''
        GROUP BY tc.vertical
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `;
      
      const verticalsResult = await client.query(verticalsQuery, [sectorName]);
      
      const sectorData = {
        slug,
        sector_name: sectorName,
        tender_count: parseInt(stats?.tender_count || '0'),
        total_value_gbp: parseInt(stats?.total_value || '0'),
        avg_value_gbp: parseInt(stats?.avg_value || '0'),
        top_buyers: buyersResult.rows,
        top_verticals: verticalsResult.rows,
        description: `UK government procurement opportunities in ${sectorName}. ${parseInt(stats?.tender_count || '0').toLocaleString()} tenders from major public sector buyers.`,
        meta_title: `${sectorName} Procurement Opportunities | RFP.quest`,
        meta_description: `Find ${sectorName.toLowerCase()} tenders from UK government buyers. ${parseInt(stats?.tender_count || '0').toLocaleString()} opportunities with intelligent matching and bid analysis.`
      };
      
      return NextResponse.json(sectorData);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error fetching sector data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sector data' },
      { status: 500 }
    );
  }
}