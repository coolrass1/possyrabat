import { NextRequest, NextResponse } from 'next/server';
import { getSessionById } from '@/lib/auth';
import db from '@/lib/db';

const AIMS = ['court_case', 'construction', 'security', 'general'];

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

    const ledger: Record<string, any> = {};
    let total = 0;

    // Get spending for each aim (excluding soft-deleted)
    for (const aim of AIMS) {
      const result = db
        .prepare('SELECT SUM(amount) as total FROM expenses WHERE aim = ? AND deleted_at IS NULL')
        .get(aim) as any;
      const amount = result?.total || 0;
      ledger[aim] = parseFloat(amount.toFixed(2));
      total += amount;
    }

    // Per-aim percentages of total spending
    const percentages: Record<string, number> = {};
    for (const aim of AIMS) {
      percentages[aim] = total > 0 ? parseFloat(((ledger[aim] / total) * 100).toFixed(2)) : 0;
    }

    // Itemized line items, newest first
    const items = (
      db
        .prepare(
          'SELECT id, description, amount, aim, date, receipt_url, recorded_by FROM expenses WHERE deleted_at IS NULL ORDER BY date DESC'
        )
        .all() as any[]
    ).map((e) => ({
      id: e.id,
      description: e.description,
      amount: e.amount,
      aim: e.aim,
      date: e.date,
      receipt_url: e.receipt_url,
      recorded_by: e.recorded_by,
    }));

    ledger.total = parseFloat(total.toFixed(2));
    ledger.currency = 'EUR';
    ledger.percentages = percentages;
    ledger.items = items;

    return NextResponse.json(ledger);
  } catch (error) {
    console.error('Expense ledger fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
