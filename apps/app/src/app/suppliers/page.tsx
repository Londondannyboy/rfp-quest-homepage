import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, TrendingUp, PoundSterling, Search } from "lucide-react";
import { Pool } from 'pg';

interface SupplierListItem {
  slug: string;
  canonical_name: string;
  group_name: string | null;
  is_strategic_supplier: boolean;
  tender_count: number;
  total_value_gbp: number;
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

async function getTopSuppliers(): Promise<SupplierListItem[]> {
  try {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          sl.canonical_name,
          sl.group_name,
          sl.is_strategic_supplier,
          COUNT(t.ocid) as tender_count,
          SUM(CASE 
            WHEN t.value_amount > 0 
            AND t.value_amount <= 1000000000  
            AND t.value_amount != 999999999999  
            AND (t.stage IN ('contract', 'award') OR t.stage IS NULL)
            THEN t.value_amount 
            ELSE 0 
          END) as total_value_gbp
        FROM supplier_lookup sl
        INNER JOIN tenders t ON sl.raw_name = t.winner
        WHERE sl.canonical_name IS NOT NULL
        GROUP BY sl.canonical_name, sl.group_name, sl.is_strategic_supplier
        HAVING COUNT(t.ocid) >= 20  -- Only suppliers with significant wins (aligned with static generation)
        ORDER BY COUNT(t.ocid) DESC 
        LIMIT 25  -- Reduced to match static generation count
      `;
      
      const result = await client.query(query);
      
      return result.rows.map(row => ({
        slug: slugify(row.canonical_name),
        canonical_name: row.canonical_name,
        group_name: row.group_name,
        is_strategic_supplier: row.is_strategic_supplier || false,
        tender_count: parseInt(row.tender_count),
        total_value_gbp: parseInt(row.total_value_gbp || '0'),
      }));
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
}

export const metadata: Metadata = {
  title: 'UK Government Suppliers | RFP.quest',
  description: 'Discover top 25 UK government suppliers and their contract wins. Track procurement opportunities from major suppliers like Softcat, Insight, WSP, and Computacenter.',
  openGraph: {
    title: 'UK Government Suppliers | RFP.quest',
    description: 'Discover top UK government suppliers and their contract wins. Track procurement opportunities from major suppliers.',
    type: 'website',
    url: 'https://rfp-quest-homepage.vercel.app/suppliers',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UK Government Suppliers | RFP.quest',
    description: 'Discover top UK government suppliers and their contract wins.',
  }
};

export default async function SuppliersPage() {
  const suppliers = await getTopSuppliers();
  
  const totalContracts = suppliers.reduce((sum, s) => sum + s.tender_count, 0);
  const totalValue = suppliers.reduce((sum, s) => sum + s.total_value_gbp, 0);
  const strategicSuppliers = suppliers.filter(s => s.is_strategic_supplier).length;
  
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
              Supplier Directory
            </Badge>
            <span className="text-slate-400">UK Government Contracts</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Government Suppliers
          </h1>
          
          <p className="text-xl text-slate-300 max-w-4xl leading-relaxed">
            Discover the top UK government suppliers and their procurement wins. Track contract opportunities, 
            analyze supplier performance, and understand the competitive landscape.
          </p>
        </div>
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Top Suppliers</CardTitle>
              <Building2 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{suppliers.length}</div>
              <p className="text-xs text-slate-400">Major contractors</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Contracts</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalContracts.toLocaleString()}</div>
              <p className="text-xs text-slate-400">Awarded contracts</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Combined Value</CardTitle>
              <PoundSterling className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">£{(totalValue / 1000000000).toFixed(1)}B</div>
              <p className="text-xs text-slate-400">Contract value</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Strategic Suppliers</CardTitle>
              <Search className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{strategicSuppliers}</div>
              <p className="text-xs text-slate-400">Government designated</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Suppliers Grid */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Top 25 Government Suppliers</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {suppliers.map((supplier, index) => (
              <Link key={supplier.slug} href={`/suppliers/${supplier.slug}`}>
                <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-all duration-200 hover:shadow-lg cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          {supplier.is_strategic_supplier && (
                            <Badge variant="secondary" className="bg-purple-600 text-white">
                              Strategic
                            </Badge>
                          )}
                          {supplier.group_name && (
                            <Badge variant="secondary" className="bg-blue-600 text-white">
                              {supplier.group_name}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl text-white hover:text-green-400 transition-colors">
                          {supplier.canonical_name}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                          {supplier.is_strategic_supplier 
                            ? 'Government designated strategic supplier'
                            : 'Major government contractor'
                          }
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-white">{supplier.tender_count.toLocaleString()}</div>
                        <p className="text-xs text-slate-400">Contracts Won</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">£{(supplier.total_value_gbp / 1000000).toFixed(0)}M</div>
                        <p className="text-xs text-slate-400">Total Value</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-green-900 to-blue-900 border-green-700 mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              Track Supplier Opportunities
            </CardTitle>
            <CardDescription className="text-green-200">
              Use RFP.quest to monitor new opportunities from these suppliers and analyze their bidding patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white">
                Start Tracking Suppliers
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        {/* Other Pages */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-6">Explore More</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/sectors">
              <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Procurement Sectors</div>
                  <p className="text-slate-400 text-sm">Browse by sector and category</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/">
              <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6 text-center">
                  <Search className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-white font-medium">Search Tenders</div>
                  <p className="text-slate-400 text-sm">Find specific opportunities</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}