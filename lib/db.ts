import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_URL || path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      photo_url TEXT,
      parcel_count INTEGER DEFAULT 0,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS estate_maps (
      id TEXT PRIMARY KEY,
      image_data TEXT NOT NULL,
      caption TEXT,
      uploaded_by TEXT NOT NULL,
      uploaded_at INTEGER NOT NULL,
      FOREIGN KEY (uploaded_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date INTEGER NOT NULL,
      method TEXT,
      notes TEXT,
      recorded_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      quarter_id TEXT,
      month_id TEXT,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (recorded_by) REFERENCES members(id),
      FOREIGN KEY (quarter_id) REFERENCES target_quarters(id),
      FOREIGN KEY (month_id) REFERENCES target_months(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      aim TEXT NOT NULL,
      date INTEGER NOT NULL,
      receipt_url TEXT,
      recorded_by TEXT NOT NULL,
      status TEXT DEFAULT 'recorded',
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (recorded_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS fund_settings (
      id TEXT PRIMARY KEY,
      custodian_name TEXT,
      account_masked TEXT,
      last_reconciled_at INTEGER,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      per_parcel_fee REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'EUR',
      enabled_sections TEXT,
      updated_by TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      opposing_party TEXT NOT NULL,
      court TEXT NOT NULL,
      stage TEXT NOT NULL,
      summary TEXT,
      opened_date INTEGER NOT NULL,
      next_hearing_date INTEGER,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (created_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS case_steps (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      date INTEGER NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      document_url TEXT,
      logged_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (case_id) REFERENCES cases(id),
      FOREIGN KEY (logged_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS case_documents (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (case_id) REFERENCES cases(id),
      FOREIGN KEY (uploaded_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS case_actions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      task TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      due_date INTEGER NOT NULL,
      status TEXT DEFAULT 'open',
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (case_id) REFERENCES cases(id),
      FOREIGN KEY (assigned_to) REFERENCES members(id),
      FOREIGN KEY (created_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_values TEXT,
      after_values TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (performed_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS statements (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      total_in REAL NOT NULL,
      total_out REAL NOT NULL,
      balance REAL NOT NULL,
      expenses_by_aim TEXT NOT NULL,
      contributors TEXT NOT NULL,
      html_content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(year, month)
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at INTEGER,
      error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      location TEXT,
      agenda TEXT,
      description TEXT,
      status TEXT DEFAULT 'Planned',
      attendees TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (created_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS meeting_decisions (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      description TEXT NOT NULL,
      decided_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id),
      FOREIGN KEY (decided_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS meeting_documents (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'other',
      mime_type TEXT,
      storage_path TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id),
      FOREIGN KEY (uploaded_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS meeting_actions (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      task TEXT NOT NULL,
      assigned_to TEXT,
      due_date INTEGER,
      status TEXT DEFAULT 'open',
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id),
      FOREIGN KEY (assigned_to) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date INTEGER NOT NULL,
      time TEXT NOT NULL,
      location TEXT,
      type TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (created_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      image_data TEXT,
      author_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (author_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      purpose TEXT,
      aim TEXT NOT NULL,
      target_amount REAL NOT NULL,
      deadline INTEGER,
      status TEXT DEFAULT 'active',
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (created_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      choices TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      deadline INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      FOREIGN KEY (created_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      choice TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      UNIQUE(poll_id, member_id),
      FOREIGN KEY (poll_id) REFERENCES polls(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS target_quarters (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      target_amount REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS target_months (
      id TEXT PRIMARY KEY,
      quarter_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (quarter_id) REFERENCES target_quarters(id)
    );

    CREATE TABLE IF NOT EXISTS member_quarter_obligations (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      quarter_id TEXT NOT NULL,
      amount_due REAL NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (quarter_id) REFERENCES target_quarters(id),
      UNIQUE(member_id, quarter_id)
    );

    CREATE TABLE IF NOT EXISTS land (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      area REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS land_ownership (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      land_id TEXT NOT NULL,
      shares INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (land_id) REFERENCES land(id),
      UNIQUE(member_id, land_id)
    );
  `);

  // Lightweight migrations for columns added after a table's first creation.
  // CREATE TABLE IF NOT EXISTS won't add columns to pre-existing tables, so
  // we add them here, ignoring the error if the column already exists.
  const addColumn = (sql: string) => {
    try {
      db.exec(sql);
    } catch {
      // column already exists — safe to ignore
    }
  };
  addColumn(`ALTER TABLE members ADD COLUMN status TEXT DEFAULT 'active'`);
  addColumn(`ALTER TABLE settings ADD COLUMN rules_text TEXT`);
  addColumn(`ALTER TABLE settings ADD COLUMN enabled_sections TEXT`);
  addColumn(`ALTER TABLE cases ADD COLUMN lawyer_name TEXT`);
  addColumn(`ALTER TABLE cases ADD COLUMN lawyer_contact TEXT`);
  addColumn(`ALTER TABLE case_documents ADD COLUMN mime_type TEXT`);
  addColumn(`ALTER TABLE contributions ADD COLUMN quarter_id TEXT`);
  addColumn(`ALTER TABLE contributions ADD COLUMN month_id TEXT`);
  addColumn(`ALTER TABLE meetings ADD COLUMN location TEXT`);
  addColumn(`ALTER TABLE meetings ADD COLUMN agenda TEXT`);
  addColumn(`ALTER TABLE meetings ADD COLUMN description TEXT`);
  addColumn(`ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'Planned'`);

  // Migrate historical contributions to match targets by dates
  try {
    db.exec(`
      UPDATE contributions
      SET quarter_id = (
        SELECT id FROM target_quarters
        WHERE contributions.date >= target_quarters.start_date
          AND contributions.date <= target_quarters.end_date
        LIMIT 1
      )
      WHERE quarter_id IS NULL;
    `);
  } catch (err) {
    console.error('Failed to migrate historical contributions:', err);
  }

  // Pre-populate target quarters and months if target_quarters is empty
  try {
    const quartersCount = db.prepare('SELECT COUNT(*) as count FROM target_quarters').get() as { count: number } | undefined;
    if (quartersCount && quartersCount.count === 0) {
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
  } catch (err) {
    console.error('Failed to pre-populate target quarters:', err);
  }

  // Pre-populate global settings and default enabled sections if needed
  try {
    const defaultSections = JSON.stringify([
      '/land',
      '/case',
      '/contributions',
      '/spending',
      '/meetings'
    ]);
    const existing = db.prepare('SELECT enabled_sections FROM settings WHERE id = ?').get('global') as any;
    if (!existing) {
      db.prepare(`
        INSERT INTO settings (id, per_parcel_fee, currency, enabled_sections, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('global', 0, 'EUR', defaultSections, Date.now());
    } else if (existing.enabled_sections === null || existing.enabled_sections === undefined) {
      db.prepare(`
        UPDATE settings SET enabled_sections = ? WHERE id = ?
      `).run(defaultSections, 'global');
    }
  } catch (err) {
    console.error('Failed to pre-populate global settings:', err);
  }
}

// Ensure the schema exists whenever the db module is loaded (idempotent).
// The app has no migration step, so this guarantees tables for every route.
initializeDb();

export default db;
