'use server';

import db from '@/lib/db';

export interface ActivityItem {
  id: string;
  type: 'contribution' | 'expense' | 'case_step';
  timestamp: number;
  title: string;
  description: string;
  amount?: number;
  aim?: string;
}

export async function getActivityFeed(limit: number = 10): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];

  // Get recent contributions
  const contributions = db
    .prepare(
      `SELECT id, member_id, amount, date_paid as timestamp, recorded_by FROM target_payments
       WHERE deleted_at IS NULL
       ORDER BY date_paid DESC LIMIT ?`
    )
    .all(limit) as any[];

  for (const contrib of contributions) {
    activities.push({
      id: contrib.id,
      type: 'contribution',
      timestamp: contrib.timestamp,
      title: 'Contribution Recorded',
      description: `€${contrib.amount} received`,
      amount: contrib.amount,
    });
  }

  // Get recent expenses
  const expenses = db
    .prepare(
      `SELECT id, description, amount, aim, date as timestamp, recorded_by FROM expenses
       WHERE deleted_at IS NULL
       ORDER BY date DESC LIMIT ?`
    )
    .all(limit) as any[];

  for (const expense of expenses) {
    activities.push({
      id: expense.id,
      type: 'expense',
      timestamp: expense.timestamp,
      title: 'Expense Recorded',
      description: `${expense.description} (${expense.aim})`,
      amount: expense.amount,
      aim: expense.aim,
    });
  }

  // Get recent case steps
  const caseSteps = db
    .prepare(
      `SELECT id, case_id, description, type, date as timestamp FROM case_steps
       WHERE deleted_at IS NULL
       ORDER BY date DESC LIMIT ?`
    )
    .all(limit) as any[];

  for (const step of caseSteps) {
    activities.push({
      id: step.id,
      type: 'case_step',
      timestamp: step.timestamp,
      title: `Case: ${step.type.replace(/_/g, ' ')}`,
      description: step.description,
    });
  }

  // Sort by timestamp descending (newest first)
  activities.sort((a, b) => b.timestamp - a.timestamp);

  // Return only the requested limit
  return activities.slice(0, limit);
}
