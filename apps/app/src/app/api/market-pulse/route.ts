import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export interface MarketPulseData {
  open_count: number;
  total_value: number;
  closing_this_week: number;
  top_sector: string;
  top_sector_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Open tenders count
    const openCountResult = await sql`
      SELECT COUNT(*) as count FROM tenders WHERE status = 'Open'
    `;
    const open_count = Number(openCountResult[0]?.count) || 0;

    // Total value (capped at £1B to exclude framework ceilings)
    const totalValueResult = await sql`
      SELECT SUM(value_amount) as total FROM tenders 
      WHERE status = 'Open' 
      AND value_amount < 1000000000
    `;
    const total_value = Number(totalValueResult[0]?.total) || 0;

    // Closing this week
    const closingThisWeekResult = await sql`
      SELECT COUNT(*) as count FROM tenders 
      WHERE status = 'Open' 
      AND tender_end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
    `;
    const closing_this_week = Number(closingThisWeekResult[0]?.count) || 0;

    // Top sector
    const topSectorResult = await sql`
      SELECT primary_sector, COUNT(*) as c FROM tender_categories 
      WHERE primary_sector != 'Other' 
      GROUP BY primary_sector 
      ORDER BY c DESC 
      LIMIT 1
    `;
    const top_sector = topSectorResult[0]?.primary_sector || 'Various';
    const top_sector_count = Number(topSectorResult[0]?.c) || 0;

    const data: MarketPulseData = {
      open_count,
      total_value,
      closing_this_week,
      top_sector,
      top_sector_count,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Market pulse API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market pulse data' },
      { status: 500 }
    );
  }
}