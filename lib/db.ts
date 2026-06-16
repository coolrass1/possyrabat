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
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (recorded_by) REFERENCES members(id)
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
      FOREIGN KEY (recorded_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS fund_settings (
      id TEXT PRIMARY KEY,
      custodian_name TEXT,
      account_masked TEXT,
      last_reconciled_at INTEGER,
      updated_at INTEGER NOT NULL
    );
  `);
}

export default db;
