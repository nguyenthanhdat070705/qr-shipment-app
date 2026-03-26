/**
 * run_migration_pg.mjs
 * Chạy SQL migration trực tiếp trên Supabase PostgreSQL
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Supabase connection string (project: zspazvdyrrkdosqigomk)
// Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
// Service role key password is the DB password part
const CONNECTION_STRING = 'postgresql://postgres.zspazvdyrrkdosqigomk:SUPABASE_DB_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const sql = readFileSync(path.join(ROOT, 'migration_1office_sync.sql'), 'utf-8');

console.log('📦 Kết nối Supabase PostgreSQL...');
console.log('');
console.log('⚠️  Để chạy migration trực tiếp, bạn cần mật khẩu Database.');
console.log('   Vào Supabase → Settings → Database → Database password');
console.log('');
console.log('Thay vào đó, hãy copy SQL từ file migration_1office_sync.sql');
console.log('và paste vào Supabase SQL Editor tại:');
console.log('https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new');
