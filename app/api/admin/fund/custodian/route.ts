import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { setCustodian } from '@/lib/custodian';

export async function PATCH(request: NextRequest) {
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

    const { custodian_name, account_masked, last_reconciled_at } = await request.json();

    if (last_reconciled_at !== undefined && last_reconciled_at !== null && typeof last_reconciled_at !== 'number') {
      return NextResponse.json({ error: 'last_reconciled_at must be a timestamp' }, { status: 400 });
    }

    const updated = setCustodian({ custodian_name, account_masked, last_reconciled_at });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Custodian update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
