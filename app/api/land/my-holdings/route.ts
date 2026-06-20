import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
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

    // Get all land holdings for this member
    const holdings = db.prepare(`
      SELECT l.*, lo.shares, lo.id as ownership_id, lo.created_at as ownership_created_at
      FROM land l
      JOIN land_ownership lo ON l.id = lo.land_id
      WHERE lo.member_id = ?
    `).all(session.member_id) as any[];

    return NextResponse.json(
      holdings.map((h) => {
        // Calculate ownership percentage
        const totalShares = db.prepare(`
          SELECT COALESCE(SUM(shares), 0) as total FROM land_ownership WHERE land_id = ?
        `).get(h.id) as { total: number };

        const percentage = totalShares.total > 0 ? (h.shares / totalShares.total) * 100 : 0;

        return {
          land: {
            id: h.id,
            name: h.name,
            location: h.location,
            area: h.area,
            created_at: h.created_at,
          },
          shares: h.shares,
          ownership_percentage: Math.round(percentage * 100) / 100,
          ownership_id: h.ownership_id,
          ownership_created_at: h.ownership_created_at,
        };
      })
    );
  } catch (error) {
    console.error('Get my holdings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
