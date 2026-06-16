import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
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

    // Parse pagination params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination params' }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Get total count (excluding soft-deleted)
    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM contributions WHERE member_id = ? AND deleted_at IS NULL')
      .get(session.member_id) as any;
    const total = countResult?.count || 0;

    // Get contributions (newest first, excluding soft-deleted)
    const items = db
      .prepare(
        'SELECT * FROM contributions WHERE member_id = ? AND deleted_at IS NULL ORDER BY date DESC LIMIT ? OFFSET ?'
      )
      .all(session.member_id, limit, offset) as any[];

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        member_id: item.member_id,
        amount: item.amount,
        date: item.date,
        method: item.method,
        notes: item.notes,
        recorded_by: item.recorded_by,
        created_at: item.created_at,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Contribution history fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
