import db from '@/lib/db';
import { TargetQuarter, TargetMonth, MemberQuarterObligation, TargetPayment } from '@/lib/types';
import { randomBytes } from 'crypto';

function generateId(): string {
  return randomBytes(16).toString('hex');
}

export function listQuarters(): TargetQuarter[] {
  return db.prepare('SELECT * FROM target_quarters ORDER BY start_date ASC').all() as TargetQuarter[];
}

export function getQuarterById(id: string): TargetQuarter | null {
  return (db.prepare('SELECT * FROM target_quarters WHERE id = ?').get(id) as TargetQuarter) || null;
}

/**
 * Pure helper: do two closed date intervals [aStart, aEnd] and [bStart, bEnd]
 * overlap? Boundaries are inclusive, so quarters that merely touch on a single
 * timestamp are considered overlapping. Use adjacent (+1ms) boundaries to chain
 * quarters without overlap.
 */
export function quartersOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function createQuarter(name: string, startDate: number, endDate: number, targetAmount: number): TargetQuarter {
  // Reject quarters that overlap any existing quarter (acceptance criterion #21).
  const existing = listQuarters();
  const clash = existing.find((q) => quartersOverlap(startDate, endDate, q.start_date, q.end_date));
  if (clash) {
    throw new Error(`Quarter dates overlap an existing quarter ("${clash.name}")`);
  }

  const id = generateId();
  const now = Date.now();
  db.prepare(
    'INSERT INTO target_quarters (id, name, start_date, end_date, target_amount, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, startDate, endDate, targetAmount, now);
  return getQuarterById(id)!;
}

/**
 * Deterministic active-quarter resolution:
 *   1. the quarter whose [start, end] contains `at` (default: now), else
 *   2. the next upcoming quarter (earliest start strictly after `at`), labeled upcoming, else
 *   3. the most recent past quarter (latest end before `at`).
 * Returns null when no quarters exist.
 */
export function getActiveQuarter(at: number = Date.now()): (TargetQuarter & { is_upcoming: boolean }) | null {
  const quarters = listQuarters(); // ordered by start_date ASC

  // 1. containing
  const containing = quarters.find((q) => at >= q.start_date && at <= q.end_date);
  if (containing) {
    return { ...containing, is_upcoming: false };
  }

  // 2. next upcoming (nearest future start)
  const upcoming = quarters
    .filter((q) => q.start_date > at)
    .sort((a, b) => a.start_date - b.start_date)[0];
  if (upcoming) {
    return { ...upcoming, is_upcoming: true };
  }

  // 3. most recent past (latest end before now)
  const past = quarters
    .filter((q) => q.end_date < at)
    .sort((a, b) => b.end_date - a.end_date)[0];
  if (past) {
    return { ...past, is_upcoming: false };
  }

  return null;
}

export interface MonthlySumHint {
  quarterTarget: number;
  monthlyTotal: number;
  difference: number; // monthlyTotal - quarterTarget
  matches: boolean;
}

/**
 * Soft, NON-blocking validation hint: do a quarter's monthly targets sum to its
 * quarterly target? Never throws — callers decide whether to surface the hint.
 */
export function checkMonthlySum(quarterId: string): MonthlySumHint {
  const quarter = getQuarterById(quarterId);
  const quarterTarget = quarter ? quarter.target_amount : 0;
  const months = listMonths(quarterId);
  const monthlyTotal = months.reduce((sum, m) => sum + m.target_amount, 0);
  const difference = monthlyTotal - quarterTarget;
  return {
    quarterTarget,
    monthlyTotal,
    difference,
    matches: Math.abs(difference) < 0.01,
  };
}

export function listMonths(quarterId?: string): TargetMonth[] {
  if (quarterId) {
    return db.prepare('SELECT * FROM target_months WHERE quarter_id = ? ORDER BY created_at ASC').all(quarterId) as TargetMonth[];
  }
  return db.prepare('SELECT * FROM target_months ORDER BY created_at ASC').all() as TargetMonth[];
}

export function getMonthById(id: string): TargetMonth | null {
  return (db.prepare('SELECT * FROM target_months WHERE id = ?').get(id) as TargetMonth) || null;
}

export function createMonth(quarterId: string, name: string, targetAmount: number): TargetMonth {
  const id = generateId();
  const now = Date.now();
  db.prepare(
    'INSERT INTO target_months (id, quarter_id, name, target_amount, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, quarterId, name, targetAmount, now);
  return getMonthById(id)!;
}

export interface TargetOverview {
  globalTarget: number;
  globalRaised: number;
  activeQuarter: (TargetQuarter & { raised: number }) | null;
  /** True when the active quarter is a future/upcoming one (no quarter contains today). */
  activeQuarterUpcoming: boolean;
  quarters: Array<TargetQuarter & { raised: number }>;
}

export function getOverview(): TargetOverview {
  const globalTarget = 3600000;

  // Calculate total raised across all target payments (exclude soft-deleted)
  const globalRaised = (db.prepare('SELECT SUM(amount) as total FROM contributions WHERE quarter_id IS NOT NULL AND deleted_at IS NULL').get() as { total: number | null }).total || 0;

  // List all quarters
  const quartersRaw = listQuarters();
  const quarters = quartersRaw.map((q) => {
    const raised = (db.prepare('SELECT SUM(amount) as total FROM contributions WHERE quarter_id = ? AND deleted_at IS NULL').get(q.id) as { total: number | null }).total || 0;
    return { ...q, raised };
  });
  
  // Resolve the active quarter deterministically: containing -> upcoming -> most-recent past.
  const resolved = getActiveQuarter();
  const activeQuarterRaw = resolved
    ? quarters.find((q) => q.id === resolved.id) || null
    : null;

  return {
    globalTarget,
    globalRaised,
    activeQuarter: activeQuarterRaw,
    activeQuarterUpcoming: resolved ? resolved.is_upcoming : false,
    quarters,
  };
}

export interface MemberQuarterStanding {
  quarter: TargetQuarter;
  obligation: number;
  paid: number;
  balance: number;
  status: 'up_to_date' | 'behind';
  payments: Array<TargetPayment & { month_name: string | null }>;
}

export function getMemberStanding(memberId: string): MemberQuarterStanding[] {
  const quarters = listQuarters();
  return quarters.map((q) => {
    // Get member obligation for this quarter
    const ob = db.prepare('SELECT amount_due FROM member_quarter_obligations WHERE member_id = ? AND quarter_id = ?').get(memberId, q.id) as { amount_due: number } | undefined;
    const obligation = ob ? ob.amount_due : 0;

    // Get payments recorded for this member in this quarter (exclude soft-deleted)
    const paymentsRaw = db.prepare('SELECT * FROM contributions WHERE member_id = ? AND quarter_id = ? AND deleted_at IS NULL ORDER BY date DESC').all(memberId, q.id) as any[];
    
    const payments = paymentsRaw.map((p) => {
      let month_name: string | null = null;
      if (p.month_id) {
        const m = getMonthById(p.month_id);
        if (m) month_name = m.name;
      }
      return { ...p, date_paid: p.date, month_name };
    });

    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = obligation - paid;
    const status = balance <= 0 ? 'up_to_date' as const : 'behind' as const;

    return {
      quarter: q,
      obligation,
      paid,
      balance,
      status,
      payments,
    };
  });
}

export interface MemberObligationRow {
  member_id: string;
  name: string | null;
  email: string;
  amount_due: number;
}

export function listObligations(quarterId: string): MemberObligationRow[] {
  // Query all members and left join their obligations for the quarter
  const rows = db.prepare(`
    SELECT m.id as member_id, m.name, m.email, COALESCE(o.amount_due, 0) as amount_due
    FROM members m
    LEFT JOIN member_quarter_obligations o ON m.id = o.member_id AND o.quarter_id = ?
    WHERE m.status = 'active'
    ORDER BY m.name ASC
  `).all(quarterId) as MemberObligationRow[];
  return rows;
}

export function setObligation(memberId: string, quarterId: string, amountDue: number): void {
  const now = Date.now();
  db.prepare(`
    INSERT INTO member_quarter_obligations (id, member_id, quarter_id, amount_due, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(member_id, quarter_id) DO UPDATE SET
      amount_due = excluded.amount_due,
      updated_at = excluded.updated_at
  `).run(generateId(), memberId, quarterId, amountDue, now, now);
}

export function recordPayment(
  memberId: string,
  quarterId: string,
  monthId: string | null,
  amount: number,
  datePaid: number,
  method: string,
  notes: string | null,
  recordedBy: string
): TargetPayment {
  const id = generateId();
  const now = Date.now();
  db.prepare(`
    INSERT INTO contributions (id, member_id, quarter_id, month_id, amount, date, method, notes, recorded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, memberId, quarterId, monthId, amount, datePaid, method, notes, recordedBy, now);
  
  const res = db.prepare('SELECT * FROM contributions WHERE id = ?').get(id) as any;
  return {
    ...res,
    date_paid: res.date
  };
}

export function listAllPayments(): Array<TargetPayment & { member_name: string | null; member_email: string; quarter_name: string }> {
  const rows = db.prepare(`
    SELECT p.*, m.name as member_name, m.email as member_email, q.name as quarter_name
    FROM contributions p
    JOIN members m ON p.member_id = m.id
    JOIN target_quarters q ON p.quarter_id = q.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.date DESC
  `).all() as any[];
  return rows.map((r) => ({
    ...r,
    date_paid: r.date
  }));
}
