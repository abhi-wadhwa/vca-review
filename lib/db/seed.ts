import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import * as schema from './schema';

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  console.log('Seeding database...');

  // Check if admin already exists
  const existingAdmin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.username, adminUsername),
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping...');
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await db.insert(schema.users).values({
    username: adminUsername,
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
    isActive: true,
  });

  console.log(`Admin user created: ${adminUsername}`);
  console.log('Seeding complete!');
}

seed().catch(console.error);
