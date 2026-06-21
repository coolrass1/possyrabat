import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import {
  createQuarter,
  createMonth,
  setObligation,
  recordPayment,
  getMemberQuarterBreakdown,
} from '@/lib/targets';
import { createSession } from '@/lib/auth';
import { GET as myBreakdownApi } from '@/app/api/targets/my-breakdown/route';

// July 1 2026 .. Sep 30 2026 (UTC)
const JUL1 = Date.UTC(2026, 6, 1);
const SEP30_END = Date.UTC(2026, 8, 30, 23, 59, 59, 999);
const AUG15 = Date.UTC(2026, 7, 15);
const OCT15 = Date.UTC(2026, 9, 15);

function setupQuarter() {
  // Global quarter target 600k split 50/25/25 across the three months.
  const q = createQuarter('Q3 2026', JUL1, SEP30_END, 600000);
  createMonth(q.id, 'July 2026', 300000);
  createMonth(q.id, 'August 2026', 150000);
  createMonth(q.id, 'September 2026', 150000);
  return q.id;
}

function addMember(id: string) {
  db.prepare(
    "INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, 'h', ?, 'member', 'active', ?)"
  ).run(id, `${id}@t.local`, id, Date.now());
}

describe('Member quarter breakdown', () => {
  let quarterId: string;

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM target_payments; DELETE FROM member_quarter_obligations;
      DELETE FROM members; DELETE FROM target_quarters; DELETE FROM target_months;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
    quarterId = setupQuarter();
    addMember('m-john');
  });

  it('derives monthly targets from the obligation and waterfalls an un-earmarked lump (canonical 50/25/25 example)', () => {
    setObligation('m-john', quarterId, 100000); // → derived July 50k, Aug 25k, Sep 25k
    recordPayment('m-john', quarterId, null, 60000, AUG15, 'cash', null, 'm-john');

    const b = getMemberQuarterBreakdown('m-john', quarterId, AUG15);

    const [jul, aug, sep] = b.months;
    expect(jul.target).toBe(50000);
    expect(aug.target).toBe(25000);
    expect(sep.target).toBe(25000);

    expect(jul.paid).toBe(50000);
    expect(aug.paid).toBe(10000);
    expect(sep.paid).toBe(0);

    expect(jul.status).toBe('completed');
    expect(aug.status).toBe('partial');
    expect(sep.status).toBe('pending');

    expect(b.target).toBe(100000);
    expect(b.paid).toBe(60000);
    expect(b.remaining).toBe(40000);
  });

  it('marks an elapsed unpaid month Overdue and counts only past-due shortfalls in behind_by', () => {
    setObligation('m-john', quarterId, 100000);
    // No payments. Mid-August: July has elapsed, Aug/Sep have not.
    const b = getMemberQuarterBreakdown('m-john', quarterId, AUG15);

    expect(b.months[0].status).toBe('overdue'); // July elapsed, unpaid
    expect(b.months[1].status).toBe('pending'); // August not over
    expect(b.months[2].status).toBe('pending'); // September not over

    expect(b.behind_by).toBe(50000); // only July's shortfall, not future months
  });

  it('floors the owed balance at 0 and surfaces overpayment', () => {
    setObligation('m-john', quarterId, 100000);
    recordPayment('m-john', quarterId, null, 120000, AUG15, 'cash', null, 'm-john');

    const b = getMemberQuarterBreakdown('m-john', quarterId, AUG15);

    expect(b.paid).toBe(120000);
    expect(b.remaining).toBe(0); // floored, never negative
    expect(b.overpaid).toBe(20000);
    expect(b.progress).toBe(100); // clamped for the bar
    expect(b.months.every((m) => m.status === 'completed')).toBe(true);
    expect(b.behind_by).toBe(0);
  });

  it('applies an earmarked payment to its month before waterfalling the rest', () => {
    setObligation('m-john', quarterId, 100000);
    const sep = db.prepare("SELECT id FROM target_months WHERE name = 'September 2026'").get() as { id: string };
    recordPayment('m-john', quarterId, sep.id, 25000, AUG15, 'cash', 'for september', 'm-john'); // earmarked
    recordPayment('m-john', quarterId, null, 50000, AUG15, 'cash', null, 'm-john'); // pool

    const b = getMemberQuarterBreakdown('m-john', quarterId, AUG15);

    expect(b.months[2].paid).toBe(25000); // September got its earmark
    expect(b.months[2].status).toBe('completed');
    expect(b.months[0].paid).toBe(50000); // pool waterfalled July first
    expect(b.months[0].status).toBe('completed');
    expect(b.months[1].paid).toBe(0); // August unfunded
    expect(b.months[1].status).toBe('pending');
  });

  it('GET /api/targets/my-breakdown returns the active quarter breakdown for the logged-in member', async () => {
    setObligation('m-john', quarterId, 100000);
    const sessionId = createSession('m-john').id;
    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: sessionId } : undefined) },
    } as any;

    const res = await myBreakdownApi(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.breakdown).not.toBeNull();
    expect(body.breakdown.target).toBe(100000);
    expect(body.breakdown.months).toHaveLength(3);
  });
});
