import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { listAllPayments, recordPayment } from '@/lib/targets';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payments = listAllPayments();
    return NextResponse.json(payments);
  } catch (error) {
    console.error('List payments error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const actor = getMemberById(session.member_id);
  if (!actor || actor.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { member_id, quarter_id, month_id, amount, date_paid, method, notes } = await request.json();
    if (!member_id || !quarter_id || !amount || !date_paid || !method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payment = recordPayment(
      member_id,
      quarter_id,
      month_id || null,
      Number(amount),
      Number(date_paid),
      method,
      notes || null,
      session.member_id
    );

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
