import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { seedDefaultQuarters } from './helpers/seedQuarters';
import { setGlobalTarget } from '@/lib/settings';
import {
  getOverview,
  getMemberStanding,
  setObligation,
  recordPayment,
  listQuarters,
  listMonths,
  createQuarter
} from '@/lib/targets';

describe('Target-Based Cotisations Module', () => {
  beforeAll(() => {
    initializeDb();
    seedDefaultQuarters();
  });

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM sessions;
      DELETE FROM members;
      DELETE FROM target_quarters;
      DELETE FROM target_months;
      DELETE FROM member_quarter_obligations;
      DELETE FROM contributions;
      DELETE FROM target_payments;
      PRAGMA foreign_keys=ON;
    `);
    // Re-initialize to populate default target quarters & months
    initializeDb();
    seedDefaultQuarters();
  });

  it('lists default quarters and months populated by seeder', () => {
    const quarters = listQuarters();
    expect(quarters).toHaveLength(6);
    expect(quarters[0].name).toBe('Q3 2026');

    const months = listMonths();
    expect(months.length).toBeGreaterThanOrEqual(18); // 6 quarters * 3 months = 18 months
  });

  it('automatically migrates historical contributions without a quarter to the correct target quarter based on transaction date', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-user';
    const memberId = 'member-john';
    const now = Date.now();

    // Insert admin and member
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'john@example.com', passwordHash, 'John Doe', 'member', now);

    // July 2026 is inside Q3 2026
    const july2026Time = 1783000000000;
    db.prepare(`
      INSERT INTO contributions (id, member_id, amount, date, method, notes, recorded_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('hist-contrib-1', memberId, 500, july2026Time, 'cash', 'Pre-existing payment', adminId, now);

    // Call initializeDb() which triggers migration
    initializeDb();
    seedDefaultQuarters();

    // Query database to see if the contribution's quarter_id got updated
    const updated = db.prepare('SELECT quarter_id FROM contributions WHERE id = ?').get('hist-contrib-1') as { quarter_id: string | null };
    expect(updated.quarter_id).toBe('q3-2026');
  });

  it('sets obligations and records payments; updates overview and member standings', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-user';
    const memberId = 'member-john';
    const now = Date.now();

    // Insert admin and member
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'john@example.com', passwordHash, 'John Doe', 'member', now);

    const quarters = listQuarters();
    const q1 = quarters[0]; // Q3 2026
    const months = listMonths(q1.id);
    const m1 = months[0]; // July 2026

    // Set John's Q3 2026 obligation to €1,500
    setObligation(memberId, q1.id, 1500);

    // Verify member standing (should show unpaid €1,500 and status behind)
    let JohnStandings = getMemberStanding(memberId);
    let q1Standing = JohnStandings.find((s) => s.quarter.id === q1.id)!;
    expect(q1Standing.obligation).toBe(1500);
    expect(q1Standing.paid).toBe(0);
    expect(q1Standing.balance).toBe(1500);
    expect(q1Standing.status).toBe('behind');

    // Record €500 payment earmarked for m1 (July 2026)
    recordPayment(memberId, q1.id, m1.id, 500, now, 'bank_transfer', 'First wire', adminId);

    // Verify standing updates (paid €500, balance €1,000 still owed)
    JohnStandings = getMemberStanding(memberId);
    q1Standing = JohnStandings.find((s) => s.quarter.id === q1.id)!;
    expect(q1Standing.paid).toBe(500);
    expect(q1Standing.balance).toBe(1000);
    expect(q1Standing.payments).toHaveLength(1);
    expect(q1Standing.payments[0].amount).toBe(500);
    expect(q1Standing.payments[0].month_name).toBe(m1.name);

    // Record another €1,000 payment to fully clear obligation
    recordPayment(memberId, q1.id, null, 1000, now, 'bank_transfer', 'Balance wire', adminId);

    JohnStandings = getMemberStanding(memberId);
    q1Standing = JohnStandings.find((s) => s.quarter.id === q1.id)!;
    expect(q1Standing.paid).toBe(1500);
    expect(q1Standing.balance).toBe(0);
    expect(q1Standing.status).toBe('up_to_date');

    // Verify global and quarter overview
    setGlobalTarget(3600000, adminId);
    const overview = getOverview();
    expect(overview.globalTarget).toBe(3600000);
    expect(overview.globalRaised).toBe(1500);
    const activeQ = overview.quarters.find((q) => q.id === q1.id)!;
    expect(activeQ.raised).toBe(1500);
  });
});

