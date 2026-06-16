import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { generateStatement, sendStatementEmail } from '@/lib/statements';
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
      return NextResponse.json({ error: 'Forbidden - committee only' }, { status: 403 });
    }

    const { year, month, send_emails } = await request.json();

    if (!year || month === undefined) {
      return NextResponse.json({ error: 'Year and month required' }, { status: 400 });
    }

    // Generate the statement
    const statement = await generateStatement(year, month);

    // Send emails if requested
    if (send_emails) {
      const members = db.prepare('SELECT id FROM members WHERE role = ?').all('member') as any[];
      for (const m of members) {
        try {
          await sendStatementEmail(m.id, statement);
        } catch (err) {
          console.error(`Failed to send statement to member ${m.id}:`, err);
        }
      }
    }

    return NextResponse.json({
      id: statement.id,
      year: statement.year,
      month: statement.month,
      total_in: statement.total_in,
      total_out: statement.total_out,
      balance: statement.balance,
      created_at: statement.created_at,
      emails_sent: send_emails,
    });
  } catch (error: any) {
    console.error('Statement generation error:', error);
    if (error.message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Statement already exists for this month' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
