import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
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

    // Parse query params. Fee falls back to the configured per-parcel fee.
    const url = new URL(request.url);
    const feeParam = url.searchParams.get('fee');
    const fee = feeParam !== null ? parseFloat(feeParam) : getSettings().per_parcel_fee;
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (!Number.isFinite(fee) || fee < 0) {
      return NextResponse.json({ error: 'Fee must be 0 or greater' }, { status: 400 });
    }

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination params' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Roster = every parcel-holder, regardless of role (committee hold parcels too).
    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM members WHERE parcel_count > 0')
      .get() as any;
    const total = countResult?.count || 0;

    // Get parcel-holders sorted by name with pagination
    const members = db
      .prepare(
        'SELECT id, name, email, parcel_count FROM members WHERE parcel_count > 0 ORDER BY name ASC LIMIT ? OFFSET ?'
      )
      .all(limit, offset) as any[];

    // For each member, calculate paid amount and status
    const items = members.map((member) => {
      const paidResult = db
        .prepare('SELECT SUM(amount) as total FROM contributions WHERE member_id = ? AND deleted_at IS NULL')
        .get(member.id) as any;
      const paid = paidResult?.total || 0;

      const obligation = member.parcel_count * fee;
      const balance = paid - obligation;
      const status = balance >= 0 ? 'up to date' : `behind by €${Math.abs(balance)}`;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        parcel_count: member.parcel_count,
        obligation: parseFloat(obligation.toFixed(2)),
        paid: parseFloat(paid.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
        status,
      };
    });

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Open roster fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
