/**
 * Script: Sync 1Office → Supabase (chỉ sync các module có quyền)
 * API key hiện tại có quyền: Contracts, Quotations, Products, Receipts
 * Run: node scripts/sync_1office_crm.mjs
 */

import { createClient } from '@supabase/supabase-js';

const ONEOFFICE_TOKEN = '84869196569c35038d0514699999665';
const BASE_URL        = 'https://cloud-cloud.1office.vn';
const PAGE_SIZE       = 50;
const DELAY_MS        = 500;

const SUPABASE_URL  = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const p = str.trim().split('/');
  if (p.length !== 3) return null;
  const iso = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  return isNaN(Date.parse(iso)) ? null : iso;
}
function n(v) {
  if (!v) return 0;
  const x = parseFloat(String(v).replace(/[^\d.-]/g,''));
  return isNaN(x) ? 0 : x;
}

// ── fetchAll ──────────────────────────────────────────────────────
async function fetchAll(endpoint, token = ONEOFFICE_TOKEN) {
  const all = [];
  let page = 1;
  while (true) {
    const url = `${BASE_URL}${endpoint}?access_token=${token}&limit=${PAGE_SIZE}&page=${page}`;
    try {
      const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) try { json = JSON.parse(m[0]); } catch { /* */ }
      }
      if (!json || json.error === true || !Array.isArray(json.data) || !json.data.length) break;
      all.push(...json.data);
      process.stdout.write(`\r  Trang ${page}: ${all.length} bản ghi...`);
      if (json.data.length < PAGE_SIZE) break;
      page++;
      await sleep(DELAY_MS);
    } catch (err) { console.error(`\n  Lỗi trang ${page}:`, err.message); break; }
  }
  console.log();
  return all;
}

// ── upsertBatch ───────────────────────────────────────────────────
async function upsertBatch(table, rows, key) {
  let upserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50).filter(r => r[key] != null);
    if (!batch.length) continue;
    const { error } = await supabase.from(table).upsert(batch, { onConflict: key });
    if (error) { console.error(`  ❌ [${table}] batch ${i}:`, error.message); errors += batch.length; }
    else upserted += batch.length;
  }
  return { upserted, errors };
}

// ── Mappers ───────────────────────────────────────────────────────
function mapContract(item) {
  return {
    oneoffice_id:    Number(item.ID) || null,
    contract_code:   item.code || `CTR-${item.ID}`,
    contract_type:   item.contract_type || null,
    type:            item.type || null,
    customer_name:   item.customer_name || item.customer_id || null,
    customer_code:   item.customer_code || null,
    customer_type:   item.customer_type || null,
    customer_phone:  item.customer_phones || null,
    customer_email:  item.customer_emails || null,
    sign_date:       parseDate(item.date_sign),
    start_date:      parseDate(item.date_start),
    end_date:        parseDate(item.date_end) || null,
    status:          item.status_view || null,
    approval_status: item.app_approval_status || null,
    total_amount:    n(item.total_price),
    currency_unit:   item.currency_unit || 'VND',
    pay_type:        item.pay_type || null,
    product_list:    item.product_ids ? String(item.product_ids).slice(0, 2000) : null,
    detail_text:     item.details ? String(item.details).slice(0, 2000) : null,
    note:            item.desc || null,
    created_by:      item.created_by_id ? String(item.created_by_id) : null,
    updated_at:      new Date().toISOString(),
  };
}

function mapQuotation(item) {
  return {
    oneoffice_id:    Number(item.ID) || null,
    quotation_code:  item.code || `QT-${item.ID}`,
    title:           item.title || null,
    customer_id:     typeof item.customer_id === 'number' ? item.customer_id : null,
    customer_name:   item.customer_name || null,
    customer_code:   item.customer_code || null,
    customer_phone:  item.customer_phone || null,
    customer_email:  item.customer_email || null,
    quotation_date:  parseDate(item.date_sign),
    expiry_date:     parseDate(item.date_to) || null,
    total_amount:    n(item.total_price || item.money_currency),
    currency_unit:   item.currency_unit || 'VND',
    approval_status: item.app_approval_status || null,
    product_list:    item.product_ids ? String(item.product_ids).slice(0, 2000) : null,
    product_detail:  item.product_detail ? String(item.product_detail).slice(0, 2000) : null,
    note:            item.desc || null,
    created_by:      item.created_by_id ? String(item.created_by_id) : null,
    updated_at:      new Date().toISOString(),
  };
}

function mapProduct(item) {
  return {
    oneoffice_id:   Number(item.ID) || null,
    code:           item.code || String(item.ID),
    name:           item.title || `SP #${item.ID}`,
    barcode:        item.barcode || null,
    unit:           item.unit_id || null,
    cost_price:     n(item.price_buy),
    selling_price:  n(item.price),
    category:       item.product_category || null,
    product_type:   item.product_type || null,
    manage_type:    item.manage_type || null,
    supplier_list:  item.supplier_list ? String(item.supplier_list).slice(0,2000) : null,
    description:    item.desc || null,
    is_active:      item.status === 'Hoạt động' || item.status === 'active' || item.status === 1,
    updated_at:     new Date().toISOString(),
  };
}

