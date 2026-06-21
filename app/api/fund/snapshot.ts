'use server';

import db from '@/lib/db';

export interface FundSnapshot {
  totalContributions: number;
  totalExpenses: number;
  balance: number;
  thisMonthContributions: number;
  byAim: {
    court_case: number;
    construction: number;
    security: number;
  };
}

export async function getFundSnapshot(): Promise<FundSnapshot> {
  // Get total contributions
  const totalContributions =
    ((db.prepare('SELECT SUM(amount) as total FROM target_payments WHERE deleted_at IS NULL').get() as any)
      .total || 0);

  // Get total expenses
  const totalExpenses =
    ((db.prepare('SELECT SUM(amount) as total FROM expenses WHERE deleted_at IS NULL').get() as any)
      .total || 0);

  // Get expenses by aim
  const courtCase =
    ((db.prepare(
      'SELECT SUM(amount) as total FROM expenses WHERE aim = ? AND deleted_at IS NULL'
    ).get('court_case') as any).total || 0);

  const construction =
    ((db.prepare(
      'SELECT SUM(amount) as total FROM expenses WHERE aim = ? AND deleted_at IS NULL'
    ).get('construction') as any).total || 0);

  const security =
    ((db.prepare(
      'SELECT SUM(amount) as total FROM expenses WHERE aim = ? AND deleted_at IS NULL'
    ).get('security') as any).total || 0);

  // Contributions recorded since the start of the current calendar month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonthContributions =
    ((db.prepare(
      'SELECT SUM(amount) as total FROM target_payments WHERE date_paid >= ? AND deleted_at IS NULL'
    ).get(monthStart) as any).total || 0);

  return {
    totalContributions,
    totalExpenses,
    balance: totalContributions - totalExpenses,
    thisMonthContributions,
    byAim: {
      court_case: courtCase,
      construction,
      security,
    },
  };
}
