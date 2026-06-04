#!/usr/bin/env node
/**
 * Đồng bộ đơn KHTT (Khách Hàng Trăm Tuổi) GetFly → Supabase (bản chạy local).
 * Chỉ ĐỌC GetFly qua API v3 chính thức. KHÔNG bao giờ POST sang /crm/order/*.
 *
 *   node scripts/sync-khtt-orders.mjs            # đồng bộ thật
 *   node scripts/sync-khtt-orders.mjs --dry-run  # chỉ in ra, không ghi DB
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const DRY = process.argv.includes('--dry-run');

const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';
const GETFLY_WEB_BASE = 'https://blackstonesdvtl.getflycrm.com';

// Web credentials (đọc ngày hết hạn) — lấy từ .env.local
const _env = (() => { try { return fs.readFileSync('.env.local', 'utf8'); } catch { return ''; } })();
const _envGet = (k) => (_env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const GETFLY_WEB_USERNAME = _envGet('GETFLY_WEB_USERNAME');
const GETFLY_WEB_PASSWORD = _envGet('GETFLY_WEB_PASSWORD');
const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const H = { 'X-API-KEY': GETFLY_API_KEY, Accept: 'application/json' };

const isKhtt = (c) => /KHTT/i.test(String(c ?? ''));
const toAmount = (v) => {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};

async function fetchJson(url, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: H });
      if (res.ok) return await res.json();
      if (res.status === 404) return {};
    } catch { /* retry */ }
    if (i < retries) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  throw new Error(`GetFly fetch fail: ${url}`);
}

async function fetchAllOrders() {
  const all = [];
  let page = 1;
  while (page <= 40) {
    const d = await fetchJson(`${GETFLY_BASE}/orders?order_type=2&page=${page}&per_page=100`);
    const recs = d.records || [];
    if (!recs.length) break;
    all.push(...recs);
    const total = parseInt(d.pagination?.total_record || '0', 10);
    process.stdout.write(`\r📥 Orders: ${all.length}/${total} (page ${page})`);
    if ((total && all.length >= total) || recs.length < 100) break;
    page++;
  }
  console.log('');
  return all;
}

async function loadAccountMap() {
  const map = new Map();
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase
      .from('getfly_accounts')
      .select('getfly_account_id, account_name, contact_name, contact_phone')
      .range(from, from + 999);
    if (error || !data || !data.length) break;
    for (const a of data) {
      map.set(String(a.getfly_account_id), {
        account_name: a.account_name || null,
        contact_name: a.contact_name || null,
        contact_phone: a.contact_phone || null,
      });
    }
    if (data.length < 1000) break;
  }
  return map;
}

async function fetchAccountInfo(accId) {
  if (!accId) return null;
  const d = await fetchJson(`${GETFLY_BASE}/account?account_id=${encodeURIComponent(accId)}`);
  const info = d.info || null;
  const c = (d.contacts || [])[0] || null;
  if (!info && !c) return null;
  return {
    account_name: info?.account_name || null,
    contact_name: c?.first_name || null,
    contact_phone: c?.phone_mobile || c?.phone_home || null,
  };
}

async function fetchDetails(codes) {
  const out = new Map();
  for (let i = 0; i < codes.length; i += 15) {
    const batch = codes.slice(i, i + 15);
    const res = await Promise.all(batch.map(async (c) => {
      try { return [c, await fetchJson(`${GETFLY_BASE}/orders/${encodeURIComponent(c)}`)]; }
      catch { return [c, {}]; }
    }));
    for (const [c, d] of res) out.set(c, d);
    process.stdout.write(`\r📦 Gói: ${Math.min(i + 15, codes.length)}/${codes.length}`);
  }
  if (codes.length) console.log('');
  return out;
}

function pkgFrom(detail) {
  const products = detail?.products || [];
  const names = products.map((p) => String(p.product_name || '').trim()).filter(Boolean);
  return { name: names[0] || null, summary: names.join('; ') || null };
}

