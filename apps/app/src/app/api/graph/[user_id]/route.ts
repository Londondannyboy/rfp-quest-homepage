import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  const { user_id } = await params;
  
  // For now, we'll return mock data structure that matches what Zep would return
  // In production, this would call the Python agent or Zep API directly
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  
  const sql = neon(databaseUrl);
  
  try {
    // Get user's email from user_id
    const userResult = await sql`
      SELECT email, display_name, company_id
      FROM person_profiles
      WHERE user_id = ${user_id}
      LIMIT 1
    `;
    
    if (!userResult.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = userResult[0];
    
    // For Dan Keegan, return the actual Zep data structure we discovered
    // This would normally come from Zep API
    if (user.email === 'keegan.dan@gmail.com') {
      const nodes = [
        { id: 'dan-keegan', name: 'Dan Keegan', type: 'person', color: '#4A90E2', val: 20 },
        { id: 'gtm-quest', name: 'GTM Quest', type: 'company', color: '#50E3C2', val: 15 },
        { id: 'saas-sector', name: 'SaaS', type: 'sector', color: '#9013FE', val: 10 },
        { id: 'nhs-digital', name: 'NHS Digital', type: 'contract_won', color: '#7ED321', val: 12 },
        { id: 'climatize', name: 'Climatize', type: 'contract_won', color: '#7ED321', val: 8 },
        { id: 'nhs', name: 'NHS', type: 'buyer', color: '#4A90E2', val: 10 },
      ];
      
      const links = [
        { source: 'dan-keegan', target: 'gtm-quest', type: 'WORKS_AT' },
        { source: 'dan-keegan', target: 'saas-sector', type: 'WORKS_IN_SECTOR' },
        { source: 'dan-keegan', target: 'nhs-digital', type: 'WON_CONTRACT', value: 50000 },
        { source: 'dan-keegan', target: 'climatize', type: 'WON_CONTRACT', value: 10000 },
        { source: 'nhs-digital', target: 'nhs', type: 'PROCURED_BY' },
      ];
      
      return NextResponse.json({
        nodes,
        links,
        user: {
          name: user.display_name || user.email,
          email: user.email,
          company_id: user.company_id
        }
      });
    }
    
    // For other users, return a basic graph
    const nodes = [
      { id: user_id, name: user.display_name || user.email, type: 'person', color: '#4A90E2', val: 20 }
    ];
    const links: any[] = [];
    
    // Add company node if user has one
    if (user.company_id) {
      const companyResult = await sql`
        SELECT name FROM company_profiles WHERE id = ${user.company_id}
      `;
      if (companyResult.length) {
        nodes.push({ 
          id: `company-${user.company_id}`, 
          name: companyResult[0].name, 
          type: 'company', 
          color: '#50E3C2', 
          val: 15 
        });
        links.push({ source: user_id, target: `company-${user.company_id}`, type: 'WORKS_AT' });
      }
    }
    
    return NextResponse.json({
      nodes,
      links,
      user: {
        name: user.display_name || user.email,
        email: user.email,
        company_id: user.company_id
      }
    });
    
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return NextResponse.json({ error: 'Failed to fetch graph data' }, { status: 500 });
  }
}