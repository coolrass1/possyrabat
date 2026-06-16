import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { getArrearsReport } from '@/lib/arrears';
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
    if (!member || member.role === 'member') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { currency } = getSettings();

    // Get arrears report with only members who have arrears
    const report = await getArrearsReport({ arrearOnly: true, sortBy: 'arrears' });

    // Format for response
    const items = report.map((row) => ({
      id: row.member_id,
      name: row.name,
      parcel_count: row.parcels,
      obligation: parseFloat(row.obligation.toFixed(2)),
      paid: parseFloat(row.paid.toFixed(2)),
      owed: parseFloat(row.arrears.toFixed(2)),
      status: row.status,
    }));

    const total_owed = items.reduce((sum, item) => sum + item.owed, 0);

    return NextResponse.json({
      items,
      total_owed: parseFloat(total_owed.toFixed(2)),
      currency,
    });
  } catch (error) {
    console.error('Arrears fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
