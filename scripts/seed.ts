import { initializeDb } from '../lib/db';
import { seedOwner } from '../lib/members';

// Clean-slate bootstrap (slice #20). No sample members, contributions, quarters,
// or expenses are seeded. The only account created is a single owner, from
// env-configured credentials, flagged to change its password on first login.
async function seed() {
  console.log('🌱 Initializing schema and seeding bootstrap owner...');

  const email = process.env.OWNER_EMAIL ?? 'owner@possyrabat.local';
  const password = process.env.OWNER_PASSWORD ?? 'change-me-now';
  const name = process.env.OWNER_NAME ?? 'Owner';

  if (!process.env.OWNER_PASSWORD) {
    console.warn(
      '⚠️  OWNER_PASSWORD not set — using a default. The owner must change it on first login.'
    );
  }

  initializeDb();
  const owner = await seedOwner({ email, password, name });

  console.log(`✅ Bootstrap owner ready: ${owner.email} (role: ${owner.role})`);
  console.log('   Log in and change the password immediately.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
