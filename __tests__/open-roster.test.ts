import db from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { initializeDb } from '@/lib/db';
import { randomBytes } from 'crypto';

describe('Open Roster & Contribution Transparency', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM contributions; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
  });

  it('member views open roster with obligation/paid/status', async () => {
    // Setup: create members with different contribution statuses
    const passwordHash = await hashPassword('test123');
    const committeeId = 'committee-1';
    const now = Date.now();
    const perParcelFee = 50; // €50 per parcel

    const insertMemberStmt = db.prepare(
      'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    
    insertMemberStmt.run(committeeId, 'admin@example.com', passwordHash, 'Admin', 0, 'committee', now);
    
    // Alice: 4 parcels, obligation €200, paid €200 (up to date)
    insertMemberStmt.run('member-alice', 'alice@example.com', passwordHash, 'Alice', 4, 'member', now);
    
    // Bob: 6 parcels, obligation €300, paid €200 (behind by €100)
    insertMemberStmt.run('member-bob', 'bob@example.com', passwordHash, 'Bob', 6, 'member', now);
    
    // Charlie: 3 parcels, obligation €150, paid €150 (up to date)
    insertMemberStmt.run('member-charlie', 'charlie@example.com', passwordHash, 'Charlie', 3, 'member', now);

    // Record contributions
    const insertContribStmt = db.prepare(
      'INSERT INTO contributions (id, member_id, amount, date, method, recorded_by, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    
    // Alice: €200
    insertContribStmt.run(randomBytes(16).toString('hex'), 'member-alice', 200, now, 'transfer', committeeId, now, null);
    
    // Bob: €200 (owes €100)
    insertContribStmt.run(randomBytes(16).toString('hex'), 'member-bob', 200, now, 'transfer', committeeId, now, null);
    
    // Charlie: €150
    insertContribStmt.run(randomBytes(16).toString('hex'), 'member-charlie', 150, now, 'transfer', committeeId, now, null);

    // Act: member views roster
    const memberSession = createSession('member-alice');
    const { GET: getRoster } = await import('@/app/api/contributions/open-roster/route');
    const request = {
      url: `http://localhost:3000/api/contributions/open-roster?fee=${perParcelFee}&page=1&limit=10`,
      cookies: {
        get: (name: string) => (name === 'session_id' ? { value: memberSession.id } : undefined),
      },
    } as any;

    const response = await getRoster(request);

    // Assert: roster shows all members with correct calculations
    expect(response.status).toBe(200);
    const roster = await response.json();

    expect(roster.items).toHaveLength(3);
    expect(roster.total).toBe(3);
    expect(roster.page).toBe(1);

    // Check Alice: up to date
    const alice = roster.items.find((m: any) => m.id === 'member-alice');
    expect(alice).toMatchObject({
      name: 'Alice',
      email: 'alice@example.com',
      parcel_count: 4,
      obligation: 200,
      paid: 200,
      balance: 0,
      status: 'up to date',
    });

    // Check Bob: behind
    const bob = roster.items.find((m: any) => m.id === 'member-bob');
    expect(bob).toMatchObject({
      name: 'Bob',
      email: 'bob@example.com',
      parcel_count: 6,
      obligation: 300,
      paid: 200,
      balance: -100,
      status: 'behind by €100',
    });

    // Check Charlie: up to date
    const charlie = roster.items.find((m: any) => m.id === 'member-charlie');
    expect(charlie).toMatchObject({
      name: 'Charlie',
      email: 'charlie@example.com',
      parcel_count: 3,
      obligation: 150,
      paid: 150,
      balance: 0,
      status: 'up to date',
    });
  });
});
