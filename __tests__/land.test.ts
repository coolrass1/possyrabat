import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Land Ownership Module', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM sessions;
      DELETE FROM members;
      DELETE FROM land;
      DELETE FROM land_ownership;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
  });

  it('admin can create a land asset with validation', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-land-test';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);

    const adminSession = createSession(adminId);
    const landRoute = await import('@/app/api/land/route');

    // Act: Create a land asset
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        name: 'Main Cooperative Land',
        location: 'District of Dakar',
        area: 5000,
      }),
    } as any;

    const res = await (landRoute.POST as any)(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe('Main Cooperative Land');
    expect(body.location).toBe('District of Dakar');
    expect(body.area).toBe(5000);

    // Verify in DB
    const land = db.prepare('SELECT * FROM land').get() as any;
    expect(land).toBeDefined();
    expect(land.name).toBe('Main Cooperative Land');
    expect(land.area).toBe(5000);
  });

  it('admin can assign member shares and calculate ownership percentage', async () => {
    const passwordHash = await hashPassword('password123');
    const adminId = 'admin-shares-test';
    const memberId1 = 'member-alice-shares';
    const memberId2 = 'member-bob-shares';
    const now = Date.now();

    // Create admin and members
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(adminId, 'admin@example.com', passwordHash, 'Admin', 'committee', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId1, 'alice@example.com', passwordHash, 'Alice', 'member', 'active', now);
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId2, 'bob@example.com', passwordHash, 'Bob', 'member', 'active', now);

    // Create land
    const landRoute = await import('@/app/api/land/route');
    const adminSession = createSession(adminId);
    let req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        name: 'Test Land',
        location: 'Test Location',
        area: 1000,
      }),
    } as any;

    let res = await (landRoute.POST as any)(req);
    const landId = (await res.json()).id;

    // Act: Assign shares to members
    const ownershipRoute = await import('@/app/api/land/ownership/route');
    req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: adminSession.id } : undefined),
      },
      json: async () => ({
        land_id: landId,
        member_id: memberId1,
        shares: 60,
      }),
    } as any;

    res = await (ownershipRoute.POST as any)(req);
    expect(res.status).toBe(201);
    let body = await res.json();
    expect(body.shares).toBe(60);
    expect(body.ownership_percentage).toBe(100); // 60 / 60 = 100% (only Alice so far)

    // Assign to second member
    req.json = async () => ({
      land_id: landId,
      member_id: memberId2,
      shares: 40,
    });

    res = await (ownershipRoute.POST as any)(req);
    body = await res.json();
    expect(body.shares).toBe(40);
    expect(body.ownership_percentage).toBe(40); // 40 / 100 = 40%

    // Verify first member's percentage updated
    req.json = async () => ({
      land_id: landId,
      member_id: memberId1,
    });
    req.method = 'GET';
    res = await (ownershipRoute.GET as any)(req);
    body = await res.json();
    const alice = body.find((o: any) => o.member_id === memberId1);
    expect(alice.ownership_percentage).toBe(60); // 60 / 100 = 60%
  });

  it('member can view their land holdings', async () => {
    const passwordHash = await hashPassword('password123');
    const memberId = 'member-alice-view';
    const now = Date.now();

    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(memberId, 'alice@example.com', passwordHash, 'Alice', 'member', 'active', now);

    const memberSession = createSession(memberId);

    // Create land and assign shares
    const landId = randomBytes(16).toString('hex');
    db.prepare('INSERT INTO land (id, name, location, area, created_at) VALUES (?, ?, ?, ?, ?)').run(
      landId,
      'Shared Land',
      'Location',
      2000,
      now
    );

    db.prepare(
      'INSERT INTO land_ownership (id, member_id, land_id, shares, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(randomBytes(16).toString('hex'), memberId, landId, 50, now, now);

    // Also add another member with 150 shares (total = 200)
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('member-bob-view', 'bob@example.com', passwordHash, 'Bob', 'member', 'active', now);
    db.prepare(
      'INSERT INTO land_ownership (id, member_id, land_id, shares, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(randomBytes(16).toString('hex'), 'member-bob-view', landId, 150, now, now);

    // Act: Member views their holdings
    const myHoldingsRoute = await import('@/app/api/land/my-holdings/route');
    const req = {
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const res = await (myHoldingsRoute.GET as any)(req);
    expect(res.status).toBe(200);
    const holdings = await res.json();
    expect(holdings).toHaveLength(1);
    expect(holdings[0].land.name).toBe('Shared Land');
    expect(holdings[0].shares).toBe(50);
    expect(holdings[0].ownership_percentage).toBe(25); // 50 / 200 = 25%
  });
});
