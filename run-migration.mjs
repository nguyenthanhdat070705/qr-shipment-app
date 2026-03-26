/**
 * run-migration.mjs
 * Chạy SQL migration trực tiếp vào Supabase qua Management API
 */
import { readFileSync } from 'fs';

const PROJECT_REF = 'zspazvdyrrkdosqigomk';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

async function execSQL(query) {
  const url = `https://${PROJECT_REF}.supabase.co/rest/v1/`;
  
  // Dùng pg_execute workaround qua PostgREST RPC
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/pg_execute`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ddl: query })
  });
  
  return { status: res.status, body: await res.text() };
}

// Thử dùng Supabase SQL endpoint (nếu có)
async function execSQLDirect(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });
  
  const text = await res.text();
  return { status: res.status, body: text };
}

// Chạy từng CREATE TABLE riêng biệt qua insert trick
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  `https://${PROJECT_REF}.supabase.co`,
  SERVICE_KEY
);

// Đọc migration file
const migrationSQL = readFileSync('migration_1office_tables.sql', 'utf8');

console.log('=== Chay migration qua Supabase Management API ===');

// Thu dung REST truc tiep
const r = await execSQLDirect('SELECT version()');
console.log('Management API status:', r.status, r.body.slice(0,200));

// Neu khong co management API, tao bang thu cong qua insert/check
console.log('\nTao bang qua upsert workaround...');

// Test: create sync_logs manually by trying to insert
const testInsert = await sb.from('sync_logs').insert({
  sync_type: 'test',
  success: true,
  note: 'migration test'
}).select();

if (!testInsert.error) {
  console.log('sync_logs EXISTS!');
  // Xoa row test
  if (testInsert.data?.[0]?.id) {
    await sb.from('sync_logs').delete().eq('id', testInsert.data[0].id);
  }
} else {
  console.log('sync_logs MISSING:', testInsert.error.code, testInsert.error.message.slice(0,100));
  console.log('\nBan can chay migration_1office_tables.sql trong Supabase SQL Editor!');
  console.log('URL: https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new');
}
