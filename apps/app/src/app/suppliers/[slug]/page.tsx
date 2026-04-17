import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, Users, PoundSterling, Award, Target } from "lucide-react";
import { Pool } from 'pg';

interface SupplierData {
  slug: string;
  canonical_name: string;
  group_name: string | null;
  is_strategic_supplier: boolean;
  tender_count: number;
  total_value_gbp: number;
  avg_value_gbp: number;
  top_buyers: Array<{ buyer_name: string; tender_count: number }>;
  top_sectors: Array<{ sector: string; tender_count: number }>;
  description: string;
  meta_title: string;
  meta_description: string;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function getSupplierData(slug: string): Promise<SupplierData | null> {
  try {
    const client = await pool.connect();
    
    try {
      // First, find the supplier by slug
      const supplierQuery = `
        SELECT canonical_name, group_name, is_strategic_supplier
        FROM supplier_lookup 
        WHERE canonical_name IS NOT NULL
      `;
      
      const allSuppliersResult = await client.query(supplierQuery);
      const supplier = allSuppliersResult.rows.find(row => 
        slugify(row.canonical_name) === slug
      );
      
      if (!supplier) {
        return null;
      }
      
      // Get supplier statistics with corrected value filtering
      const statsQuery = `
        SELECT 
          COUNT(t.ocid) as tender_count,
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
        FROM supplier_lookup sl
        INNER JOIN tenders t ON sl.raw_name = t.winner
        WHERE sl.canonical_name = $1
      `;
      
      const statsResult = await client.query(statsQuery, [supplier.canonical_name]);
      const stats = statsResult.rows[0];
      
      if (!stats || stats.tender_count === '0') {
        return null;
      }
      
      // Get top buyers for this supplier
      const buyersQuery = `
        SELECT bl.canonical_name as buyer_name,
               COUNT(*) as tender_count
        FROM supplier_lookup sl
        INNER JOIN tenders t ON sl.raw_name = t.winner
        LEFT JOIN buyer_lookup bl ON t.buyer_name = bl.raw_name
        WHERE sl.canonical_name = $1
        AND bl.canonical_name IS NOT NULL
        GROUP BY bl.canonical_name
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `;
      
      const buyersResult = await client.query(buyersQuery, [supplier.canonical_name]);
      
      // Get top sectors for this supplier
      const sectorsQuery = `
        SELECT tc.primary_sector as sector,
               COUNT(*) as tender_count
        FROM supplier_lookup sl
        INNER JOIN tenders t ON sl.raw_name = t.winner
        LEFT JOIN tender_categories tc ON t.ocid = tc.tender_ocid
        WHERE sl.canonical_name = $1
        AND tc.primary_sector IS NOT NULL
        AND tc.primary_sector != ''
        GROUP BY tc.primary_sector
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `;
      
      const sectorsResult = await client.query(sectorsQuery, [supplier.canonical_name]);
      
      const supplierData: SupplierData = {
        slug,
        canonical_name: supplier.canonical_name,
        group_name: supplier.group_name,
        is_strategic_supplier: supplier.is_strategic_supplier || false,
        tender_count: parseInt(stats?.tender_count || '0'),
        total_value_gbp: parseInt(stats?.total_value || '0'),
        avg_value_gbp: parseInt(stats?.avg_value || '0'),
        top_buyers: buyersResult.rows,
        top_sectors: sectorsResult.rows,
        description: `${supplier.canonical_name} is a ${supplier.is_strategic_supplier ? 'strategic' : 'key'} supplier to UK government, winning ${parseInt(stats?.tender_count || '0').toLocaleString()} public sector contracts${supplier.group_name ? ` as part of ${supplier.group_name} group` : ''}.`,
        meta_title: `${supplier.canonical_name} - UK Government Contracts | RFP.quest`,
        meta_description: `Track ${supplier.canonical_name}'s UK government contracts and procurement wins. ${parseInt(stats?.tender_count || '0').toLocaleString()} awarded tenders with detailed contract analysis.`
      };
      
      return supplierData;
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error fetching supplier data:', error);
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const client = await pool.connect();
    
    try {
      // Get top 100 suppliers by tender count for static generation
      const query = `
        SELECT sl.canonical_name
        FROM supplier_lookup sl
        INNER JOIN (
          SELECT sl2.canonical_name, COUNT(t.ocid) as tender_count
          FROM supplier_lookup sl2
          INNER JOIN tenders t ON sl2.raw_name = t.winner
          WHERE sl2.canonical_name IS NOT NULL
          GROUP BY sl2.canonical_name
          HAVING COUNT(t.ocid) >= 5  -- Only suppliers with 5+ wins
          ORDER BY COUNT(t.ocid) DESC
          LIMIT 100
        ) top_suppliers ON sl.canonical_name = top_suppliers.canonical_name
        GROUP BY sl.canonical_name
        ORDER BY sl.canonical_name
      `;
      
      const result = await client.query(query);
      
      return result.rows.map((row) => ({
        slug: slugify(row.canonical_name),
      }));
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating static params for suppliers:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supplierData = await getSupplierData(slug);
  
  if (!supplierData) {
    return {
      title: 'Supplier Not Found | RFP.quest',
      description: 'The requested government supplier was not found.',
    };
  }
  
  return {
    title: supplierData.meta_title,
    description: supplierData.meta_description,
    openGraph: {
      title: supplierData.meta_title,
      description: supplierData.meta_description,
      type: 'website',
      url: `https://rfp-quest-homepage.vercel.app/suppliers/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: supplierData.meta_title,
      description: supplierData.meta_description,
    }
  };
}

export default async function SupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supplierData = await getSupplierData(slug);
  
  if (!supplierData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">Supplier Not Found</h1>
          <p className="text-slate-300 mb-8">The requested government supplier was not found.</p>
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
            <Badge variant="secondary" className="bg-green-600 text-white">
              Government Supplier
            </Badge>
            {supplierData.is_strategic_supplier && (
              <Badge variant="secondary" className="bg-purple-600 text-white">
                Strategic Supplier
              </Badge>
            )}
            {supplierData.group_name && (
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {supplierData.group_name} Group
              </Badge>
            )}
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            {supplierData.canonical_name}
          </h1>
          
          <p className="text-xl text-slate-300 max-w-4xl leading-relaxed">
            {supplierData.description}
          </p>
        </div>
        
        {/* Key Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Contracts Won</CardTitle>
              <Award className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{supplierData.tender_count.toLocaleString()}</div>
              <p className="text-xs text-slate-400">Government contracts</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Value</CardTitle>
              <PoundSterling className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">£{(supplierData.total_value_gbp / 1000000).toFixed(0)}M</div>
              <p className="text-xs text-slate-400">Contract value won</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Average Value</CardTitle>
              <Target className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">£{(supplierData.avg_value_gbp / 1000).toFixed(0)}K</div>
              <p className="text-xs text-slate-400">Per contract</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Top Sectors</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{supplierData.top_sectors.length}</div>
              <p className="text-xs text-slate-400">Active sectors</p>
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
                Organizations that most frequently award contracts to {supplierData.canonical_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierData.top_buyers.map((buyer, index) => (
                  <div key={buyer.buyer_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-white font-medium">{buyer.buyer_name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {buyer.tender_count.toLocaleString()} contracts
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Top Sectors */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Key Sectors
              </CardTitle>
              <CardDescription className="text-slate-400">
                Procurement sectors where {supplierData.canonical_name} wins most contracts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierData.top_sectors.map((sector, index) => (
                  <div key={sector.sector} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <Link href={`/sectors/${sector.sector.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                        <span className="text-white font-medium hover:text-green-400 transition-colors">
                          {sector.sector}
                        </span>
                      </Link>
                    </div>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {sector.tender_count.toLocaleString()}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-green-900 to-blue-900 border-green-700 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              Track {supplierData.canonical_name} Opportunities
            </CardTitle>
            <CardDescription className="text-green-200">
              Monitor new contracts and opportunities for {supplierData.canonical_name} using RFP.quest's intelligent tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                Start Tracking Contracts
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Other Suppliers */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-6">Other Government Suppliers</h3>
          <p className="text-slate-400 mb-4">
            Explore other major suppliers winning UK government contracts
          </p>
          <Link href="/suppliers">
            <Button variant="outline" size="lg">
              View All Suppliers
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}