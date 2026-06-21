import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Fund Balance & Allocation', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM target_payments; DELETE FROM expenses; DELETE FROM fund_settings; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('member views fund balance calculated from payments - expenses', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-1';
    const memberId = 'member-1';

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 'committee', Date.now());
    insertMemberStmt.run(memberId, 'alice@example.com', passwordHash, 'Alice', 'member', Date.now());

    const insertContribStmt = db.prepare(
      'INSERT INTO target_payments (id, member_id, amount, date_paid, method, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertContribStmt.run(randomBytes(8).toString('hex'), memberId, 1000, Date.now(), 'transfer', committeeId, Date.now());
    insertContribStmt.run(randomBytes(8).toString('hex'), memberId, 500, Date.now(), 'transfer', committeeId, Date.now());

    const insertExpenseStmt = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Legal fees', 300, 'court_case', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Fencing', 200, 'construction', Date.now(), committeeId, Date.now());

    const memberSession = createSession(memberId);
    const { GET: getBalance } = await import('@/app/api/fund/balance/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getBalance(request);
    expect(response.status).toBe(200);
    const balance = await response.json();

    expect(balance).toMatchObject({
      total_in: 1500,
      total_out: 500,
      balance: 1000,
      currency: 'EUR',
    });
  });

  it('member views spending allocation by aim', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-2';
    const memberId = 'member-2';

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 'committee', Date.now());
    insertMemberStmt.run(memberId, 'bob@example.com', passwordHash, 'Bob', 'member', Date.now());

    const insertExpenseStmt = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Legal fees', 300, 'court_case', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'More legal', 200, 'court_case', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Fencing', 150, 'construction', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Security guard', 100, 'security', Date.now(), committeeId, Date.now());
    insertExpenseStmt.run(randomBytes(8).toString('hex'), 'Office supplies', 50, 'general', Date.now(), committeeId, Date.now());

    const memberSession = createSession(memberId);
    const { GET: getAllocation } = await import('@/app/api/fund/allocation/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getAllocation(request);
    expect(response.status).toBe(200);
    const allocation = await response.json();

    expect(allocation).toMatchObject({
      court_case: 500,
      construction: 150,
      security: 100,
      general: 50,
      total: 800,
      currency: 'EUR',
    });
  });
});

describe('Fund custodian', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM target_payments; DELETE FROM fund_settings; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('committee sets custodian; all members can read it', async () => {
    const passwordHash = await hashPassword('test123');
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('committee-c', 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('member-c', 'm@example.com', passwordHash, 'Member', 'member', now);

    const committeeSession = createSession('committee-c');
    const { PATCH } = await import('@/app/api/admin/fund/custodian/route');
    const patchReq = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: committeeSession.id } : undefined) },
      json: async () => ({ custodian_name: 'Banque Populaire', account_masked: '****4321', last_reconciled_at: now }),
    } as any;
    const patchRes = await PATCH(patchReq);
    expect(patchRes.status).toBe(200);

    const memberSession = createSession('member-c');
    const { GET } = await import('@/app/api/fund/custodian/route');
    const getReq = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: memberSession.id } : undefined) },
    } as any;
    const custodian = await (await GET(getReq)).json();

    expect(custodian).toMatchObject({
      custodian_name: 'Banque Populaire',
      account_masked: '****4321',
      last_reconciled_at: now,
    });
  });

  it('regular member cannot set custodian', async () => {
    const passwordHash = await hashPassword('test123');
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('member-c2', 'm2@example.com', passwordHash, 'Member', 'member', now);

    const memberSession = createSession('member-c2');
    const { PATCH } = await import('@/app/api/admin/fund/custodian/route');
    const req = {
      cookies: { get: (n: string) => (n === 'session_id' ? { value: memberSession.id } : undefined) },
      json: async () => ({ custodian_name: 'Hacked Bank' }),
    } as any;
    expect((await PATCH(req)).status).toBe(403);
  });
});

describe('Soft-deleted entries excluded from fund totals', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM target_payments; DELETE FROM expenses; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('a soft-deleted expense does not count in balance or allocation', async () => {
    const passwordHash = await hashPassword('test123');
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('m-fund', 'm@example.com', passwordHash, 'Member', 'member', now);

    // €1000 in
    db.prepare(
      'INSERT INTO target_payments (id, member_id, amount, date_paid, method, recorded_by, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(randomBytes(8).toString('hex'), 'm-fund', 1000, now, 'transfer', 'm-fund', now, null);

    // One live €300 court expense, one soft-deleted €500 construction expense
    const insExp = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    insExp.run(randomBytes(8).toString('hex'), 'Legal', 300, 'court_case', now, 'm-fund', now, null);
    insExp.run(randomBytes(8).toString('hex'), 'Voided fence', 500, 'construction', now, 'm-fund', now, now);

    const session = createSession('m-fund');
    const mkReq = () => ({
      cookies: { get: (n: string) => (n === 'session_id' ? { value: session.id } : undefined) },
    } as any);

    const { GET: getBalance } = await import('@/app/api/fund/balance/route');
    const balance = await (await getBalance(mkReq())).json();
    // Out is only the live 300, not 800
    expect(balance.total_out).toBe(300);
    expect(balance.balance).toBe(700);

    const { GET: getAllocation } = await import('@/app/api/fund/allocation/route');
    const allocation = await (await getAllocation(mkReq())).json();
    expect(allocation.construction).toBe(0);
    expect(allocation.court_case).toBe(300);
    expect(allocation.total).toBe(300);
  });
});
