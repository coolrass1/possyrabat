import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import db from '@/lib/db';

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

    const { getMemberStanding } = await import('@/lib/targets');
    const standings = getMemberStanding(member.id);

    const obligation = standings.reduce((sum, s) => sum + s.obligation, 0);
    const paid = standings.reduce((sum, s) => sum + s.paid, 0);
    const balance = paid - obligation;
    const status = balance >= 0 ? 'up to date' : `behind by €${Math.abs(balance)}`;

    const { currency } = getSettings();

    return NextResponse.json({
      parcel_count: member.parcel_count || 0,
      per_parcel_fee: 50,
      obligation: parseFloat(obligation.toFixed(2)),
      paid: parseFloat(paid.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
      status,
      currency,
    });
  } catch (error) {
    console.error('My standing fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
