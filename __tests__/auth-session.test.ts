import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { seedOwner } from '@/lib/members';
import { GET as sessionApi } from '@/app/api/auth/session/route';

const mockReq = (sessionId?: string) =>
  ({
    cookies: { get: (n: string) => (n === 'session_id' && sessionId ? { value: sessionId } : undefined) },
  }) as any;

describe('GET /api/auth/session — must_change_password', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
    initializeDb();
  });

  it('reports must_change_password=true for a freshly seeded owner', async () => {
    const owner = await seedOwner({ email: 'owner@possyrabat.local', password: 'bootstrap' });
    const sessionId = createSession(owner.id).id;

    const res = await sessionApi(mockReq(sessionId));
    const body = await res.json();

    expect(body.authenticated).toBe(true);
    expect(body.member.must_change_password).toBe(true);
  });
});
