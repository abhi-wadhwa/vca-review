import { sql as vercelSql } from '@vercel/postgres';
import * as fs from 'fs';

async function runMigration() {
  // Read .env file manually
  const envContent = fs.readFileSync('.env', 'utf-8');
  const DATABASE_URL = envContent
    .split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    ?.split('=')[1]
    .trim();

  if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
  }

  process.env.POSTGRES_URL = DATABASE_URL;

  const migrationSQL = fs.readFileSync('migrate-schema.sql', 'utf-8');

  console.log('Running migration...');
  console.log(migrationSQL);
  console.log('');

  // Split by semicolons and execute each statement
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 60)}...`);
    try {
      await vercelSql.query(statement);
      console.log('✓ Success');
    } catch (error: any) {
      console.error('✗ Error:', error.message);
    }
  }

  console.log('\nMigration complete!');
  process.exit(0);
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
