import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);
  const migrationSQL = fs.readFileSync('migrate-schema.sql', 'utf-8');

  console.log('Running migration...');
  console.log(migrationSQL);

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 50)}...`);
    try {
      await sql(statement);
      console.log('✓ Success');
    } catch (error) {
      console.error('✗ Error:', error);
    }
  }

  console.log('Migration complete!');
}

runMigration().catch(console.error);
