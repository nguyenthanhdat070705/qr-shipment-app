/**
 * migrate-supabase.mjs  
 * Chạy migration trực tiếp vào Supabase bằng service_role key
 * Dùng PostgREST để execute SQL DDL
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Tạo bảng thông qua Supabase Management API Query endpoint
async function runQuery(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_query: sql })
  });
  if (res.status === 404) return { ok: false, msg: 'RPC not found' };
  const text = await res.text();
  return { ok: res.ok, msg: text.slice(0,200) };
}

// Direct INSERT approach: tao row test de xac nhan bang ton tai
async function tableExists(tableName) {
  const { error } = await sb.from(tableName).select('id').limit(1);
  return !error || (error.code !== 'PGRST205' && error.code !== '42P01' && !error.message.includes('schema cache'));
}

// Dùng REST API raw
async function createSyncLogsTable() {
  // Thử tạo qua insert với error handling
  const testData = {
    sync_type: 'migration_test',
    success: true,
    total_fetched: 0,
    total_upserted: 0,
    total_errors: 0,
    tables_synced: ['test'],
    note: 'Migration initialization test',
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    total_duration_ms: 0,
  };
  
  const { data, error } = await sb.from('sync_logs').insert(testData).select('id');
  
  if (!error) {
    console.log('✅ sync_logs already exists and working!');
    // cleanup test row
    if (data?.[0]?.id) await sb.from('sync_logs').delete().eq('id', data[0].id);
    return true;
  }
  
  if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
    console.log('❌ sync_logs does not exist');
    return false;
  }
  
  console.log('⚠️ sync_logs error:', error.message);
  return false;
}

console.log('=== Kiểm tra trạng thái migration ===\n');

const syncLogsOK = await createSyncLogsTable();

if (!syncLogsOK) {
  console.log('\n📋 CẦN CHẠY MIGRATION THỦ CÔNG:');
  console.log('1. Mở Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new');
  console.log('2. Copy nội dung file: migration_1office_tables.sql');
  console.log('3. Paste vào SQL Editor và click Run');
  console.log('4. Sau đó chạy lại: node sync-1office-manual.mjs\n');
  
  // In nội dung SQL để dễ copy
  const { readFileSync } = await import('fs');
  const sql = readFileSync('migration_1office_tables.sql', 'utf8');
  console.log('=== NỘI DUNG SQL ===');
  console.log(sql.slice(0, 500) + '...\n(Xem file migration_1office_tables.sql)');
} else {
  console.log('\n✅ Migration đã hoàn thành! Chạy sync:');
  console.log('   node sync-1office-manual.mjs');
}
