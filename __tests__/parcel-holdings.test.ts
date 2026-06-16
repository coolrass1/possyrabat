import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';

const PARCEL_SIZE_M2 = 300;

describe('Parcel Holdings', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('committee can set member parcel count; member views holdings with m² calculation', async () => {
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-1';
    const memberId = 'member-1';

    const insertStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 0, 'committee', Date.now());
    insertStmt.run(memberId, 'alice@example.com', passwordHash, 'Alice', 0, 'member', Date.now());

    const committeeSession = createSession(committeeId);

    const { PATCH: patchParcelCount } = await import('@/app/api/admin/members/[id]/parcel-count/route');
    const updateRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: committeeSession.id } : undefined),
      },
      json: async () => ({ parcel_count: 4 }),
    } as any;

    const updateResponse = await patchParcelCount(updateRequest, { params: Promise.resolve({ id: memberId }) });
    expect(updateResponse.status).toBe(200);

    const memberSession = createSession(memberId);
    const { GET: getHoldings } = await import('@/app/api/parcel-holdings/route');
    const holdingsRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const holdingsResponse = await getHoldings(holdingsRequest);
    expect(holdingsResponse.status).toBe(200);
    const holdings = await holdingsResponse.json();

    expect(holdings).toMatchObject({
      parcel_count: 4,
      parcel_size_m2: PARCEL_SIZE_M2,
      total_m2: 1200,
    });
  });

  it('member cannot change their own parcel count', async () => {
    const passwordHash = await hashPassword('test123');
    const memberId = 'member-2';

    const insertStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(memberId, 'bob@example.com', passwordHash, 'Bob', 0, 'member', Date.now());

    const memberSession = createSession(memberId);

    const { PATCH: patchParcelCount } = await import('@/app/api/admin/members/[id]/parcel-count/route');
    const updateRequest = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
      json: async () => ({ parcel_count: 10 }),
    } as any;

    const updateResponse = await patchParcelCount(updateRequest, { params: Promise.resolve({ id: memberId }) });
    expect(updateResponse.status).toBe(403);
  });

  it('all members visible with parcel counts', async () => {
    const passwordHash = await hashPassword('test123');

    const insertStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run('member-3', 'alice@example.com', passwordHash, 'Alice', 4, 'member', Date.now());
    insertStmt.run('member-4', 'bob@example.com', passwordHash, 'Bob', 6, 'member', Date.now());
    insertStmt.run('member-5', 'charlie@example.com', passwordHash, 'Charlie', 2, 'member', Date.now());

    const memberSession = createSession('member-3');

    const { GET: getAllHoldings } = await import('@/app/api/parcel-holdings/all/route');
    const request = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getAllHoldings(request);
    expect(response.status).toBe(200);
    const members = await response.json();

    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBe(3);

    expect(members).toContainEqual({
      id: 'member-3',
      name: 'Alice',
      email: 'alice@example.com',
      parcel_count: 4,
      total_m2: 1200,
    });

    expect(members).toContainEqual({
      id: 'member-4',
      name: 'Bob',
      email: 'bob@example.com',
      parcel_count: 6,
      total_m2: 1800,
    });

    expect(members).toContainEqual({
      id: 'member-5',
      name: 'Charlie',
      email: 'charlie@example.com',
      parcel_count: 2,
      total_m2: 600,
    });
  });
});
