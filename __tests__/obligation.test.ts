import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Contribution Obligation', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM settings; DELETE FROM contributions; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('committee sets per-parcel fee in settings; it is retrievable', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-1';
    const now = Date.now();

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const committeeSession = createSession(committeeId);

    // Act: committee sets the per-parcel fee
    const { PATCH: patchSettings } = await import('@/app/api/admin/settings/route');
    const patchRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({ per_parcel_fee: 50 }),
    } as any;

    const patchResponse = await patchSettings(patchRequest);
    expect(patchResponse.status).toBe(200);

    // Act: anyone retrieves settings
    const { GET: getSettings } = await import('@/app/api/settings/route');
    const getRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
    } as any;

    const getResponse = await getSettings(getRequest);
    expect(getResponse.status).toBe(200);
    const settings = await getResponse.json();

    expect(settings).toMatchObject({
      per_parcel_fee: 50,
      currency: 'EUR',
    });
  });
});

describe('My Standing', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM settings; DELETE FROM contributions; DELETE FROM sessions; DELETE FROM members; DELETE FROM target_quarters; DELETE FROM target_months; DELETE FROM member_quarter_obligations; PRAGMA foreign_keys=ON;');
    initializeDb();
  });

  it('member views their standing: obligation, paid, balance, status (behind)', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-2';
    const memberId = 'member-bob';
    const now = Date.now();

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 0, 'committee', now);
    insertMemberStmt.run(memberId, 'bob@example.com', passwordHash, 'Bob', 6, 'member', now);

    // Set Bob's Q3 2026 obligation to €300
    const { setObligation, listQuarters } = await import('@/lib/targets');
    const q1 = listQuarters()[0]; // Q3 2026
    setObligation(memberId, q1.id, 300);

    // Bob paid €200 inside Q3 2026 timeline (July 2026) -> behind by €100
    const july2026Time = 1783000000000;
    db.prepare(
      'INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, deleted_at, quarter_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(randomBytes(16).toString('hex'), memberId, 200, july2026Time, 'transfer', committeeId, now, null, q1.id);

    const memberSession = createSession(memberId);
    const { GET: getStanding } = await import('@/app/api/contributions/my-standing/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getStanding(request);
    expect(response.status).toBe(200);
    const standing = await response.json();

    expect(standing).toMatchObject({
      obligation: 300,
      paid: 200,
      balance: 100,
      status: 'behind by €100',
    });
  });

  it('member standing shows up to date when paid meets obligation', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-3';
    const memberId = 'member-alice';
    const now = Date.now();

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 0, 'committee', now);
    insertMemberStmt.run(memberId, 'alice@example.com', passwordHash, 'Alice', 4, 'member', now);

    const { setObligation, listQuarters } = await import('@/lib/targets');
    const q1 = listQuarters()[0];
    setObligation(memberId, q1.id, 200);

    // Alice paid €200 = obligation
    const july2026Time = 1783000000000;
    db.prepare(
      'INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, deleted_at, quarter_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(randomBytes(16).toString('hex'), memberId, 200, july2026Time, 'transfer', committeeId, now, null, q1.id);

    const memberSession = createSession(memberId);
    const { GET: getStanding } = await import('@/app/api/contributions/my-standing/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getStanding(request);
    const standing = await response.json();

    expect(standing).toMatchObject({
      obligation: 200,
      paid: 200,
      balance: 0,
      status: 'up to date',
    });
  });
});

describe('Arrears List (committee)', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM settings; DELETE FROM contributions; DELETE FROM sessions; DELETE FROM members; DELETE FROM target_quarters; DELETE FROM target_months; DELETE FROM member_quarter_obligations; PRAGMA foreign_keys=ON;');
    initializeDb();
  });

  it('committee sees only members who are behind, with amount owed', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-4';
    const now = Date.now();

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 0, 'committee', now);
    insertMemberStmt.run('m-alice', 'alice@example.com', passwordHash, 'Alice', 4, 'member', now); // owes 200
    insertMemberStmt.run('m-bob', 'bob@example.com', passwordHash, 'Bob', 6, 'member', now);       // owes 300
    insertMemberStmt.run('m-carol', 'carol@example.com', passwordHash, 'Carol', 2, 'member', now); // owes 100

    const { setObligation, listQuarters } = await import('@/lib/targets');
    const q1 = listQuarters()[0]; // Q3 2026
    
    setObligation('m-alice', q1.id, 200);
    setObligation('m-bob', q1.id, 300);
    setObligation('m-carol', q1.id, 100);

    const insertContrib = db.prepare(
      'INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, deleted_at, quarter_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    // Alice fully paid (200) -> up to date, NOT in arrears
    insertContrib.run(randomBytes(16).toString('hex'), 'm-alice', 200, now, 'transfer', committeeId, now, null, q1.id);
    // Bob paid 100 -> behind by 200
    insertContrib.run(randomBytes(16).toString('hex'), 'm-bob', 100, now, 'transfer', committeeId, now, null, q1.id);
    // Carol paid nothing -> behind by 100

    const committeeSession = createSession(committeeId);
    const { GET: getArrears } = await import('@/app/api/admin/arrears/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
    } as any;

    const response = await getArrears(request);
    expect(response.status).toBe(200);
    const arrears = await response.json();

    // Only Bob and Carol are behind
    expect(arrears.items).toHaveLength(2);
    const bob = arrears.items.find((m: any) => m.id === 'm-bob');
    const carol = arrears.items.find((m: any) => m.id === 'm-carol');
    const alice = arrears.items.find((m: any) => m.id === 'm-alice');

    expect(alice).toBeUndefined();
    expect(bob).toMatchObject({ name: 'Bob', obligation: 300, paid: 100, owed: 200 });
    expect(carol).toMatchObject({ name: 'Carol', obligation: 100, paid: 0, owed: 100 });
    expect(arrears.total_owed).toBe(300);
  });

  it('regular member cannot access arrears list', async () => {
    const passwordHash = await hashPassword('test123');
    const memberId = 'm-solo';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'solo@example.com', passwordHash, 'Solo', 2, 'member', now);

    const memberSession = createSession(memberId);
    const { GET: getArrears } = await import('@/app/api/admin/arrears/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getArrears(request);
    expect(response.status).toBe(403);
  });
});
