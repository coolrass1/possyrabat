import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { setObligation } from '@/lib/targets';

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

    const actor = getMemberById(session.member_id);
    if (!actor || actor.role === 'member') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { member_id, quarter_id, amount_due } = await request.json();

    if (!member_id || !quarter_id || typeof amount_due !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    setObligation(member_id, quarter_id, amount_due);

    return NextResponse.json({
      member_id,
      quarter_id,
      amount_due,
      message: 'Obligation set successfully',
    });
  } catch (error: any) {
    console.error('Set obligation error:', error);
    return NextResponse.json({ error: 'Failed to set obligation' }, { status: 500 });
  }
}
