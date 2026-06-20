import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { listQuarters, createQuarter } from '@/lib/targets';

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = getSessionById(sessionId);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const quarters = listQuarters();
    return NextResponse.json(quarters);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quarters' }, { status: 500 });
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
    const { name, start_date, end_date, target_amount } = await request.json();
    if (!name || !start_date || !end_date || !target_amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const quarter = createQuarter(name, Number(start_date), Number(end_date), Number(target_amount));
    return NextResponse.json(quarter);
  } catch (error: any) {
    if (String(error?.message || '').includes('UNIQUE')) {
      return NextResponse.json({ error: 'A quarter with that name already exists' }, { status: 409 });
    }
    console.error('Create quarter error:', error);
    return NextResponse.json({ error: 'Failed to create quarter' }, { status: 500 });
  }
}
