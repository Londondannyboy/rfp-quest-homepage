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
    
    // Try to get real Zep data from the agent
    const deploymentUrl = process.env.LANGGRAPH_DEPLOYMENT_URL || 'http://localhost:8123';
    try {
      const agentResponse = await fetch(`${deploymentUrl}/graph/${user_id}`);
      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        if (!agentData.error) {
          return NextResponse.json(agentData);
        }
      }
    } catch (agentError) {
      console.error('Agent graph call failed:', agentError);
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