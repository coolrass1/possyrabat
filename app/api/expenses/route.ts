import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import db from '@/lib/db';
import { randomBytes } from 'crypto';

const VALID_AIMS = ['court_case', 'construction', 'security', 'general'];

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

    const { description, amount, aim, date, receipt_url } = await request.json();

    // Validation
    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    if (!VALID_AIMS.includes(aim)) {
      return NextResponse.json({ error: `Invalid aim. Must be one of: ${VALID_AIMS.join(', ')}` }, { status: 400 });
    }

    if (!date || typeof date !== 'number' || date > Date.now()) {
      return NextResponse.json({ error: 'Date must be in the past' }, { status: 400 });
    }

    // Record expense
    const expenseId = randomBytes(16).toString('hex');
    const now = Date.now();

    const insertStmt = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, receipt_url, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(expenseId, description, amount, aim, date, receipt_url || null, member.id, now);

    // Log to audit trail
    await createAuditLog({
      entity_type: 'expense',
      entity_id: expenseId,
      action: 'created',
      before_values: null,
      after_values: { description, amount, aim, date, receipt_url: receipt_url || null },
      performed_by: member.id,
    });

    return NextResponse.json(
      {
        id: expenseId,
        description,
        amount,
        aim,
        date,
        receipt_url,
        recorded_by: member.id,
        created_at: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Expense record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
