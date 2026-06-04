#!/usr/bin/env node
/**
 * Áp dụng migration getfly_khtt_orders lên Supabase qua RPC exec_sql.
 * Run: node scripts/apply_khtt_migration.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const H = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function runSQL(sql, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({ sql }),
  });
  const text = await res.text();
  console.log(`[${label}] ${res.status} ${text.slice(0, 120)}`);
  return res.ok;
}

async function tableExists() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/getfly_khtt_orders?select=id&limit=1`, { headers: H });
  return res.ok;
}

async function main() {
  const fullSql = readFileSync(path.join(ROOT, 'sql/migration_getfly_khtt_orders.sql'), 'utf-8');
  // exec_sql chạy 1 statement/lần → tách theo dấu ';' ở cuối dòng (bỏ comment thuần).
  const statements = fullSql
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter((s) => s.length > 0);

  console.log(`🚀 Applying ${statements.length} statements...`);
  for (let i = 0; i < statements.length; i++) {
    await runSQL(statements[i], `stmt ${i + 1}`);
  }

  const ok = await tableExists();
  if (ok) {
    console.log('\n✅ getfly_khtt_orders sẵn sàng.');
    return;
  }
  console.log('\n❌ Không tạo được bảng qua RPC (exec_sql không khả dụng).');
  console.log('👉 Mở Supabase SQL Editor và dán toàn bộ SQL dưới đây:');
  console.log('   https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new\n');
  console.log('─────────────────────────────────────────────────────────');
  console.log(fullSql);
  console.log('─────────────────────────────────────────────────────────');
  process.exit(1);
}

main().catch((e) => { console.error('💥', e); process.exit(1); });
