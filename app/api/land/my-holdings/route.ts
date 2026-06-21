import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { getMemberLandHoldings } from '@/lib/land';

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

    const holdings = getMemberLandHoldings(session.member_id);

    return NextResponse.json(
      holdings.map((h) => ({
        land: h.land,
        shares: h.shares,
        ownership_percentage: h.ownership_percentage,
        surface: h.surface,
      }))
    );
  } catch (error) {
    console.error('Get my holdings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
