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

    // Calculate total contributions
    const totalInResult = db
      .prepare('SELECT SUM(amount) as total FROM contributions')
      .get() as any;
    const total_in = totalInResult?.total || 0;

    // Calculate total expenses
    const totalOutResult = db
      .prepare('SELECT SUM(amount) as total FROM expenses')
      .get() as any;
    const total_out = totalOutResult?.total || 0;

    // Calculate balance
    const balance = total_in - total_out;

    return NextResponse.json({
      total_in: parseFloat(total_in.toFixed(2)),
      total_out: parseFloat(total_out.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
      currency: 'EUR',
    });
  } catch (error) {
    console.error('Fund balance fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
