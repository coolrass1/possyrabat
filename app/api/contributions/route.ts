import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import db from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
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

    const { member_id, amount, date, method, notes } = await request.json();

    // Validation
    if (!member_id) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (!date || typeof date !== 'number' || date > Date.now()) {
      return NextResponse.json({ error: 'Date must be in the past' }, { status: 400 });
    }

    // Check member exists
    const targetMember = getMemberById(member_id);
    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Record contribution
    const contribId = randomBytes(16).toString('hex');
    const now = Date.now();

    const insertStmt = db.prepare(
      'INSERT INTO contributions (id, member_id, amount, date, method, notes, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(contribId, member_id, amount, date, method || null, notes || null, member.id, now);

    return NextResponse.json(
      {
        id: contribId,
        member_id,
        amount,
        date,
        method,
        notes,
        recorded_by: member.id,
        created_at: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Contribution record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
