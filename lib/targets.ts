import db from '@/lib/db';
import { TargetQuarter, TargetMonth, MemberQuarterObligation, TargetPayment } from '@/lib/types';
import { getSettings } from '@/lib/settings';
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
  const globalTarget = getSettings().global_target;

  // Calculate total raised across all target payments (exclude soft-deleted)
  const globalRaised = (db.prepare('SELECT SUM(amount) as total FROM target_payments WHERE quarter_id IS NOT NULL AND deleted_at IS NULL').get() as { total: number | null }).total || 0;

  // List all quarters
  const quartersRaw = listQuarters();
  const quarters = quartersRaw.map((q) => {
    const raised = (db.prepare('SELECT SUM(amount) as total FROM target_payments WHERE quarter_id = ? AND deleted_at IS NULL').get(q.id) as { total: number | null }).total || 0;
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

export interface MemberImpact {
  lifetime_paid: number;
  total_collected: number;
  lifetime_target: number;
  share_of_pot: number | null; // percent of total collected; null when nothing collected
  toward_global: number | null; // percent of lifetime target; null when target unset
}

export function getMemberImpact(memberId: string): MemberImpact {
  const lifetime_paid = (db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM target_payments WHERE member_id = ? AND quarter_id IS NOT NULL AND deleted_at IS NULL')
    .get(memberId) as { total: number }).total;
  const total_collected = (db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM target_payments WHERE quarter_id IS NOT NULL AND deleted_at IS NULL')
    .get() as { total: number }).total;
  const lifetime_target = getSettings().global_target;

  return {
    lifetime_paid,
    total_collected,
    lifetime_target,
    share_of_pot: total_collected > 0 ? (lifetime_paid / total_collected) * 100 : null,
    toward_global: lifetime_target > 0 ? (lifetime_paid / lifetime_target) * 100 : null,
  };
}

export type MonthStatus = 'completed' | 'partial' | 'pending' | 'overdue';

export interface MemberMonthBreakdown {
  month_id: string;
  name: string;
  target: number;
  paid: number;
  status: MonthStatus;
}

export interface MemberQuarterBreakdown {
  quarter: TargetQuarter;
  obligation: number;
  target: number; // == obligation (amount the member owes this quarter)
  paid: number;
  remaining: number; // amount-owed convention, floored at 0
  overpaid: number; // max(0, paid - obligation)
  progress: number; // clamped 0..100 for bar fill
  behind_by: number; // sum of shortfalls on past-due (overdue) months only
  months: MemberMonthBreakdown[];
}

// Calendar-month boundaries are derived from the quarter start by ordinal
// position, since target_months store no dates of their own.
function addUTCMonths(ts: number, n: number): number {
  const d = new Date(ts);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.getTime();
}

export function getMemberQuarterBreakdown(
  memberId: string,
  quarterId: string,
  now: number = Date.now()
): MemberQuarterBreakdown {
  const quarter = getQuarterById(quarterId)!;
  const obRow = db
    .prepare('SELECT amount_due FROM member_quarter_obligations WHERE member_id = ? AND quarter_id = ?')
    .get(memberId, quarterId) as { amount_due: number } | undefined;
  const obligation = obRow ? obRow.amount_due : 0;

  const months = listMonths(quarterId); // created_at ASC = chronological
  const quarterTarget = quarter.target_amount;

  const payments = db
    .prepare('SELECT * FROM target_payments WHERE member_id = ? AND quarter_id = ? AND deleted_at IS NULL')
    .all(memberId, quarterId) as TargetPayment[];

  // Earmarked payments land on their month; the rest form a pool to waterfall.
  const earmarked: Record<string, number> = {};
  let pool = 0;
  for (const p of payments) {
    if (p.month_id) earmarked[p.month_id] = (earmarked[p.month_id] || 0) + p.amount;
    else pool += p.amount;
  }

  const rows = months.map((m, i) => {
    const ratio = quarterTarget > 0 ? m.target_amount / quarterTarget : 0;
    const nextStart = addUTCMonths(quarter.start_date, i + 1);
    return {
      month: m,
      target: obligation * ratio,
      paid: earmarked[m.id] || 0,
      ended: now >= nextStart,
    };
  });

  // Waterfall the un-earmarked pool earliest-month-first, up to each target.
  let remainingPool = pool;
  for (const r of rows) {
    if (remainingPool <= 0) break;
    const give = Math.min(Math.max(0, r.target - r.paid), remainingPool);
    r.paid += give;
    remainingPool -= give;
  }

  const monthsOut: MemberMonthBreakdown[] = rows.map((r) => {
    let status: MonthStatus;
    if (r.paid >= r.target) status = 'completed';
    else if (r.ended) status = 'overdue';
    else if (r.paid > 0) status = 'partial';
    else status = 'pending';
    return { month_id: r.month.id, name: r.month.name, target: r.target, paid: r.paid, status };
  });

  const behind_by = rows.reduce(
    (sum, r) => (r.ended && r.paid < r.target ? sum + (r.target - r.paid) : sum),
    0
  );

  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, obligation - paid);
  const overpaid = Math.max(0, paid - obligation);
  const progress = obligation > 0 ? Math.min(100, (paid / obligation) * 100) : paid > 0 ? 100 : 0;

  return { quarter, obligation, target: obligation, paid, remaining, overpaid, progress, behind_by, months: monthsOut };
}

export function getMemberStanding(memberId: string): MemberQuarterStanding[] {
  const quarters = listQuarters();
  return quarters.map((q) => {
    // Get member obligation for this quarter
    const ob = db.prepare('SELECT amount_due FROM member_quarter_obligations WHERE member_id = ? AND quarter_id = ?').get(memberId, q.id) as { amount_due: number } | undefined;
    const obligation = ob ? ob.amount_due : 0;

    // Get payments recorded for this member in this quarter (exclude soft-deleted)
    const paymentsRaw = db.prepare('SELECT * FROM target_payments WHERE member_id = ? AND quarter_id = ? AND deleted_at IS NULL ORDER BY date_paid DESC').all(memberId, q.id) as any[];

    const payments = paymentsRaw.map((p) => {
      let month_name: string | null = null;
      if (p.month_id) {
        const m = getMonthById(p.month_id);
        if (m) month_name = m.name;
      }
      return { ...p, month_name };
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
  parcel_count: number;
  amount_due: number;
}

export function listObligations(quarterId: string): MemberObligationRow[] {
  // Query all members and left join their obligations for the quarter.
  // parcel_count is surfaced as a helper for the admin to sanity-check dues.
  const rows = db.prepare(`
    SELECT m.id as member_id, m.name, m.email,
           COALESCE(m.parcel_count, 0) as parcel_count,
           COALESCE(o.amount_due, 0) as amount_due
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
  quarterId: string | null,
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
    INSERT INTO target_payments (id, member_id, quarter_id, month_id, amount, date_paid, method, notes, recorded_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, memberId, quarterId, monthId, amount, datePaid, method, notes, recordedBy, now, now);

  const payment = db.prepare('SELECT * FROM target_payments WHERE id = ?').get(id) as TargetPayment;
  auditPayment('created', id, null, payment, recordedBy);
  return payment;
}

// Synchronous audit insert for target_payments (better-sqlite3 writes are sync;
// kept inline to keep payment functions synchronous for existing call sites).
function auditPayment(
  action: 'created' | 'updated' | 'deleted',
  paymentId: string,
  before: Record<string, any> | null,
  after: Record<string, any>,
  performedBy: string
): void {
  db.prepare(`
    INSERT INTO audit_log (id, entity_type, entity_id, action, before_values, after_values, performed_by, created_at)
    VALUES (?, 'target_payment', ?, ?, ?, ?, ?, ?)
  `).run(
    generateId(),
    paymentId,
    action,
    before ? JSON.stringify(before) : null,
    JSON.stringify(after),
    performedBy,
    Date.now()
  );
}

export function getPaymentById(id: string): TargetPayment | null {
  return (db.prepare('SELECT * FROM target_payments WHERE id = ?').get(id) as TargetPayment) || null;
}

export interface PaymentPatch {
  quarter_id?: string | null;
  month_id?: string | null;
  amount?: number;
  date_paid?: number;
  method?: string;
  notes?: string | null;
}

export function updatePayment(id: string, patch: PaymentPatch, updatedBy: string): TargetPayment | null {
  const before = getPaymentById(id);
  if (!before || before.deleted_at) return null;

  const next = {
    quarter_id: patch.quarter_id !== undefined ? patch.quarter_id : before.quarter_id,
    month_id: patch.month_id !== undefined ? patch.month_id : before.month_id,
    amount: patch.amount !== undefined ? patch.amount : before.amount,
    date_paid: patch.date_paid !== undefined ? patch.date_paid : before.date_paid,
    method: patch.method !== undefined ? patch.method : before.method,
    notes: patch.notes !== undefined ? patch.notes : before.notes,
  };

  db.prepare(`
    UPDATE target_payments
    SET quarter_id = ?, month_id = ?, amount = ?, date_paid = ?, method = ?, notes = ?, updated_by = ?, updated_at = ?
    WHERE id = ?
  `).run(next.quarter_id, next.month_id, next.amount, next.date_paid, next.method, next.notes, updatedBy, Date.now(), id);

  const after = getPaymentById(id)!;
  auditPayment('updated', id, before, after, updatedBy);
  return after;
}

export function softDeletePayment(id: string, deletedBy: string): TargetPayment | null {
  const before = getPaymentById(id);
  if (!before || before.deleted_at) return null;

  const now = Date.now();
  db.prepare('UPDATE target_payments SET deleted_at = ?, updated_by = ?, updated_at = ? WHERE id = ?').run(now, deletedBy, now, id);

  const after = getPaymentById(id)!;
  auditPayment('deleted', id, before, after, deletedBy);
  return after;
}

export function listAllPayments(): Array<TargetPayment & { member_name: string | null; member_email: string; quarter_name: string }> {
  const rows = db.prepare(`
    SELECT p.*, m.name as member_name, m.email as member_email, q.name as quarter_name
    FROM target_payments p
    JOIN members m ON p.member_id = m.id
    JOIN target_quarters q ON p.quarter_id = q.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.date_paid DESC
  `).all() as any[];
  return rows as Array<TargetPayment & { member_name: string | null; member_email: string; quarter_name: string }>;
}
