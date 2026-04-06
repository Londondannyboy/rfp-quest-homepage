import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ found: false });
  }
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not configured');
    return NextResponse.json({ found: false });
  }
  
  const sql = neon(databaseUrl);
  
  try {
    const rows = await sql`
      SELECT pp.user_id, pp.email, pp.company_id, pp.role,
             cp.name as company_name, cp.domain, cp.sectors,
             cp.is_sme, cp.description
      FROM person_profiles pp
      JOIN company_profiles cp ON pp.company_id = cp.id
      WHERE pp.email = ${email}
      LIMIT 1
    `;
    
    if (!rows.length) {
      return NextResponse.json({ found: false });
    }
    
    return NextResponse.json({ found: true, ...rows[0] });
  } catch (error) {
    console.error('Error fetching company context:', error);
    return NextResponse.json({ found: false });
  }
}