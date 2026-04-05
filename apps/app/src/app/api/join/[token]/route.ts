import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { user_id } = await request.json();

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const sql = neon(databaseUrl);

  // Find the invitation
  const invitations = await sql`
    SELECT id, company_id, email, role, accepted, expires_at
    FROM team_invitations
    WHERE token = ${token}
  `;

  if (invitations.length === 0) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  const invite = invitations[0];

  if (invite.accepted) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
  }

  // Create person_profiles row and link to company
  await sql`
    INSERT INTO person_profiles (user_id, company_id, role, display_name, email)
    VALUES (${user_id}, ${invite.company_id}, ${invite.role}, ${invite.email}, ${invite.email})
    ON CONFLICT (user_id) DO UPDATE SET
      company_id = ${invite.company_id},
      role = ${invite.role}
  `;

  // Mark invitation as accepted
  await sql`
    UPDATE team_invitations SET accepted = true WHERE id = ${invite.id}
  `;

  return NextResponse.json({ success: true, company_id: invite.company_id });
}
