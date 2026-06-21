import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { recordPayment } from '@/lib/targets';
import db from '@/lib/db';

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

    // Auto-match the quarter from the payment date, then record into target_payments.
    const targetQ = db.prepare('SELECT id FROM target_quarters WHERE ? >= start_date AND ? <= end_date LIMIT 1').get(date, date) as { id: string } | undefined;
    const payment = recordPayment(
      member_id,
      targetQ ? targetQ.id : null,
      null,
      amount,
      date,
      method || 'other',
      notes || null,
      member.id
    );

    return NextResponse.json({ ...payment, date: payment.date_paid }, { status: 201 });
  } catch (error) {
    console.error('Contribution record error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
