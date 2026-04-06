import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '../../../lib/auth/server';
import { neon } from '@neondatabase/serverless';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    // Get session using server-side auth with cookies
    const cookieStore = await cookies();
    
    // Debug: log all available cookies
    const allCookies = cookieStore.getAll();
    console.log('Available cookies:', allCookies.map(c => c.name));
    
    const session = await auth.getSession();
    console.log('Session data:', JSON.stringify(session, null, 2));
    
    // Check if session exists and has user data
    if (!session?.data?.user?.email) {
      console.log('No session or user email found');
      return NextResponse.json({ authenticated: false });
    }

    const email = session.data.user.email;
    console.log('Found user email:', email);
    
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('DATABASE_URL not configured');
      return NextResponse.json({ authenticated: false });
    }
    
    console.log('DATABASE_URL is configured, querying user profile...');

    const sql = neon(databaseUrl);

    try {
      console.log('Executing database query for email:', email);
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
      
      console.log('Database query result:', result);
      
      if (result.length === 0) {
        console.log('No profile found for user, returning authenticated with null profile data');
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
      console.log('Profile found, returning:', row);
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