const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

function initializeDb() {
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
  `);
}

async function seed() {
  console.log('🌱 Initializing and seeding database...');

  initializeDb();

  const now = Date.now();
  const committee = {
    id: 'committee-admin',
    email: 'admin@possyrabat.local',
    name: 'Administrator',
    password: 'admin123',
  };

  const members = [
    {
      id: 'member-alice',
      email: 'alice@possyrabat.local',
      name: 'Alice Smith',
      password: 'alice123',
      parcelCount: 4,
    },
    {
      id: 'member-bob',
      email: 'bob@possyrabat.local',
      name: 'Bob Johnson',
      password: 'bob123',
      parcelCount: 6,
    },
    {
      id: 'member-charlie',
      email: 'charlie@possyrabat.local',
      name: 'Charlie Davis',
      password: 'charlie123',
      parcelCount: 3,
    },
  ];

  const committeePasswordHash = bcrypt.hashSync(committee.password, 10);
  const insertMemberStmt = db.prepare(
    'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  try {
    insertMemberStmt.run(committee.id, committee.email, committeePasswordHash, committee.name, 0, 'committee', now);
    console.log('✅ Admin user created: admin@possyrabat.local / admin123');

    for (const member of members) {
      const passwordHash = bcrypt.hashSync(member.password, 10);
      insertMemberStmt.run(member.id, member.email, passwordHash, member.name, member.parcelCount, 'member', now);
      console.log(`✅ Member created: ${member.name} (${member.parcelCount} parcels) - ${member.email} / ${member.password}`);

      const insertContribStmt = db.prepare(
        'INSERT INTO contributions (id, member_id, amount, date, method, notes, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );

      const contributions = [
        { amount: 100, daysAgo: 30, note: 'Monthly contribution' },
        { amount: 100, daysAgo: 60, note: 'Monthly contribution' },
        { amount: 50, daysAgo: 15, note: 'Extra contribution' },
      ];

      for (const contrib of contributions) {
        const contribDate = now - contrib.daysAgo * 24 * 60 * 60 * 1000;
        insertContribStmt.run(
          randomBytes(16).toString('hex'),
          member.id,
          contrib.amount,
          contribDate,
          'transfer',
          contrib.note,
          committee.id,
          now
        );
      }
      console.log(`  └─ 3 contributions recorded (€250 total)`);
    }

    const insertExpenseStmt = db.prepare(
      'INSERT INTO expenses (id, description, amount, aim, date, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const expenses = [
      { desc: 'Legal consultation', amount: 500, aim: 'court_case', daysAgo: 20 },
      { desc: 'Court filing fees', amount: 300, aim: 'court_case', daysAgo: 15 },
      { desc: 'Perimeter fencing', amount: 800, aim: 'construction', daysAgo: 10 },
      { desc: 'Security camera', amount: 400, aim: 'security', daysAgo: 5 },
    ];

    for (const expense of expenses) {
      const expenseDate = now - expense.daysAgo * 24 * 60 * 60 * 1000;
      insertExpenseStmt.run(
        randomBytes(16).toString('hex'),
        expense.desc,
        expense.amount,
        expense.aim,
        expenseDate,
        committee.id,
        now
      );
    }
    console.log(`✅ ${expenses.length} expenses recorded (€2,000 total)`);

    console.log('\n📊 Database seed complete!');
    console.log('\n💰 Fund Status: In €2,750, Out €2,000, Balance €750');
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('⚠️  Database already seeded');
    } else {
      console.error('❌ Seed error:', err.message);
      process.exit(1);
    }
  }

  db.close();
}

seed();
