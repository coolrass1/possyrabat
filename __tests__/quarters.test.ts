import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import {
  createQuarter,
  createMonth,
  getActiveQuarter,
  checkMonthlySum,
  quartersOverlap,
} from '@/lib/targets';

// Helper: reset the targets-related tables to a clean slate WITHOUT re-seeding,
// so each test controls exactly which quarters exist.
function resetTargets() {
  db.exec(`
    PRAGMA foreign_keys=OFF;
    DELETE FROM sessions;
    DELETE FROM members;
    DELETE FROM target_quarters;
    DELETE FROM target_months;
    DELETE FROM member_quarter_obligations;
    DELETE FROM contributions;
    PRAGMA foreign_keys=ON;
  `);
}

const DAY = 24 * 60 * 60 * 1000;

describe('Quarter & monthly-target configuration (issue #21)', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    resetTargets();
  });

  describe('Overlap rejection', () => {
    it('rejects a quarter whose dates overlap an existing quarter', () => {
      createQuarter('Q3 2026', 1000, 2000, 600000);
      expect(() => createQuarter('Overlapping', 1500, 2500, 600000)).toThrow(/overlap/i);
    });

    it('rejects a quarter fully contained within an existing quarter', () => {
      createQuarter('Outer', 1000, 5000, 600000);
      expect(() => createQuarter('Inner', 2000, 3000, 600000)).toThrow(/overlap/i);
    });

    it('allows adjacent, non-overlapping quarters', () => {
      createQuarter('First', 1000, 2000, 600000);
      expect(() => createQuarter('Second', 2001, 3000, 600000)).not.toThrow();
    });

    it('exposes quartersOverlap as a pure helper', () => {
      expect(quartersOverlap(1000, 2000, 1500, 2500)).toBe(true);
      expect(quartersOverlap(1000, 2000, 2001, 3000)).toBe(false);
      expect(quartersOverlap(1000, 2000, 2000, 3000)).toBe(true); // boundary inclusive
    });
  });

  describe('Soft monthly-sum hint (non-blocking)', () => {
    it('reports a match when months sum to the quarterly target', () => {
      const q = createQuarter('Q', 1000, 2000, 300000);
      createMonth(q.id, 'M1', 100000);
      createMonth(q.id, 'M2', 100000);
      createMonth(q.id, 'M3', 100000);
      const hint = checkMonthlySum(q.id);
      expect(hint.matches).toBe(true);
      expect(hint.monthlyTotal).toBe(300000);
      expect(hint.quarterTarget).toBe(300000);
      expect(hint.difference).toBe(0);
    });

    it('reports a mismatch hint WITHOUT throwing when months do not sum', () => {
      const q = createQuarter('Q', 1000, 2000, 300000);
      createMonth(q.id, 'M1', 100000);
      createMonth(q.id, 'M2', 100000);
      // missing third month -> total 200000
      const hint = checkMonthlySum(q.id);
      expect(hint.matches).toBe(false);
      expect(hint.monthlyTotal).toBe(200000);
      expect(hint.quarterTarget).toBe(300000);
      expect(hint.difference).toBe(-100000);
    });
  });

  describe('Active-quarter resolution', () => {
    it('returns the quarter whose [start,end] contains today (containing case)', () => {
      const now = Date.now();
      createQuarter('Past', now - 100 * DAY, now - 50 * DAY, 600000);
      const current = createQuarter('Current', now - 10 * DAY, now + 10 * DAY, 600000);
      createQuarter('Future', now + 50 * DAY, now + 100 * DAY, 600000);

      const active = getActiveQuarter();
      expect(active).not.toBeNull();
      expect(active!.id).toBe(current.id);
      expect(active!.is_upcoming).toBe(false);
    });

    it('falls back to the next upcoming quarter (labeled upcoming) when none contains today', () => {
      const now = Date.now();
      createQuarter('Past', now - 100 * DAY, now - 50 * DAY, 600000);
      const soon = createQuarter('Soon', now + 5 * DAY, now + 30 * DAY, 600000);
      createQuarter('Later', now + 60 * DAY, now + 100 * DAY, 600000);

      const active = getActiveQuarter();
      expect(active).not.toBeNull();
      expect(active!.id).toBe(soon.id); // nearest upcoming, not the later one
      expect(active!.is_upcoming).toBe(true);
    });

    it('falls back to the most-recent past quarter when nothing contains today and none upcoming', () => {
      const now = Date.now();
      createQuarter('Older', now - 200 * DAY, now - 150 * DAY, 600000);
      const recent = createQuarter('Recent', now - 100 * DAY, now - 50 * DAY, 600000);

      const active = getActiveQuarter();
      expect(active).not.toBeNull();
      expect(active!.id).toBe(recent.id); // most recent past
      expect(active!.is_upcoming).toBe(false);
    });

    it('returns null when there are no quarters', () => {
      expect(getActiveQuarter()).toBeNull();
    });
  });
});

describe('Quarters API route — overlap & authorization (issue #21)', () => {
  beforeAll(() => {
    initializeDb();
  });

  beforeEach(() => {
    resetTargets();
  });

  const mockReq = (sessionId: string | null, body?: any) =>
    ({
      cookies: {
        get: (name: string) =>
          name === 'session_id' && sessionId ? { value: sessionId } : undefined,
      },
      json: async () => body,
    }) as any;

  it('rejects overlapping quarter creation with a clear error via the route', async () => {
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('admin-q', 'adminq@example.com', 'hash', 'Admin', 'committee', now);
    const adminSession = createSession('admin-q');

    createQuarter('Existing', 1000, 2000, 600000);

    const { POST } = await import('@/app/api/targets/quarters/route');
    const res = await POST(
      mockReq(adminSession.id, {
        name: 'Clashing',
        start_date: 1500,
        end_date: 2500,
        target_amount: 600000,
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toMatch(/overlap/i);
  });

  it('forbids regular members from creating a quarter', async () => {
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('member-q', 'memberq@example.com', 'hash', 'Member', 'member', now);
    const memberSession = createSession('member-q');

    const { POST } = await import('@/app/api/targets/quarters/route');
    const res = await POST(
      mockReq(memberSession.id, {
        name: 'NoGo',
        start_date: 1000,
        end_date: 2000,
        target_amount: 600000,
      })
    );
    expect(res.status).toBe(403);
  });

  it('allows an admin to create a non-overlapping quarter', async () => {
    const now = Date.now();
    db.prepare(
      'INSERT INTO members (id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('admin-ok', 'adminok@example.com', 'hash', 'Admin', 'owner', now);
    const adminSession = createSession('admin-ok');

    const { POST } = await import('@/app/api/targets/quarters/route');
    const res = await POST(
      mockReq(adminSession.id, {
        name: 'Fresh Quarter',
        start_date: 9_000_000,
        end_date: 9_100_000,
        target_amount: 600000,
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Fresh Quarter');
  });
});
