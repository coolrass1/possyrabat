import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { getQuarterById, listMonths, createMonth } from '@/lib/targets';

async function getId(context: any): Promise<string | undefined> {
  const params = context?.params;
  if (typeof params?.then === 'function') {
    const resolved = await params;
    return resolved?.id || context?.id;
  }
  return params?.id || context?.id;
}

function requireCommittee(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return { error: 'Unauthorized', status: 401 as const };

  const session = getSessionById(sessionId);
  if (!session) return { error: 'Unauthorized', status: 401 as const };

  const member = getMemberById(session.member_id);
  if (!member || member.role === 'member') {
    return { error: 'Forbidden', status: 403 as const };
  }
  return { member };
}

export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const auth = requireCommittee(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const quarterId = await getId(context);
    if (!quarterId) {
      return NextResponse.json({ error: 'Quarter ID required' }, { status: 400 });
    }

    const quarter = getQuarterById(quarterId);
    if (!quarter) {
      return NextResponse.json({ error: 'Quarter not found' }, { status: 404 });
    }

    const { months } = await request.json();
    if (!Array.isArray(months) || months.length === 0) {
      return NextResponse.json({ error: 'Months array required' }, { status: 400 });
    }

    let totalAmount = 0;
    for (const month of months) {
      if (!month.name || typeof month.target_amount !== 'number') {
        return NextResponse.json({ error: 'Each month must have name and target_amount' }, { status: 400 });
      }
      if (month.target_amount <= 0) {
        return NextResponse.json({ error: 'Monthly target must be greater than 0' }, { status: 400 });
      }
      totalAmount += month.target_amount;
    }

    if (Math.abs(totalAmount - quarter.target_amount) > 0.01) {
      return NextResponse.json(
        {
          error: `Monthly targets must sum to ${quarter.target_amount} (got ${totalAmount})`,
        },
        { status: 400 }
      );
    }

    const createdMonths = [];
    for (const month of months) {
      const created = createMonth(quarterId, month.name, month.target_amount);
      createdMonths.push(created);
    }

    return NextResponse.json({
      quarterId,
      quarterTarget: quarter.target_amount,
      months: createdMonths,
      total: totalAmount,
      isValid: Math.abs(totalAmount - quarter.target_amount) < 0.01,
      message: 'Monthly targets created successfully',
    });
  } catch (error: any) {
    console.error('Create months error:', error);
    return NextResponse.json({ error: 'Failed to create monthly targets' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const auth = requireCommittee(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const quarterId = await getId(context);
    if (!quarterId) {
      return NextResponse.json({ error: 'Quarter ID required' }, { status: 400 });
    }

    const quarter = getQuarterById(quarterId);
    if (!quarter) {
      return NextResponse.json({ error: 'Quarter not found' }, { status: 404 });
    }

    const months = listMonths(quarterId);
    const total = months.reduce((sum, m) => sum + m.target_amount, 0);

    return NextResponse.json({
      quarterId,
      quarterTarget: quarter.target_amount,
      months,
      total,
      isValid: Math.abs(total - quarter.target_amount) < 0.01,
    });
  } catch (error: any) {
    console.error('Fetch months error:', error);
    return NextResponse.json({ error: 'Failed to fetch monthly targets' }, { status: 500 });
  }
}
