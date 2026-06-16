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

    const ledger: Record<string, number> = {};
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

    ledger.total = parseFloat(total.toFixed(2));
    ledger.currency = 'EUR';

    return NextResponse.json(ledger);
  } catch (error) {
    console.error('Expense ledger fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
