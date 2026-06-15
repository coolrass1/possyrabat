import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import db from '@/lib/db';

const PARCEL_SIZE_M2 = 300;

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all members with parcel counts
    const members = db
      .prepare(
        'SELECT id, email, name, parcel_count FROM members ORDER BY name ASC'
      )
      .all();

    const result = (members as any[]).map((member) => ({
      id: member.id,
      email: member.email,
      name: member.name,
      parcel_count: member.parcel_count || 0,
      total_m2: (member.parcel_count || 0) * PARCEL_SIZE_M2,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('All parcel holdings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
