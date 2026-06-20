import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';
import { randomBytes } from 'crypto';

function requireCommittee(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return { error: 'Unauthorized', status: 401 as const };

  const session = getSessionById(sessionId);
  if (!session) return { error: 'Unauthorized', status: 401 as const };

  const member = getMemberById(session.member_id);
  if (!member || member.role === 'member') {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { member };
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireCommittee(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { land_id, member_id, shares } = await request.json();

    // Validation
    if (!land_id || !member_id || typeof shares !== 'number') {
      return NextResponse.json({ error: 'land_id, member_id, and shares are required' }, { status: 400 });
    }

    if (shares <= 0 || !Number.isInteger(shares)) {
      return NextResponse.json({ error: 'Shares must be a positive integer' }, { status: 400 });
    }

    // Verify land exists
    const land = db.prepare('SELECT * FROM land WHERE id = ?').get(land_id);
    if (!land) {
      return NextResponse.json({ error: 'Land not found' }, { status: 404 });
    }

    // Verify member exists
    const member = getMemberById(member_id);
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const now = Date.now();
    const ownershipId = randomBytes(16).toString('hex');

    // Insert or update ownership
    db.prepare(`
      INSERT INTO land_ownership (id, member_id, land_id, shares, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id, land_id) DO UPDATE SET
        shares = excluded.shares,
        updated_at = excluded.updated_at
    `).run(ownershipId, member_id, land_id, shares, now, now);

    // Calculate total shares and ownership percentage
    const totalShares = db.prepare(`
      SELECT COALESCE(SUM(shares), 0) as total FROM land_ownership WHERE land_id = ?
    `).get(land_id) as { total: number };

    const ownershipPercentage = totalShares.total > 0 ? (shares / totalShares.total) * 100 : 0;

    const ownership = db.prepare(`
      SELECT * FROM land_ownership WHERE member_id = ? AND land_id = ?
    `).get(member_id, land_id) as any;

    return NextResponse.json(
      {
        id: ownership.id,
        member_id: ownership.member_id,
        land_id: ownership.land_id,
        shares: ownership.shares,
        ownership_percentage: Math.round(ownershipPercentage * 100) / 100, // Round to 2 decimals
        created_at: ownership.created_at,
        updated_at: ownership.updated_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Assign ownership error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Get all ownership records
    const ownerships = db.prepare('SELECT * FROM land_ownership').all() as any[];

    return NextResponse.json(
      ownerships.map((o) => {
        // Calculate ownership percentage for each
        const totalShares = db.prepare(`
          SELECT COALESCE(SUM(shares), 0) as total FROM land_ownership WHERE land_id = ?
        `).get(o.land_id) as { total: number };

        const percentage = totalShares.total > 0 ? (o.shares / totalShares.total) * 100 : 0;

        return {
          id: o.id,
          member_id: o.member_id,
          land_id: o.land_id,
          shares: o.shares,
          ownership_percentage: Math.round(percentage * 100) / 100,
          created_at: o.created_at,
          updated_at: o.updated_at,
        };
      })
    );
  } catch (error) {
    console.error('Get ownership error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
