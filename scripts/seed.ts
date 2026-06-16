import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath);

async function seed() {
  console.log('🌱 Seeding database...');

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

  // Hash passwords and insert members
  const committeePasswordHash = await bcrypt.hash(committee.password, 10);
  const insertMemberStmt = db.prepare(
    'INSERT INTO members (id, email, password_hash, name, parcel_count, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  try {
    insertMemberStmt.run(committee.id, committee.email, committeePasswordHash, committee.name, 0, 'committee', now);
    console.log('✅ Admin user created');

    for (const member of members) {
      const passwordHash = await bcrypt.hash(member.password, 10);
      insertMemberStmt.run(member.id, member.email, passwordHash, member.name, member.parcelCount, 'member', now);
      console.log(`✅ Member created: ${member.name} (${member.parcelCount} parcels)`);

      // Record some contributions for each member
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
      console.log(`  └─ 3 contributions recorded`);
    }

    // Record some expenses
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
    console.log(`✅ ${expenses.length} expenses recorded`);

    console.log('\n📊 Database seed complete!');
    console.log('\nTest credentials:');
    console.log(`Admin: ${committee.email} / ${committee.password}`);
    members.forEach((m) => console.log(`${m.name}: ${m.email} / ${m.password}`));
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('⚠️  Database already seeded, skipping...');
    } else {
      console.error('❌ Seed error:', err);
      process.exit(1);
    }
  }

  db.close();
}

seed();
