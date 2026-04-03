/**
 * REBUILD DATABASE v2-testing
 * Dùng pg (node-postgres) để chạy DDL trực tiếp
 * 
 * Cách chạy: node scripts/rebuild_db_pg.mjs
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Supabase PostgreSQL connection string
// Format: postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres.woqtdgzldkxmcgjshthx:YOUR_DB_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

if (DATABASE_URL.includes('YOUR_DB_PASSWORD')) {
  console.error('❌ Vui lòng cung cấp DATABASE_URL!');
  console.error('');
  console.error('Cách lấy: Supabase Dashboard → Settings → Database → Connection string (URI)');
  console.error('');
  console.error('Chạy lệnh:');
  console.error('  $env:DATABASE_URL="postgresql://postgres.woqtdgzldkxmcgjshthx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"');
  console.error('  node scripts/rebuild_db_pg.mjs');
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function run() {
  console.log('\n🔄 REBUILD DATABASE v2-testing');
  console.log('🎯 Connecting to PostgreSQL...\n');
  
  await client.connect();
  console.log('✅ Connected!\n');

  // Read SQL file
  const sqlFile = fs.readFileSync(
    path.join(__dirname, '..', 'sql', 'V2_REBUILD_DATABASE.sql'), 
    'utf-8'
  );

  // Execute the entire file as one transaction
  try {
    await client.query('BEGIN');
    await client.query(sqlFile);
    await client.query('COMMIT');
    console.log('✅ All SQL executed successfully!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error executing SQL:', err.message);
    console.error('Transaction rolled back.\n');
    
    // Try executing statement by statement
    console.log('🔄 Retrying statement by statement...\n');
    
    const statements = sqlFile
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const cleaned = s.replace(/--[^\n]*/g, '').replace(/\r/g, '').trim();
        return cleaned.length > 0;
      });

    let success = 0, failed = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      const label = stmt.replace(/\s+/g, ' ').substring(0, 80);
      
      try {
        await client.query(stmt);
        console.log(`✅ [${i+1}/${statements.length}] ${label}`);
        success++;
      } catch (err2) {
        console.log(`❌ [${i+1}/${statements.length}] ${label}`);
        console.log(`   Error: ${err2.message}`);
        failed++;
      }
    }
    
    console.log(`\n═══════════════════════════════`);
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed:  ${failed}`);
    console.log(`═══════════════════════════════`);
  }

  // Verify tables
  console.log('\n🔍 Verifying tables...');
  const { rows } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log(`\n📋 ${rows.length} tables found:`);
  rows.forEach(r => console.log(`  ✅ ${r.table_name}`));
  
  await client.end();
  console.log('\n🎉 Done! Database rebuild complete.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
