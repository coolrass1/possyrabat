import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { updatePayment, softDeletePayment, type PaymentPatch } from '@/lib/targets';

async function requireAdmin(request: NextRequest) {
  const sessionId = request.cookies.get('session_id')?.value;
  if (!sessionId) return { error: 'Unauthorized', status: 401 as const };
  const session = getSessionById(sessionId);
  if (!session) return { error: 'Unauthorized', status: 401 as const };
  const actor = getMemberById(session.member_id);
  if (!actor || actor.role === 'member') return { error: 'Forbidden', status: 403 as const };
  return { actor };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body = await request.json();
    const patch: PaymentPatch = {};
    if (body.amount !== undefined) patch.amount = Number(body.amount);
    if (body.quarter_id !== undefined) patch.quarter_id = body.quarter_id || null;
    if (body.month_id !== undefined) patch.month_id = body.month_id || null;
    if (body.date_paid !== undefined) patch.date_paid = Number(body.date_paid);
    if (body.method !== undefined) patch.method = body.method;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;

    const updated = updatePayment(id, patch, auth.actor.id);
    if (!updated) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update payment error:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const deleted = softDeletePayment(id, auth.actor.id);
    if (!deleted) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete payment error:', error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}