describe('Targets API Routes', () => {
  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM sessions;
      DELETE FROM members;
      DELETE FROM target_quarters;
      DELETE FROM target_months;
      DELETE FROM member_quarter_obligations;
      DELETE FROM contributions;
      DELETE FROM target_payments;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
    seedDefaultQuarters();
  });

  it('GET /api/targets/overview returns target overview', async () => {
    const passwordHash = await hashPassword('password123');
    const memberId = 'member-user';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'user@example.com', passwordHash, 'Regular User', 'member', now);

    const session = createSession(memberId);
    setGlobalTarget(3600000, memberId);

    const { GET: getOverviewRoute } = await import('@/app/api/targets/overview/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: session.id } : undefined),
      },
    } as any;

    const response = await getOverviewRoute(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.globalTarget).toBe(3600000);
    expect(body.globalRaised).toBe(0);
    expect(body.quarters).toHaveLength(6);
  });

  it('POST /api/targets/obligations allows admin but forbids regular members', async () => {
    const passwordHash = await hashPassword('password123');
    const memberId = 'member-user';
    const adminId = 'admin-user';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'user@example.com', passwordHash, 'Regular User', 'member', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin User', 'committee', now);

    const memberSession = createSession(memberId);
    const adminSession = createSession(adminId);

    const quarters = listQuarters();
    const q1 = quarters[0];

    const { POST: postObligationsRoute } = await import('@/app/api/targets/obligations/route');

    // Act: try as regular member
    const reqMember = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
      json: async () => ({
        quarter_id: q1.id,
        obligations: [{ member_id: memberId, amount_due: 2000 }],
      }),
    } as any;

    const resMember = await postObligationsRoute(reqMember);
    expect(resMember.status).toBe(403); // Forbidden

    // Act: try as admin
    const reqAdmin = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        quarter_id: q1.id,
        obligations: [{ member_id: memberId, amount_due: 2000 }],
      }),
    } as any;

    const resAdmin = await postObligationsRoute(reqAdmin);
    expect(resAdmin.status).toBe(200); // OK

    // Verify value in DB
    const JohnStandings = getMemberStanding(memberId);
    const q1Standing = JohnStandings.find((s) => s.quarter.id === q1.id)!;
    expect(q1Standing.obligation).toBe(2000);
  });

  it('admin can create a new quarter with validation', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-user';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const adminSession = createSession(adminId);
    const { POST: postQuartersRoute } = await import('@/app/api/targets/quarters/route');

    // Act: create a valid quarter with unique name
    const uniqueName = `Test Quarter ${Date.now()}`;
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        name: uniqueName,
        start_date: 1696118400000, // Oct 1 2026
        end_date: 1704067199999, // Dec 31 2026
        target_amount: 5000000,
      }),
    } as any;

    const res = await postQuartersRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(uniqueName);
    expect(body.target_amount).toBe(5000000);

    // Verify in DB
    const quarters = listQuarters();
    const newQuarter = quarters.find((q) => q.name === uniqueName);
    expect(newQuarter).toBeDefined();
  });

  it('admin can bulk-assign equal member obligations for a quarter', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-user';
    const now = Date.now();

    // Create admin
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    // Create 3 active members
    for (let i = 1; i <= 3; i++) {
      db.prepare(
        'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(`member-bulk-${i}`, `memberbulk${i}@example.com`, passwordHash, `Member ${i}`, 'member', 'active', now);
    }

    const adminSession = createSession(adminId);

    // Create a fresh quarter for this test
    const { createQuarter } = await import('@/lib/targets');
    const testQuarter = createQuarter(`Bulk Test Quarter ${now}`, 1696118400000, 1704067199999, 300000);

    const { POST: postBulkObligationsRoute } = await import('@/app/api/admin/targets/bulk-obligations/route');

    // Act: bulk assign obligations equally
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        quarter_id: testQuarter.id,
        global_target: 300000,
        strategy: 'equal', // divide equally among active members
      }),
    } as any;

    const res = await postBulkObligationsRoute(req);
    expect(res.status).toBe(200);

    // Verify obligations: 300000 / 3 members = 100000 each
    for (let i = 1; i <= 3; i++) {
      const standing = getMemberStanding(`member-bulk-${i}`).find((s) => s.quarter.id === testQuarter.id);
      expect(standing?.obligation).toBe(100000);
    }
  });

  it('committee can record a payment and it updates member standing', async () => {
    const passwordHash = await hashPassword('password123');
    const committeeId = 'committee-user';
    const memberId = 'member-user';
    const now = Date.now();

    // Create committee and member
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(committeeId, 'committee@example.com', passwordHash, 'Committee', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'member@example.com', passwordHash, 'Member', 'member', 'active', now);

    // Create quarter and set member obligation
    const { createQuarter } = await import('@/lib/targets');
    const testQuarter = createQuarter(`Payment Test Quarter ${now}`, 1696118400000, 1704067199999, 100000);
    setObligation(memberId, testQuarter.id, 50000);

    const committeeSession = createSession(committeeId);
    const { POST: postPaymentRoute } = await import('@/app/api/targets/payments/route');

    // Act: record a payment
    const paymentDate = 1696118400000; // Oct 1 2026
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({
        member_id: memberId,
        amount: 30000,
        quarter_id: testQuarter.id, date_paid: paymentDate,
        method: 'mobile_money',
        notes: 'Mpesa transfer',
      }),
    } as any;

    const res = await postPaymentRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.amount).toBe(30000);
    expect(body.method).toBe('mobile_money');

    // Verify standing was updated
    const standing = getMemberStanding(memberId).find((s) => s.quarter.id === testQuarter.id);
    expect(standing?.paid).toBe(30000);
    expect(standing?.balance).toBe(20000); // 50000 - 30000 = 20000 (still owe)
  });

  it('admin can edit a recorded payment and standing updates', async () => {
    const passwordHash = await hashPassword('password123');
    const committeeId = 'committee-edit-test';
    const memberId = 'member-edit-test';
    const now = Date.now();

    // Create committee and member
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(committeeId, 'committee@example.com', passwordHash, 'Committee', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'member@example.com', passwordHash, 'Member', 'member', 'active', now);

    // Create quarter and set obligation
    const { createQuarter } = await import('@/lib/targets');
    const testQuarter = createQuarter(`Payment Edit Test ${now}`, 1696118400000, 1704067199999, 100000);
    setObligation(memberId, testQuarter.id, 50000);

    const committeeSession = createSession(committeeId);

    // Record initial payment
    const { POST: postPaymentRoute } = await import('@/app/api/targets/payments/route');
    let req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({
        member_id: memberId,
        amount: 20000,
        quarter_id: testQuarter.id, date_paid: 1696118400000,
        method: 'cash',
        notes: 'Initial payment',
      }),
    } as any;

    let res = await postPaymentRoute(req);
    expect(res.status).toBe(200);
    const paymentId = (await res.json()).id;

    // Verify initial standing
    let standing = getMemberStanding(memberId).find((s) => s.quarter.id === testQuarter.id);
    expect(standing?.paid).toBe(20000);
    expect(standing?.balance).toBe(30000); // 50000 - 20000

    // Act: Edit the payment to 35000
    const patchRoute = await import('@/app/api/targets/payments/[id]/route');
    req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({
        amount: 35000,
        notes: 'Updated payment',
      }),
    } as any;

    const patchRes = await (patchRoute.PATCH as any)(req, { params: Promise.resolve({ id: paymentId }) });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.amount).toBe(35000);
    expect(updated.notes).toBe('Updated payment');

    // Verify standing updated
    standing = getMemberStanding(memberId).find((s) => s.quarter.id === testQuarter.id);
    expect(standing?.paid).toBe(35000);
    expect(standing?.balance).toBe(15000); // 50000 - 35000
  });

  it('admin can soft-delete a payment and standing updates', async () => {
    const passwordHash = await hashPassword('password123');
    const committeeId = 'committee-delete-test';
    const memberId = 'member-delete-test';
    const now = Date.now();

    // Create committee and member
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(committeeId, 'committee@example.com', passwordHash, 'Committee', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'member@example.com', passwordHash, 'Member', 'member', 'active', now);

    // Create quarter and set obligation
    const { createQuarter } = await import('@/lib/targets');
    const testQuarter = createQuarter(`Payment Delete Test ${now}`, 1696118400000, 1704067199999, 100000);
    setObligation(memberId, testQuarter.id, 50000);

    const committeeSession = createSession(committeeId);

    // Record payment
    const { POST: postPaymentRoute } = await import('@/app/api/targets/payments/route');
    let req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({
        member_id: memberId,
        amount: 40000,
        quarter_id: testQuarter.id, date_paid: 1696118400000,
        method: 'cash',
        notes: 'Test payment to delete',
      }),
    } as any;

    let res = await postPaymentRoute(req);
    const paymentId = (await res.json()).id;

    // Verify initial standing
    let standing = getMemberStanding(memberId).find((s) => s.quarter.id === testQuarter.id);
    expect(standing?.paid).toBe(40000);

    // Act: Delete the payment
    const deleteRoute = await import('@/app/api/targets/payments/[id]/route');
    req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
    } as any;

    const deleteRes = await (deleteRoute.DELETE as any)(req, { params: Promise.resolve({ id: paymentId }) });
    expect(deleteRes.status).toBe(200);
    const deleteResult = await deleteRes.json();
    expect(deleteResult.success).toBe(true);

    // Verify payment is soft-deleted in DB
    const deletedPayment = db
      .prepare('SELECT * FROM target_payments WHERE id = ?')
      .get(paymentId) as any;
    expect(deletedPayment.deleted_at).not.toBeNull();

    // Verify standing updated (deleted payment should not count)
    standing = getMemberStanding(memberId).find((s) => s.quarter.id === testQuarter.id);
    expect(standing?.paid).toBe(0);
    expect(standing?.balance).toBe(50000); // 50000 - 0
  });

  it('admin can define monthly targets for a quarter and they must sum to quarterly target', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-monthly-test';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const adminSession = createSession(adminId);
    const { createQuarter } = await import('@/lib/targets');
    const testQuarter = createQuarter(`Monthly Test Quarter ${now}`, 1696118400000, 1704067199999, 300000);

    // Act: Create monthly targets that sum to quarterly target
    const monthsRoute = await import('@/app/api/admin/targets/quarters/[id]/months/route');
    let req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        months: [
          { name: 'July', target_amount: 150000 },
          { name: 'August', target_amount: 75000 },
          { name: 'September', target_amount: 75000 },
        ],
      }),
    } as any;

    const res = await (monthsRoute.POST as any)(req, { id: testQuarter.id });
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.months).toHaveLength(3);
    expect(result.total).toBe(300000); // Sum of all months
    expect(result.quarterTarget).toBe(300000);
    expect(result.isValid).toBe(true); // Sum matches quarterly target
  });

  it('monthly targets validation rejects mismatched sums', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-validation-test';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const adminSession = createSession(adminId);
    const { createQuarter } = await import('@/lib/targets');
    const testQuarter = createQuarter(`Validation Test Quarter ${now}`, 1696118400000, 1704067199999, 300000);

    // Act: Try to create monthly targets that DON'T sum to quarterly target
    const monthsRoute = await import('@/app/api/admin/targets/quarters/[id]/months/route');
    let req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        months: [
          { name: 'July', target_amount: 100000 },
          { name: 'August', target_amount: 100000 },
          // September intentionally missing - sum is 200000, not 300000
        ],
      }),
    } as any;

    const res = await (monthsRoute.POST as any)(req, { id: testQuarter.id });
    expect(res.status).toBe(400);
    const error = await res.json();
    expect(error.error).toContain('must sum to');
  });
});
