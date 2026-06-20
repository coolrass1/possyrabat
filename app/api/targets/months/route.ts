import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { listMonths, createMonth } from '@/lib/targets';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const quarterId = searchParams.get('quarter_id') || undefined;

    const months = listMonths(quarterId);
    return NextResponse.json(months);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch months' }, { status: 500 });
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
    const { quarter_id, name, target_amount } = await request.json();
    if (!quarter_id || !name || !target_amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const month = createMonth(quarter_id, name, Number(target_amount));
    return NextResponse.json(month);
  } catch (error) {
    console.error('Create month target error:', error);
    return NextResponse.json({ error: 'Failed to create month target' }, { status: 500 });
  }
}
