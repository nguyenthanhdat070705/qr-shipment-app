#!/usr/bin/env node
/**
 * Sync Getfly accounts to Supabase via RPC
 * Run: node scripts/sync-accounts.mjs
 */

import { createClient } from '@supabase/supabase-js';

const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';
const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function str(val) {
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim();
}
function num(val) {
  if (val === undefined || val === null || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function mapAccount(a) {
  const c = (a.contacts || [])[0] || {};
  return {
    getfly_account_id: str(a.account_id) || str(a.id),
    account_code: str(a.account_code),
    account_name: str(a.account_name),
    phone: str(a.phone),
    email: str(a.email),
    address: str(a.address),
    description: str(a.description),
    account_type: str(a.account_type),
    account_source: str(a.account_source),
    relation_name: str(a.relation_name),
    industry_name: str(a.industry_name),
    manager_email: str(a.manager_email),
    manager_user_name: str(a.manager_user_name),
    ma_hoi_vien: str(a.ma_hoi_vien),
    goi_dich_vu: str(a.goi_dich_vu),
    trang_thai_hoi_vien: str(a.trang_thai_hoi_vien),
    ngay_tham_gia: str(a.ngay_tham_gia),
    ho_ten_nguoi_mat: str(a.ho_ten_nguoi_mat),
    ngay_mat: str(a.ngay_mat),
    thoi_gian_to_chuc_dam: str(a.thoi_gian_to_chuc_dam),
    dia_chi_chon_cat: str(a.dia_chi_chon_cat),
    dia_chi_lien_he: str(a.dia_chi_lien_he),
    so_cccd: str(a.so_cccd),
    so_tk_ngan_hang: str(a.so_tk_ngan_hang),
    ten_ngan_hang: str(a.ten_ngan_hang),
    contact_name: str(c.first_name),
    contact_phone: str(c.phone_mobile || c.phone_home),
    province_name: str(a.province_name),
    revenue: num(a.revenue),
    getfly_created_at: str(a.created_at),
    raw_data: a,
  };
}

async function fetchAllAccounts() {
  const all = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${GETFLY_BASE}/accounts?page=${page}&per_page=50`, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Getfly HTTP ${res.status}`);
    const data = await res.json();
    const records = data.records || [];
    if (records.length === 0) break;
    all.push(...records);
    const total = parseInt(data.pagination?.total_record || '0', 10);
    process.stdout.write(`\r📥 Fetching: ${all.length}/${total} (page ${page})`);
    if (total && all.length >= total) break;
    if (records.length < 50 || page >= 300) break;
    page++;
  }
  console.log(`\n✅ Fetched ${all.length} accounts`);
  return all;
}

async function main() {
  console.log('🚀 Getfly → Supabase Sync (RPC Mode)');
  console.log('══════════════════════════════════════');

  // Step 1: Test RPC with a single dummy record
  console.log('\n📋 Testing RPC function...');
  const testPayload = [{
    getfly_account_id: '__test__',
    account_name: 'TEST',
    raw_data: {}
  }];
  const { data: testData, error: testErr } = await supabase.rpc('bulk_upsert_getfly_accounts', {
    payload: testPayload  // Pass as JS array, NOT JSON.stringify
  });
  if (testErr) {
    console.error('❌ RPC error:', testErr.message);
    process.exit(1);
  }
  // Clean up test record
  await supabase.from('getfly_accounts').delete().eq('getfly_account_id', '__test__');
  console.log('✅ RPC function works!');

  // Step 2: Fetch from GetFly
  console.log('\n📥 Fetching from GetFly...');
  const accounts = await fetchAllAccounts();
  if (accounts.length === 0) { console.log('⚠️ No accounts'); process.exit(0); }

  // Step 3: Map and sync via RPC
  const rows = accounts.map(mapAccount).filter(r => r.getfly_account_id);
  console.log(`\n💾 Syncing ${rows.length} records...`);

  const chunkSize = 25;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase.rpc('bulk_upsert_getfly_accounts', {
      payload: chunk  // Pass as JS array directly
    });
    if (error) {
      console.error(`\n❌ Chunk ${Math.floor(i/chunkSize)+1}: ${error.message}`);
      errors++;
      continue;
    }
    upserted += (data || chunk.length);
    process.stdout.write(`\r💾 Progress: ${upserted}/${rows.length} (${Math.round(upserted/rows.length*100)}%)`);
  }

  console.log('\n\n══════════════════════════════════════');
  console.log(`✅ Done! Synced: ${upserted} | Errors: ${errors}`);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
