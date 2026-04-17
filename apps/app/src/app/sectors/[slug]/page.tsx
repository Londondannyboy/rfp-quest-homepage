import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Users, PoundSterling } from "lucide-react";
import { Pool } from 'pg';

interface SectorData {
  slug: string;
  sector_name: string;
  tender_count: number;
  total_value_gbp: number;
  avg_value_gbp: number;
  top_buyers: Array<{ buyer_name: string; tender_count: number }>;
  top_verticals: Array<{ vertical: string; tender_count: number }>;
  description: string;
  meta_title: string;
  meta_description: string;
}

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getSectorData(slug: string): Promise<SectorData | null> {
  try {
    const sectorName = sectorMapping[slug];
    if (!sectorName) {
      return null;
    }
    
    const client = await pool.connect();
    
    try {
      // Get sector statistics - filter out problematic values
      const sectorStatsQuery = `
        SELECT primary_sector as sector_name,
               COUNT(*) as tender_count,
               SUM(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount <= 1000000000  -- Cap at £1B (exclude framework ceilings)
                 AND t.value_amount != 999999999999  -- Exclude £999B placeholder values
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)  -- Focus on actual contracts/awards
                 THEN t.value_amount 
                 ELSE 0 
               END) as total_value,
               AVG(CASE 
                 WHEN t.value_amount > 0 
                 AND t.value_amount <= 1000000000  -- Cap at £1B
                 AND t.value_amount != 999999999999  -- Exclude placeholders
                 AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)  -- Focus on actual contracts/awards
                 THEN t.value_amount 
                 ELSE NULL 
               END) as avg_value
        FROM tender_categories tc
        LEFT JOIN tenders t ON tc.tender_ocid = t.ocid
        WHERE tc.primary_sector = $1
        GROUP BY tc.primary_sector
      `;
      
      const statsResult = await client.query(sectorStatsQuery, [sectorName]);
      const stats = statsResult.rows[0];
      
      if (!stats) {
        return null;
      }
      
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
      
      const sectorData: SectorData = {
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
      
      return sectorData;
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error fetching sector data:', error);
    return null;
  }
}

// Use ISR to avoid build-time DB connection issues
export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  // Return empty array - pages will be generated on-demand with ISR
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sectorData = await getSectorData(slug);
  
  if (!sectorData) {
    return {
      title: 'Sector Not Found | RFP.quest',
      description: 'The requested procurement sector was not found.',
    };
  }
  
  return {
    title: sectorData.meta_title,
    description: sectorData.meta_description,
    openGraph: {
      title: sectorData.meta_title,
      description: sectorData.meta_description,
      type: 'website',
      url: `https://rfp-quest-homepage.vercel.app/sectors/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: sectorData.meta_title,
      description: sectorData.meta_description,
    }
  };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sectorData = await getSectorData(slug);
  
  if (!sectorData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">Sector Not Found</h1>
          <p className="text-slate-300 mb-8">The requested procurement sector was not found.</p>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <div className="border-b border-slate-700">
        <div className="container mx-auto max-w-7xl p-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-blue-400">
              RFP.quest
            </Link>
            <Link href="/">
              <Button variant="outline">Back to Search</Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto max-w-7xl p-6">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="secondary" className="bg-blue-600 text-white">
              Procurement Sector
            </Badge>
            <span className="text-slate-400">UK Government Opportunities</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {sectorData.sector_name}
          </h1>
          
          <p className="text-xl text-slate-300 max-w-4xl leading-relaxed">
            {sectorData.description}
          </p>
        </div>
        
        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Tenders</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{sectorData.tender_count.toLocaleString()}</div>
              <p className="text-xs text-slate-400">Active opportunities</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Value</CardTitle>
              <PoundSterling className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">£{(sectorData.total_value_gbp / 1000000000).toFixed(1)}B</div>
              <p className="text-xs text-slate-400">Combined contract value</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Average Value</CardTitle>
              <PoundSterling className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">£{(sectorData.avg_value_gbp / 1000).toFixed(0)}K</div>
              <p className="text-xs text-slate-400">Per contract</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Top Buyers</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{sectorData.top_buyers.length}</div>
              <p className="text-xs text-slate-400">Active organizations</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Top Buyers */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-400" />
                Top Buyers
              </CardTitle>
              <CardDescription className="text-slate-400">
                Organizations with the most {sectorData.sector_name.toLowerCase()} tenders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorData.top_buyers.map((buyer, index) => (
                  <div key={buyer.buyer_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-white font-medium">{buyer.buyer_name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {buyer.tender_count.toLocaleString()} tenders
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Top Verticals */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Top Sub-Sectors
              </CardTitle>
              <CardDescription className="text-slate-400">
                Most common procurement categories in {sectorData.sector_name.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorData.top_verticals.map((vertical, index) => (
                  <div key={vertical.vertical} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-between text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-white font-medium">{vertical.vertical}</span>
                    </div>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {vertical.tender_count.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-blue-900 to-cyan-900 border-blue-700 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              Start Finding {sectorData.sector_name} Opportunities
            </CardTitle>
            <CardDescription className="text-blue-200">
              Use RFP.quest's AI-powered tender matching to find relevant opportunities in {sectorData.sector_name.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Search {sectorData.sector_name} Tenders
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Other Sectors */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-6">Other Procurement Sectors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(sectorMapping)
              .filter(([s]) => s !== slug)
              .slice(0, 8)
              .map(([slug, name]) => (
                <Link key={slug} href={`/sectors/${slug}`}>
                  <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <div className="text-white font-medium">{name}</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}