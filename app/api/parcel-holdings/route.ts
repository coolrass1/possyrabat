import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';

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

    const member = getMemberById(session.member_id);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const parcel_count = member.parcel_count || 0;
    const total_m2 = parcel_count * PARCEL_SIZE_M2;

    return NextResponse.json({
      parcel_count,
      parcel_size_m2: PARCEL_SIZE_M2,
      total_m2,
    });
  } catch (error) {
    console.error('Parcel holdings fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
