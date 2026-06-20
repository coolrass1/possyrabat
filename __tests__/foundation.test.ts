import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import { seedOwner, changePassword } from '@/lib/members';
import { verifyPassword } from '@/lib/auth';

const count = (table: string): number =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('Clean-slate initialization', () => {
  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM target_months;
      DELETE FROM target_quarters;
      DELETE FROM member_quarter_obligations;
      DELETE FROM members;
      DELETE FROM settings;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
  });

  it('seeds no sample quarters, months, or members', () => {
    expect(count('target_quarters')).toBe(0);
    expect(count('target_months')).toBe(0);
    expect(count('members')).toBe(0);
  });
});

describe('Owner bootstrap seed', () => {
  beforeEach(() => {
    db.exec('PRAGMA foreign_keys=OFF; DELETE FROM members; PRAGMA foreign_keys=ON;');
    initializeDb();
  });

  it('creates exactly one owner flagged to change password, idempotently', async () => {
    await seedOwner({ email: 'owner@possyrabat.local', password: 'bootstrap-secret' });
    await seedOwner({ email: 'owner@possyrabat.local', password: 'bootstrap-secret' });

    const owners = db
      .prepare("SELECT id, role, must_change_password FROM members WHERE role = 'owner'")
      .all() as Array<{ id: string; role: string; must_change_password: number }>;

    expect(owners).toHaveLength(1);
    expect(owners[0].role).toBe('owner');
    expect(owners[0].must_change_password).toBe(1);
  });

  it('clears the must-change-password flag and updates the hash on changePassword', async () => {
    const owner = await seedOwner({ email: 'owner@possyrabat.local', password: 'bootstrap-secret' });

    await changePassword(owner.id, 'a-new-strong-password');

    const row = db
      .prepare('SELECT password_hash, must_change_password FROM members WHERE id = ?')
      .get(owner.id) as { password_hash: string; must_change_password: number };

    expect(row.must_change_password).toBe(0);
    expect(await verifyPassword('a-new-strong-password', row.password_hash)).toBe(true);
    expect(await verifyPassword('bootstrap-secret', row.password_hash)).toBe(false);
  });
});
