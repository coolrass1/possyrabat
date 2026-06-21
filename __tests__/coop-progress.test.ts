import db from '@/lib/db';
import { initializeDb } from '@/lib/db';
import { createQuarter, recordPayment, getOverview, getMemberImpact } from '@/lib/targets';
import { setGlobalTarget } from '@/lib/settings';
import { createSession } from '@/lib/auth';
import { GET as myImpactApi } from '@/app/api/targets/my-impact/route';

function addMember(id: string) {
  db.prepare(
    "INSERT INTO members (id, email, password_hash, name, role, status, created_at) VALUES (?, ?, 'h', ?, 'member', 'active', ?)"
  ).run(id, `${id}@t.local`, id, Date.now());
}

describe('Cooperative progress & personal impact', () => {
  let q1: string;
  let q2: string;

  beforeEach(() => {
    db.exec(`
      PRAGMA foreign_keys=OFF;
      DELETE FROM target_payments; DELETE FROM member_quarter_obligations;
      DELETE FROM members; DELETE FROM target_quarters; DELETE FROM target_months;
      DELETE FROM settings;
      PRAGMA foreign_keys=ON;
    `);
    initializeDb();
    q1 = createQuarter('Q3 2026', Date.UTC(2026, 6, 1), Date.UTC(2026, 8, 30), 600000).id;
    q2 = createQuarter('Q4 2026', Date.UTC(2026, 9, 1), Date.UTC(2026, 11, 31), 600000).id;
    addMember('m-alice');
    addMember('m-bob');
  });

  it('uses the configured lifetime target and sums raised cumulatively across all quarters', () => {
    setGlobalTarget(5000000, 'owner');
    recordPayment('m-alice', q1, null, 100000, Date.UTC(2026, 6, 5), 'cash', null, 'm-alice');
    recordPayment('m-bob', q2, null, 50000, Date.UTC(2026, 9, 5), 'cash', null, 'm-bob');

    const o = getOverview();
    expect(o.globalTarget).toBe(5000000);
    expect(o.globalRaised).toBe(150000); // cumulative across q1 + q2
  });

  it('computes personal impact: lifetime paid, share of pot, and toward-global', () => {
    setGlobalTarget(5000000, 'owner');
    recordPayment('m-alice', q1, null, 100000, Date.UTC(2026, 6, 5), 'cash', null, 'm-alice');
    recordPayment('m-bob', q2, null, 50000, Date.UTC(2026, 9, 5), 'cash', null, 'm-bob');

    const a = getMemberImpact('m-alice');
    expect(a.lifetime_paid).toBe(100000);
    expect(a.total_collected).toBe(150000);
    expect(a.share_of_pot).toBeCloseTo((100000 / 150000) * 100, 5);
    expect(a.toward_global).toBeCloseTo((100000 / 5000000) * 100, 5);
  });

  it('guards divide-by-zero: share-of-pot null when nothing collected, toward-global null when target unset', () => {
    // No payments, no target → launch state
    const empty = getMemberImpact('m-alice');
    expect(empty.lifetime_paid).toBe(0);
    expect(empty.share_of_pot).toBeNull(); // total collected is 0
    expect(empty.toward_global).toBeNull(); // lifetime target unset (0)

    // Money collected but lifetime target still unset
    recordPayment('m-alice', q1, null, 100000, Date.UTC(2026, 6, 5), 'cash', null, 'm-alice');
    const withMoney = getMemberImpact('m-alice');
    expect(withMoney.share_of_pot).toBe(100); // 100% of the pot
    expect(withMoney.toward_global).toBeNull(); // target still 0
  });

  it('GET /api/targets/my-impact returns the logged-in member impact', async () => {
    setGlobalTarget(5000000, 'owner');
    recordPayment('m-alice', q1, null, 100000, Date.UTC(2026, 6, 5), 'cash', null, 'm-alice');
    const sessionId = createSession('m-alice').id;
    const res = await myImpactApi({
      cookies: { get: (n: string) => (n === 'session_id' ? { value: sessionId } : undefined) },
    } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lifetime_paid).toBe(100000);
    expect(body.toward_global).toBeCloseTo(2, 5);
  });
});
