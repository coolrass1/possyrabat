import { NextRequest, NextResponse } from 'next/server';
import { getSessionById, getMemberById } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import db from '@/lib/db';

const VALID_AIMS = ['court_case', 'construction', 'security', 'general'];

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
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL')
      .get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const { description, amount, aim, date, receipt_url } = await request.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (description !== undefined) {
      if (typeof description !== 'string' || !description) {
        return NextResponse.json({ error: 'Description required' }, { status: 400 });
      }
      updates.push('description = ?');
      values.push(description);
    }
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
      }
      updates.push('amount = ?');
      values.push(amount);
    }
    if (aim !== undefined) {
      if (!VALID_AIMS.includes(aim)) {
        return NextResponse.json({ error: `Invalid aim. Must be one of: ${VALID_AIMS.join(', ')}` }, { status: 400 });
      }
      updates.push('aim = ?');
      values.push(aim);
    }
    if (date !== undefined) {
      if (typeof date !== 'number' || date > Date.now()) {
        return NextResponse.json({ error: 'Date must be in the past' }, { status: 400 });
      }
      updates.push('date = ?');
      values.push(date);
    }
    if (receipt_url !== undefined) {
      updates.push('receipt_url = ?');
      values.push(receipt_url);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any;

    // Log the update
    const beforeValues: Record<string, any> = {};
    const afterValues: Record<string, any> = {};

    if (description !== undefined) {
      beforeValues.description = existing.description;
      afterValues.description = description;
    }
    if (amount !== undefined) {
      beforeValues.amount = existing.amount;
      afterValues.amount = amount;
    }
    if (aim !== undefined) {
      beforeValues.aim = existing.aim;
      afterValues.aim = aim;
    }
    if (date !== undefined) {
      beforeValues.date = existing.date;
      afterValues.date = date;
    }
    if (receipt_url !== undefined) {
      beforeValues.receipt_url = existing.receipt_url;
      afterValues.receipt_url = receipt_url;
    }

    await createAuditLog({
      entity_type: 'expense',
      entity_id: id,
      action: 'updated',
      before_values: Object.keys(beforeValues).length > 0 ? beforeValues : null,
      after_values: afterValues,
      performed_by: auth.member.id,
    });

    return NextResponse.json({
      id: updated.id,
      description: updated.description,
      amount: updated.amount,
      aim: updated.aim,
      date: updated.date,
      receipt_url: updated.receipt_url,
      recorded_by: updated.recorded_by,
      created_at: updated.created_at,
    });
  } catch (error) {
    console.error('Expense update error:', error);
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
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const existing = db
      .prepare('SELECT * FROM expenses WHERE id = ? AND deleted_at IS NULL')
      .get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    db.prepare('UPDATE expenses SET deleted_at = ? WHERE id = ?').run(Date.now(), id);

    // Log the deletion
    await createAuditLog({
      entity_type: 'expense',
      entity_id: id,
      action: 'deleted',
      before_values: {
        description: existing.description,
        amount: existing.amount,
        aim: existing.aim,
        date: existing.date,
        receipt_url: existing.receipt_url,
      },
      after_values: {},
      performed_by: auth.member.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expense delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
