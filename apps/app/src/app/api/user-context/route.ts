import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../lib/auth/server';
import { neon } from '@neondatabase/serverless';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // Get session using server-side auth
    const session = await auth.getSession();
    
    // Check if session exists and has user data
    if (!session?.data?.user?.email) {
      return NextResponse.json({ authenticated: false });
    }

    const email = session.data.user.email;
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('DATABASE_URL not configured');
      return NextResponse.json({ authenticated: false });
    }

    const sql = neon(databaseUrl);

    try {
      const result = await sql`
        SELECT 
          pp.user_id, 
          pp.email, 
          pp.company_id, 
          cp.name as company_name 
        FROM person_profiles pp 
        LEFT JOIN company_profiles cp ON pp.company_id = cp.id 
        WHERE pp.email = ${email}
      `;
      
      if (result.length === 0) {
        // User is authenticated but has no profile yet
        return NextResponse.json({
          authenticated: true,
          email: email,
          user_id: null,
          company_id: null,
          company_name: null
        });
      }

      const row = result[0];
      return NextResponse.json({
        authenticated: true,
        email: row.email,
        user_id: row.user_id,
        company_id: row.company_id,
        company_name: row.company_name
      });

    } catch (dbError) {
      console.error('Database error in user-context:', dbError);
      // Return authenticated status even if DB query fails
      return NextResponse.json({
        authenticated: true,
        email: email,
        user_id: null,
        company_id: null,
        company_name: null
      });
    }

  } catch (error) {
    console.error('Error getting user context:', error);
    return NextResponse.json({ authenticated: false });
  }
}