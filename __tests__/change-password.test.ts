import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import { createSession, loginMember } from '@/lib/auth';
import { seedOwner } from '@/lib/members';
import { POST as changePasswordApi } from '@/app/api/auth/change-password/route';

const mockReq = (sessionId: string | undefined, body: any) =>
  ({
    cookies: { get: (n: string) => (n === 'session_id' && sessionId ? { value: sessionId } : undefined) },
    json: async () => body,
  }) as any;

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM sessions; DELETE FROM members; PRAGMA foreign_keys=ON;');
    initializeDb();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await changePasswordApi(mockReq(undefined, { new_password: 'a-strong-password' }));
    expect(res.status).toBe(401);
  });

  it('rejects a too-short new password', async () => {
    const owner = await seedOwner({ email: 'owner@possyrabat.local', password: 'bootstrap' });
    const sessionId = createSession(owner.id).id;
    const res = await changePasswordApi(mockReq(sessionId, { new_password: 'short' }));
    expect(res.status).toBe(400);
  });

  it('changes the password, clears the flag, and lets the user log in with the new password', async () => {
    const owner = await seedOwner({ email: 'owner@possyrabat.local', password: 'bootstrap' });
    const sessionId = createSession(owner.id).id;

    const res = await changePasswordApi(mockReq(sessionId, { new_password: 'a-strong-password' }));
    expect(res.status).toBe(200);

    const row = db.prepare('SELECT must_change_password FROM members WHERE id = ?').get(owner.id) as {
      must_change_password: number;
    };
    expect(row.must_change_password).toBe(0);

    const login = await loginMember('owner@possyrabat.local', 'a-strong-password');
    expect(login.success).toBe(true);
  });
});
