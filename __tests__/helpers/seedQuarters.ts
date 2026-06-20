import db from '@/lib/db';

// Test-only fixture. The app no longer seeds sample quarters/months on init
// (clean-slate policy, slice #20). Old-system suites that predate the
// re-baseline use this helper to recreate the quarters they relied on, until
// slices #21–#26 rewrite them against the new model.
export function seedDefaultQuarters(): void {
  const insertQ = db.prepare(`
    INSERT OR IGNORE INTO target_quarters (id, name, start_date, end_date, target_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertM = db.prepare(`
    INSERT OR IGNORE INTO target_months (id, quarter_id, name, target_amount, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const defaultQuarters = [
    { id: 'q3-2026', name: 'Q3 2026', start: 1782940800000, end: 1790812799000, target: 600000, months: [
      { id: 'm-jul-2026', name: 'July 2026', target: 200000 },
      { id: 'm-aug-2026', name: 'August 2026', target: 200000 },
      { id: 'm-sep-2026', name: 'September 2026', target: 200000 },
    ]},
    { id: 'q4-2026', name: 'Q4 2026', start: 1790812800000, end: 1798761599000, target: 600000, months: [
      { id: 'm-oct-2026', name: 'October 2026', target: 200000 },
      { id: 'm-nov-2026', name: 'November 2026', target: 200000 },
      { id: 'm-dec-2026', name: 'December 2026', target: 200000 },
    ]},
    { id: 'q1-2027', name: 'Q1 2027', start: 1798761600000, end: 1806537599000, target: 600000, months: [
      { id: 'm-jan-2027', name: 'January 2027', target: 200000 },
      { id: 'm-feb-2027', name: 'February 2027', target: 200000 },
      { id: 'm-mar-2027', name: 'March 2027', target: 200000 },
    ]},
    { id: 'q2-2027', name: 'Q2 2027', start: 1806537600000, end: 1814399999000, target: 600000, months: [
      { id: 'm-apr-2027', name: 'April 2027', target: 200000 },
      { id: 'm-may-2027', name: 'May 2027', target: 200000 },
      { id: 'm-jun-2027', name: 'June 2027', target: 200000 },
    ]},
    { id: 'q3-2027', name: 'Q3 2027', start: 1814400000000, end: 1822262399000, target: 600000, months: [
      { id: 'm-jul-2027', name: 'July 2027', target: 200000 },
      { id: 'm-aug-2027', name: 'August 2027', target: 200000 },
      { id: 'm-sep-2027', name: 'September 2027', target: 200000 },
    ]},
    { id: 'q4-2027', name: 'Q4 2027', start: 1822262400000, end: 1830211199000, target: 600000, months: [
      { id: 'm-oct-2027', name: 'October 2027', target: 200000 },
      { id: 'm-nov-2027', name: 'November 2027', target: 200000 },
      { id: 'm-dec-2027', name: 'December 2027', target: 200000 },
    ]},
  ];

  for (const q of defaultQuarters) {
    insertQ.run(q.id, q.name, q.start, q.end, q.target, now);
    for (const m of q.months) {
      insertM.run(m.id, q.id, m.name, m.target, now);
    }
  }
}
