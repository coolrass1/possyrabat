import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import {
  createQuarter,
  recordPayment,
  getMemberStanding,
  updatePayment,
  softDeletePayment,
} from '@/lib/targets';

function auditFor(paymentId: string) {
  return db
    .prepare("SELECT * FROM audit_log WHERE entity_type = 'target_payment' AND entity_id = ? ORDER BY created_at ASC")
    .all(paymentId) as Array<{ action: string; before_values: string | null; after_values: string }>;
}

function addMember(id: string, parcels = 0) {
  db.prepare(
    'INSERT INTO members (id, email, password_hash, name, parcel_count, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, `${id}@test.local`, 'hash', id, parcels, 'member', 'active', Date.now());
}

describe('Target payments', () => {
  let quarterId: string;

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM target_payments;
      DELETE FROM contributions;
      DELETE FROM member_quarter_obligations;
      DELETE FROM members;
      DELETE FROM target_quarters;
      DELETE FROM target_months;
      DELETE FROM audit_log;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
    quarterId = createQuarter('Q3 2026', 1782940800000, 1790812799000, 600000).id;
    addMember('m-alice');
    db.prepare(
      "INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES ('admin', 'admin@test.local', 'hash', 'Admin', 'committee', 'active', ?)"
    ).run(Date.now());
  });

  it('records a payment into target_payments (not contributions) and reflects it in the standing, even with no obligation set', () => {
    recordPayment('m-alice', quarterId, null, 100000, 1783000000000, 'cash', 'first', 'admin');

    const inTarget = db.prepare('SELECT COUNT(*) AS n FROM target_payments WHERE deleted_at IS NULL').get() as { n: number };
    const inContrib = db.prepare('SELECT COUNT(*) AS n FROM contributions').get() as { n: number };
    expect(inTarget.n).toBe(1);
    expect(inContrib.n).toBe(0);

    const standing = getMemberStanding('m-alice').find((s) => s.quarter.id === quarterId)!;
    expect(standing.obligation).toBe(0); // no obligation set
    expect(standing.paid).toBe(100000); // payment still counts

    const audit = auditFor(standing.payments[0].id);
    expect(audit).toHaveLength(1);
    expect(audit[0].action).toBe('created');
  });

  it('edits a payment (including re-attributing the quarter) and writes a before→after audit entry', () => {
    const otherQuarter = createQuarter('Q4 2026', 1790812800000, 1798761599000, 600000).id;
    const p = recordPayment('m-alice', quarterId, null, 50000, 1783000000000, 'cash', null, 'admin');

    const updated = updatePayment(p.id, { amount: 80000, quarter_id: otherQuarter }, 'admin')!;
    expect(updated.amount).toBe(80000);
    expect(updated.quarter_id).toBe(otherQuarter);
    expect(updated.updated_by).toBe('admin');

    // Standing moved from the original quarter to the new one
    const standings = getMemberStanding('m-alice');
    expect(standings.find((s) => s.quarter.id === quarterId)!.paid).toBe(0);
    expect(standings.find((s) => s.quarter.id === otherQuarter)!.paid).toBe(80000);

    const audit = auditFor(p.id);
    expect(audit.map((a) => a.action)).toEqual(['created', 'updated']);
    const upd = audit[1];
    expect(JSON.parse(upd.before_values!).amount).toBe(50000);
    expect(JSON.parse(upd.before_values!).quarter_id).toBe(quarterId);
    expect(JSON.parse(upd.after_values).amount).toBe(80000);
    expect(JSON.parse(upd.after_values).quarter_id).toBe(otherQuarter);
  });

  it('soft-deletes a payment so it is excluded from totals, and audits the deletion', () => {
    const p = recordPayment('m-alice', quarterId, null, 40000, 1783000000000, 'cash', null, 'admin');
    expect(getMemberStanding('m-alice').find((s) => s.quarter.id === quarterId)!.paid).toBe(40000);

    const deleted = softDeletePayment(p.id, 'admin')!;
    expect(deleted.deleted_at).toBeGreaterThan(0);

    expect(getMemberStanding('m-alice').find((s) => s.quarter.id === quarterId)!.paid).toBe(0);
    expect(auditFor(p.id).map((a) => a.action)).toEqual(['created', 'deleted']);
  });
});
