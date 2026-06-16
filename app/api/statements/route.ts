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

    // Get all statements ordered by date
    const statements = db
      .prepare('SELECT id, year, month, total_in, total_out, balance, created_at FROM statements ORDER BY year DESC, month DESC')
      .all() as any[];

    return NextResponse.json(
      statements.map((s) => ({
        id: s.id,
        year: s.year,
        month: s.month,
        total_in: s.total_in,
        total_out: s.total_out,
        balance: s.balance,
        created_at: s.created_at,
      }))
    );
  } catch (error) {
    console.error('Statements retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
