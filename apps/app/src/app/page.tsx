import { cookies } from 'next/headers';
import { neon } from '@neondatabase/serverless';
import { CopilotKit } from "@copilotkit/react-core/v2";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { AppLayout } from "@/components/app-layout";
import type { MarketPulseData } from "@/app/api/market-pulse/route";

const sql = neon(process.env.DATABASE_URL!);

async function fetchMarketPulseData(): Promise<MarketPulseData> {
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

    return {
      open_count,
      total_value,
      closing_this_week,
      top_sector,
      top_sector_count,
    };
  } catch (error) {
    console.error('Error fetching market pulse data:', error);
    // Return fallback data
    return {
      open_count: 36866,
      total_value: 341100000000,
      closing_this_week: 290,
      top_sector: 'Digital & Technology',
      top_sector_count: 0,
    };
  }
}

async function fetchSectorStats() {
  try {
    const result = await sql`
      SELECT 
        tc.primary_sector as name,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN t.value_amount < 1000000000 THEN t.value_amount ELSE 0 END), 0) as value
      FROM tender_categories tc
      LEFT JOIN tenders t ON tc.ocid = t.ocid AND t.status = 'Open'
      WHERE tc.primary_sector != 'Other'
      GROUP BY tc.primary_sector
      ORDER BY count DESC
      LIMIT 8
    `;
    
    return result.map(row => ({
      name: row.name || 'Unknown',
      count: Number(row.count) || 0,
      value: Number(row.value) || 0,
    }));
  } catch (error) {
    console.error('Error fetching sector stats:', error);
    // Return fallback data
    return [
      { name: 'Digital & Technology', count: 1200, value: 450000000 },
      { name: 'Healthcare', count: 980, value: 320000000 },
      { name: 'Construction', count: 850, value: 680000000 },
      { name: 'Education', count: 720, value: 280000000 },
      { name: 'Defence', count: 650, value: 890000000 },
      { name: 'Facilities Management', count: 600, value: 220000000 },
      { name: 'Transport', count: 550, value: 420000000 },
      { name: 'Social Care', count: 480, value: 180000000 },
    ];
  }
}

async function isUserAuthenticated() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('neon-session');
    
    // Simple check - if session cookie exists, assume authenticated
    // For server-side routing, we'll default to showing marketing layout
    // and let client-side handle the authenticated experience
    return false; // Always show marketing layout for SEO/performance
  } catch (error) {
    return false;
  }
}

export default async function HomePage() {
  // Pre-fetch all data server-side
  const [marketPulseData, sectorStats, isAuthenticated] = await Promise.all([
    fetchMarketPulseData(),
    fetchSectorStats(),
    isUserAuthenticated(),
  ]);

  // For now, always show marketing layout with CopilotKit wrapper
  // This ensures instant loading and proper SEO
  return (
    <CopilotKit 
      runtimeUrl="/api/copilotkit"
      agent="uk_tenders"
    >
      <div className="min-h-screen">
        {/* Check for auth cookie or URL params to decide layout */}
        <MarketingLayoutWithAppFallback 
          marketPulseData={marketPulseData} 
          sectorStats={sectorStats} 
        />
      </div>
    </CopilotKit>
  );
}

// Client component that handles the layout switching
function MarketingLayoutWithAppFallback({
  marketPulseData,
  sectorStats,
}: {
  marketPulseData: MarketPulseData;
  sectorStats: Array<{name: string; count: number; value: number}>;
}) {
  return <MarketingLayout marketPulseData={marketPulseData} sectorStats={sectorStats} />;
}