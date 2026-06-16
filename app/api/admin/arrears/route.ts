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
    if (!member || member.role === 'member') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { per_parcel_fee, currency } = getSettings();

    // Every parcel-holding member (committee included — they hold parcels too)
    const members = db
      .prepare('SELECT id, name, email, parcel_count FROM members ORDER BY name ASC')
      .all() as any[];

    const items: any[] = [];
    let total_owed = 0;

    for (const m of members) {
      const paidResult = db
        .prepare('SELECT SUM(amount) as total FROM contributions WHERE member_id = ? AND deleted_at IS NULL')
        .get(m.id) as any;
      const paid = paidResult?.total || 0;
      const obligation = (m.parcel_count || 0) * per_parcel_fee;
      const owed = obligation - paid;

      if (owed > 0) {
        items.push({
          id: m.id,
          name: m.name,
          email: m.email,
          parcel_count: m.parcel_count,
          obligation: parseFloat(obligation.toFixed(2)),
          paid: parseFloat(paid.toFixed(2)),
          owed: parseFloat(owed.toFixed(2)),
        });
        total_owed += owed;
      }
    }

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
