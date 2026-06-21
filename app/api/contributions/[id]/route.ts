import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { getPaymentById, updatePayment, softDeletePayment, type PaymentPatch } from '@/lib/targets';

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

async function getId(context: any): Promise<string | undefined> {
  // Handle both sync (test) and async (production) params
  const params = context?.params;
  if (typeof params?.then === 'function') {
    const resolved = await params;
    return resolved?.id || context?.id;
  }
  return params?.id || context?.id;
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    const auth = requireCommittee(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    const existing = getPaymentById(id);
    if (!existing || existing.deleted_at) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const { amount, date, method, notes } = await request.json();
    const patch: PaymentPatch = {};
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
      }
      patch.amount = amount;
    }
    if (date !== undefined) {
      if (typeof date !== 'number' || date > Date.now()) {
        return NextResponse.json({ error: 'Date must be in the past' }, { status: 400 });
      }
      patch.date_paid = date;
    }
    if (method !== undefined) patch.method = method;
    if (notes !== undefined) patch.notes = notes;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = updatePayment(id, patch, auth.member.id)!;
    return NextResponse.json({ ...updated, date: updated.date_paid });
  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const auth = requireCommittee(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
    }

    const deleted = softDeletePayment(id, auth.member.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
