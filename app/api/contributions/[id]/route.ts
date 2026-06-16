import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import db from '@/lib/db';

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

function getId(context: any): string | undefined {
  return context?.id || context?.params?.id;
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    const auth = requireCommittee(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = getId(context);
    if (!id) {
      return NextResponse.json({ error: 'Contribution ID required' }, { status: 400 });
    }

    const existing = db
      .prepare('SELECT * FROM contributions WHERE id = ? AND deleted_at IS NULL')
      .get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    const { amount, date, method, notes } = await request.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
      }
      updates.push('amount = ?');
      values.push(amount);
    }
    if (date !== undefined) {
      if (typeof date !== 'number' || date > Date.now()) {
        return NextResponse.json({ error: 'Date must be in the past' }, { status: 400 });
      }
      updates.push('date = ?');
      values.push(date);
    }
    if (method !== undefined) {
      updates.push('method = ?');
      values.push(method);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE contributions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as any;

    // Log the update
    const beforeValues: Record<string, any> = {};
    const afterValues: Record<string, any> = {};

    if (amount !== undefined) {
      beforeValues.amount = existing.amount;
      afterValues.amount = amount;
    }
    if (date !== undefined) {
      beforeValues.date = existing.date;
      afterValues.date = date;
    }
    if (method !== undefined) {
      beforeValues.method = existing.method;
      afterValues.method = method;
    }
    if (notes !== undefined) {
      beforeValues.notes = existing.notes;
      afterValues.notes = notes;
    }

    await createAuditLog({
      entity_type: 'contribution',
      entity_id: id,
      action: 'updated',
      before_values: Object.keys(beforeValues).length > 0 ? beforeValues : null,
      after_values: afterValues,
      performed_by: auth.member.id,
    });

    return NextResponse.json({
      id: updated.id,
      member_id: updated.member_id,
      amount: updated.amount,
      date: updated.date,
      method: updated.method,
      notes: updated.notes,
      recorded_by: updated.recorded_by,
      created_at: updated.created_at,
    });
  } catch (error) {
    console.error('Contribution update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    const auth = requireCommittee(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const id = getId(context);
    if (!id) {
      return NextResponse.json({ error: 'Contribution ID required' }, { status: 400 });
    }

    const existing = db
      .prepare('SELECT * FROM contributions WHERE id = ? AND deleted_at IS NULL')
      .get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    db.prepare('UPDATE contributions SET deleted_at = ? WHERE id = ?').run(Date.now(), id);

    // Log the deletion
    await createAuditLog({
      entity_type: 'contribution',
      entity_id: id,
      action: 'deleted',
      before_values: {
        member_id: existing.member_id,
        amount: existing.amount,
        date: existing.date,
        method: existing.method,
        notes: existing.notes,
      },
      after_values: {},
      performed_by: auth.member.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contribution delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