function vnDateToIso(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

async function getWebToken() {
  if (!GETFLY_WEB_USERNAME || !GETFLY_WEB_PASSWORD) return null;
  try {
    const r = await fetch(`${GETFLY_WEB_BASE}/authenticate/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: GETFLY_WEB_USERNAME, password: GETFLY_WEB_PASSWORD, locale: 'vi', version: 5, is_desktop: true }),
    });
    if (!r.ok) return null;
    return (await r.json()).access_token || null;
  } catch { return null; }
}

// Ngày hết hạn (custom field ngay_het_han) qua web API — chỉ GET.
async function fetchExpiryMap(orderIds, token) {
  const out = new Map();
  const wh = { 'X-Authorization': `Bearer ${token}`, 'X-Getfly-Version': '5', Accept: 'application/json' };
  for (let i = 0; i < orderIds.length; i += 8) {
    const batch = orderIds.slice(i, i + 8);
    const res = await Promise.all(batch.map(async (id) => {
      try {
        const r = await fetch(`${GETFLY_WEB_BASE}/crm/order/edit?order_id=${encodeURIComponent(id)}&order_type=2`, { headers: wh });
        if (!r.ok) return [id, null];
        const j = await r.json();
        return [id, vnDateToIso(j?.mapper?.ngay_het_han?.field_value)];
      } catch { return [id, null]; }
    }));
    for (const [id, v] of res) out.set(id, v);
    process.stdout.write(`\r📅 Ngày hết hạn: ${Math.min(i + 8, orderIds.length)}/${orderIds.length}`);
  }
  if (orderIds.length) console.log('');
  return out;
}

async function main() {
  console.log(`🚀 Sync KHTT ${DRY ? '(DRY-RUN)' : ''}`);
  const orders = await fetchAllOrders();
  const active = orders.filter((o) => isKhtt(o.order_code) && String(o.status ?? '') === '1');
  const activeIds = new Set(active.map((o) => String(o.order_id)));
  console.log(`🔎 ${active.length} đơn KHTT đang "Chờ duyệt" / ${orders.length} đơn bán.`);

  // Đơn đã có (bỏ qua fetch gói).
  const existing = new Map();
  try {
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await supabase
        .from('getfly_khtt_orders')
        .select('getfly_order_id, package_name, package_summary')
        .range(from, from + 999);
      if (error || !data || !data.length) break;
      for (const r of data) existing.set(String(r.getfly_order_id), { package_name: r.package_name, package_summary: r.package_summary });
      if (data.length < 1000) break;
    }
  } catch { /* bảng chưa tồn tại */ }

  const accountMap = await loadAccountMap();
  console.log(`👥 ${accountMap.size} accounts trong getfly_accounts.`);

  const needDetail = active.filter((o) => !existing.get(String(o.order_id))?.package_name);
  const detailMap = await fetchDetails(needDetail.map((o) => String(o.order_code)).filter(Boolean));

  const webToken = await getWebToken();
  console.log(webToken ? '🔑 Web OK — đọc ngày hết hạn...' : '⚠️ Không đăng nhập được web — bỏ qua ngày hết hạn.');
  const expiryMap = webToken ? await fetchExpiryMap(active.map((o) => String(o.order_id)), webToken) : null;

  const accountCache = new Map();
  async function resolveAccount(accId) {
    if (accountMap.has(accId)) return accountMap.get(accId);
    if (accountCache.has(accId)) return accountCache.get(accId);
    const info = await fetchAccountInfo(accId);
    accountCache.set(accId, info);
    return info;
  }

  const rows = [];
  for (const o of active) {
    const id = String(o.order_id);
    const accInfo = o.account_info || {};
    const accId = String(accInfo.account_id || '');
    const acc = await resolveAccount(accId);
    const detail = detailMap.get(String(o.order_code));
    const pkg = detail ? pkgFrom(detail) : { name: existing.get(id)?.package_name || null, summary: existing.get(id)?.package_summary || null };
    const total = toAmount(o.amount);
    const paid = toAmount(o.f_amount);
    rows.push({
      getfly_order_id: id,
      order_code: o.order_code || null,
      order_date: o.order_date || null,
      order_status_code: '1',
      order_status: 'Chờ duyệt',
      account_id: accId || null,
      customer_code: accInfo.account_code || null,
      customer_name: acc?.account_name || detail?.order_info?.account_name || null,
      customer_phone: accInfo.phone || null,
      package_name: pkg.name,
      package_summary: pkg.summary,
      total_value: total,
      paid_amount: paid,
      remaining_amount: total - paid,
      beneficiary_name: acc?.contact_name || null,
      beneficiary_phone: acc?.contact_phone || null,
      person_in_charge: o.assigned_name || null,
      ...(expiryMap ? { expiry_date: expiryMap.get(id) ?? null } : {}),
      synced_at: new Date().toISOString(),
      raw_data: o,
    });
  }

  if (DRY) {
    console.log(`\n📋 Mẫu ${Math.min(3, rows.length)} bản ghi:`);
    const samples = rows.filter((r) => ['260510KHTT_010', '260324KHTT_004'].includes(r.order_code));
    for (const r of (samples.length ? samples : rows.slice(0, 3))) {
      console.log({
        'Họ tên': r.customer_name, 'SĐT': r.customer_phone, 'Mã KH': r.customer_code,
        'Gói': r.package_name, 'Tổng': r.total_value.toLocaleString('vi-VN'),
        'Còn lại': r.remaining_amount.toLocaleString('vi-VN'), 'Ngày': r.order_date,
        'Ngày hết hạn': r.expiry_date || '—',
        'Người thụ hưởng': `${r.beneficiary_name || '—'} (${r.beneficiary_phone || '—'})`,
        'Mã đơn': r.order_code,
      });
    }
    console.log(`\n✅ DRY-RUN: ${rows.length} bản ghi sẵn sàng (không ghi DB).`);
    return;
  }

  let synced = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from('getfly_khtt_orders').upsert(chunk, { onConflict: 'getfly_order_id' });
    if (error) { console.error('\n❌ Upsert:', error.message); process.exit(1); }
    synced += chunk.length;
    process.stdout.write(`\r💾 Upsert: ${synced}/${rows.length}`);
  }
  console.log('');

  const { data: dbRows } = await supabase.from('getfly_khtt_orders').select('getfly_order_id');
  const stale = (dbRows || []).map((r) => String(r.getfly_order_id)).filter((id) => !activeIds.has(id));
  let removed = 0;
  if (stale.length) {
    const { error } = await supabase.from('getfly_khtt_orders').delete().in('getfly_order_id', stale);
    if (!error) removed = stale.length;
  }
  console.log(`\n✅ Xong! Đồng bộ ${synced} | Gỡ ${removed} đơn đã duyệt/huỷ.`);
}

main().catch((e) => { console.error('\n💥', e); process.exit(1); });
