/**
 * run-migration-pg.mjs
 * Chạy SQL migration trực tiếp qua PostgreSQL connection của Supabase
 */
import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Supabase PostgreSQL connection string
// Format: postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
// Password = service role key hoặc database password
// Dùng connection pooler (port 6543)

const client = new Client({
  connectionString: 'postgresql://postgres.zspazvdyrrkdosqigomk:Nguyenthanhdat0707@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

console.log('Connecting to Supabase PostgreSQL...');

try {
  await client.connect();
  console.log('Connected!');
  
  const sql = readFileSync('migration_1office_tables.sql', 'utf8');
  
  // Tach thanh tung statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`Running ${statements.length} SQL statements...`);
  
  let ok = 0, errors = 0;
  for (const stmt of statements) {
    try {
      await client.query(stmt);
      ok++;
      process.stdout.write(`\r✅ ${ok}/${statements.length}`);
    } catch(e) {
      if (e.message.includes('already exists') || e.message.includes('IF NOT EXISTS')) {
        ok++; // Expected
      } else {
        console.error(`\n⚠️ SQL error: ${e.message.slice(0,100)}`);
        errors++;
      }
    }
  }
  
  console.log(`\n\nMigration done: ${ok} ok, ${errors} errors`);
  
  // Verify tables
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('\nTables in DB:');
  res.rows.forEach(r => console.log(' -', r.table_name));
  
} catch(e) {
  console.error('Connection error:', e.message);
  console.log('\nBạn cần chạy migration_1office_tables.sql thủ công tại:');
  console.log('https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new');
} finally {
  await client.end();
}