function mapReceipt(item) {
  function mapStatus(s) {
    if (!s) return 'pending';
    if (s.includes('Đã duyệt')) return 'completed';
    if (s.includes('Từ chối')) return 'rejected';
    return 'pending';
  }
  return {
    oneoffice_id:    Number(item.ID) || null,
    gr_code:         item.code || `GR-${item.ID}`,
    status:          mapStatus(item.app_approval_status || ''),
    note:            [
      item.inventory_id ? `Kho: ${item.inventory_id}` : null,
      item.type || null,
      item.desc || null,
    ].filter(Boolean).join(' | ') || null,
    received_by:     item.user_id || item.created_by_id || 'Admin',
    received_date:   parseDate(item.date_sign) || parseDate(item.date_created) || new Date().toISOString().split('T')[0],
    updated_at:      new Date().toISOString(),
  };
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║     1Office → Supabase Full Sync                    ║');
  console.log('║     Contracts + Quotations + Products + Receipts    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const { data: logRow } = await supabase
    .from('oneoffice_sync_log')
    .insert({ sync_type: 'full_script', status: 'running', started_at: new Date().toISOString() })
    .select().single();
  const logId = logRow?.id;

  const startTime = Date.now();
  const results = {};

  // 1. Hợp đồng
  console.log('📄 1. Hợp Đồng (Sale Contracts)...');
  const rawContracts = await fetchAll('/api/sale/contract/gets');
  console.log(`  → ${rawContracts.length} bản ghi`);
  if (rawContracts.length) {
    const mapped = rawContracts.map(mapContract).filter(c => c.oneoffice_id);
    const r = await upsertBatch('sale_contracts', mapped, 'oneoffice_id');
    results.contracts = { fetched: rawContracts.length, ...r };
    console.log(`  ✅ Upserted: ${r.upserted}  Lỗi: ${r.errors}`);
  } else { results.contracts = { fetched: 0, upserted: 0, errors: 0 }; }

  // 2. Báo giá
  console.log('\n📋 2. Báo Giá (Quotations)...');
  const rawQ = await fetchAll('/api/sale/quotation/gets');
  console.log(`  → ${rawQ.length} bản ghi`);
  if (rawQ.length) {
    const mapped = rawQ.map(mapQuotation).filter(q => q.oneoffice_id);
    const r = await upsertBatch('sale_quotations', mapped, 'oneoffice_id');
    results.quotations = { fetched: rawQ.length, ...r };
    console.log(`  ✅ Upserted: ${r.upserted}  Lỗi: ${r.errors}`);
  } else { results.quotations = { fetched: 0, upserted: 0, errors: 0 }; }

  // 3. Sản phẩm
  console.log('\n📦 3. Sản Phẩm (Products)...');
  const rawP = await fetchAll('/api/warehouse/product/gets');
  console.log(`  → ${rawP.length} bản ghi`);
  if (rawP.length) {
    const mapped = rawP.map(mapProduct).filter(p => p.oneoffice_id);
    const r = await upsertBatch('products', mapped, 'oneoffice_id');
    results.products = { fetched: rawP.length, ...r };
    console.log(`  ✅ Upserted: ${r.upserted}  Lỗi: ${r.errors}`);
  } else { results.products = { fetched: 0, upserted: 0, errors: 0 }; }

  // 4. Nhập kho
  console.log('\n🏭 4. Nhập Kho (Receipts)...');
  const rawR = await fetchAll('/api/warehouse/receipt/gets');
  console.log(`  → ${rawR.length} bản ghi`);
  if (rawR.length) {
    const mapped = rawR.map(mapReceipt).filter(r => r.oneoffice_id);
    const r = await upsertBatch('goods_receipts', mapped, 'oneoffice_id');
    results.receipts = { fetched: rawR.length, ...r };
    console.log(`  ✅ Upserted: ${r.upserted}  Lỗi: ${r.errors}`);
  } else { results.receipts = { fetched: 0, upserted: 0, errors: 0 }; }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalFetched  = Object.values(results).reduce((s, r) => s + r.fetched, 0);
  const totalUpserted = Object.values(results).reduce((s, r) => s + r.upserted, 0);
  const totalErrors   = Object.values(results).reduce((s, r) => s + r.errors, 0);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  ✅ HOÀN THÀNH — ${duration}s`);
  console.log('╠══════════════════════════════════════════════════════╣');
  for (const [t, r] of Object.entries(results)) {
    console.log(`║  ${t.padEnd(12)} Fetch:${String(r.fetched).padStart(5)}  Upsert:${String(r.upserted).padStart(5)}  Lỗi:${r.errors}`);
  }
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  TỔNG: ${totalFetched} fetched, ${totalUpserted} upserted, ${totalErrors} lỗi`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (totalErrors > 0) {
    console.log('💡 Lỗi "table not found"? → Chạy sql/migration_1office_sales_tables.sql trong Supabase\n');
  }

  if (logId) {
    await supabase.from('oneoffice_sync_log').update({
      status: totalErrors === 0 ? 'success' : 'partial',
      fetched: totalFetched, upserted: totalUpserted, errors: totalErrors,
      duration_ms: Date.now() - startTime,
      finished_at: new Date().toISOString(),
    }).eq('id', logId);
  }
}

main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
