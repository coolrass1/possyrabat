import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import { createQuarter, listObligations, setObligation } from '@/lib/targets';

function addMember(id: string, name: string, parcels: number) {
  db.prepare(
    'INSERT INTO members (id, email, password_hash, name, parcel_count, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, `${id}@test.local`, 'hash', name, parcels, 'member', 'active', Date.now());
}

describe('Obligations grid', () => {
  let quarterId: string;

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM member_quarter_obligations;
      DELETE FROM members;
      DELETE FROM target_quarters;
      DELETE FROM target_months;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
    quarterId = createQuarter('Q3 2026', 1782940800000, 1790812799000, 600000).id;
  });

  it('lists every active member with their parcel count and current obligation for the quarter', () => {
    addMember('m-alice', 'Alice', 4);
    addMember('m-bob', 'Bob', 6);
    setObligation('m-alice', quarterId, 100000);

    const rows = listObligations(quarterId);

    const alice = rows.find((r) => r.member_id === 'm-alice')!;
    const bob = rows.find((r) => r.member_id === 'm-bob')!;

    expect(alice.parcel_count).toBe(4);
    expect(alice.amount_due).toBe(100000);

    expect(bob.parcel_count).toBe(6);
    expect(bob.amount_due).toBe(0); // no obligation set yet
  });
});
