/**
 * sync_all_1office.mjs
 * ─────────────────────────────────────────────────────────
 * Script tổng hợp: Fetch data từ 1Office API → Upsert vào Supabase
 *
 * Cách dùng:
 *   node scripts/sync_all_1office.mjs
 *
 * Yêu cầu: Node.js ≥ 18 (native fetch)
 * ─────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Config ─────────────────────────────────────────────────
const TOKEN = '84869196569c35038d0514699999665';
const BASE  = 'https://cloud-cloud.1office.vn';

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helper: Parse Vietnamese date "dd/mm/YYYY" → ISO ───────
function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  return isNaN(Date.parse(iso)) ? null : iso;
}

// ── Helper: Parse price string "1,234,567" → number ────────
function parsePrice(str) {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  const clean = String(str).replace(/[^\d.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// ── Helper: Fetch all pages from 1Office ───────────────────
async function fetchAll(endpoint, label) {
  const all = [];
  let page = 1;
  const limit = 100;
  console.log(`\n📡 [${label}] Bắt đầu fetch từ ${endpoint}`);

  while (true) {
    const url = `${BASE}${endpoint}?access_token=${TOKEN}&limit=${limit}&page=${page}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch {
        console.warn(`  ⚠️ Trang ${page}: Lỗi parse JSON`);
        break;
      }
      if (json.error === true) {
        console.warn(`  ⚠️ ${label} lỗi API: ${json.message}`);
        break;
      }
      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
        console.log(`  ✅ Trang ${page}: Hết data.`);
        break;
      }
      all.push(...json.data);
      console.log(`  → Trang ${page}: ${json.data.length} bản ghi (tổng ${all.length}/${json.total_item || '?'})`);
      if (json.data.length < limit) break;
      page++;
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.error(`  ❌ Lỗi kết nối trang ${page}: ${e.message}`);
      break;
    }
  }
  return all;
}

// ── Helper: Upsert batch ───────────────────────────────────
async function upsertBatch(table, rows, onConflict, batchSize = 50) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false });
    if (error) {
      console.error(`  ❌ Upsert lỗi batch ${i/batchSize + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

// ══════════════════════════════════════════════════════════
// SYNC 1: PRODUCTS (Vật tư / Sản phẩm)
// ══════════════════════════════════════════════════════════
async function syncProducts() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SYNC: products (Vật tư)');
  console.log('═══════════════════════════════════════════');

  const items = await fetchAll('/api/warehouse/product/gets', 'PRODUCTS');
  if (!items.length) { console.log('  ⚠️ Không có data.'); return 0; }

  const rows = items.map(p => ({
    oneoffice_id:   p.ID,
    code:           p.code || String(p.ID),
    name:           p.title || `Sản phẩm #${p.ID}`,
    barcode:        p.barcode || null,
    unit:           p.unit_id || null,
    cost_price:     parsePrice(p.price_buy),
    selling_price:  parsePrice(p.price),
    category:       p.product_category || null,
    product_type:   p.product_type || null,
    manage_type:    p.manage_type || null,
    supplier_list:  p.supplier_list || null,
    is_active:      (p.status === 'Hoạt động'),
    description:    p.desc || null,
    created_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }));

  const count = await upsertBatch('products', rows, 'oneoffice_id');
  console.log(`  ✅ Đã upsert ${count}/${rows.length} products`);
  return count;
}

// ══════════════════════════════════════════════════════════
// SYNC 2: GOODS RECEIPTS (Phiếu nhập kho)
// ══════════════════════════════════════════════════════════
async function syncGoodsReceipts() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SYNC: goods_receipts (Phiếu nhập kho)');
  console.log('═══════════════════════════════════════════');

  const items = await fetchAll('/api/warehouse/receipt/gets', 'RECEIPTS');
  if (!items.length) { console.log('  ⚠️ Không có data.'); return 0; }

  // Map approval_status → internal status
  function mapStatus(s) {
    if (!s) return 'pending';
    if (s.includes('Đã duyệt')) return 'completed';
    if (s.includes('Từ chối')) return 'rejected';
    return 'pending';
  }

  // Extract unique warehouses từ receipts
  const warehouseMap = new Map();
  for (const r of items) {
    if (r.inventory_id && r.inventory_id.trim()) {
      const name = r.inventory_id.trim();
      if (!warehouseMap.has(name)) {
        warehouseMap.set(name, {
          code:      `WH-${String(warehouseMap.size + 1).padStart(3,'0')}`,
          name,
          address:   r.inventory_address || null,
          is_active: true,
        });
      }
    }
  }

  // Upsert warehouses
  if (warehouseMap.size > 0) {
    const warehouseRows = [...warehouseMap.values()];
    const { error: wErr } = await supabase
      .from('warehouses')
      .upsert(warehouseRows, { onConflict: 'code', ignoreDuplicates: false });
    if (wErr) console.warn(`  ⚠️ Upsert warehouses: ${wErr.message}`);
    else console.log(`  ✅ Đã upsert ${warehouseRows.length} warehouses`);
  }

  // Fetch warehouse id map (name → id)
  const { data: wData } = await supabase.from('warehouses').select('id, name');
  const warehouseIdMap = {};
  for (const w of (wData || [])) warehouseIdMap[w.name] = w.id;

  // Build goods_receipts rows
  const grRows = [];
  const grItemRows = [];

  for (const r of items) {
    const warehouseName = (r.inventory_id || '').trim();
    const warehouseId   = warehouseIdMap[warehouseName] || null;

    const grRow = {
      gr_code:       r.code,
      warehouse_id:  warehouseId,
      status:        mapStatus(r.app_approval_status),
      note:          [r.type, r.desc].filter(Boolean).join(' | ') || null,
      received_by:   r.user_id || r.created_by_id || 'Admin',
      received_date: parseDate(r.date_sign) || parseDate(r.date_created) || new Date().toISOString().split('T')[0],
    };
    grRows.push(grRow);

    // Parse items from multiline fields
    const names    = (r.product_ids  || '').split('\n').map(s => s.trim()).filter(Boolean);
    const amounts  = (r.amount_receipt || '').split('\n').map(s => parsePrice(s));
    const billAmts = (r.amount_bill   || '').split('\n').map(s => parsePrice(s));
    const prices   = (r.price         || '').split('\n').map(s => parsePrice(s));
    const units    = (r.unit          || '').split('\n').map(s => s.trim());

    for (let i = 0; i < names.length; i++) {
      if (!names[i]) continue;
      grItemRows.push({
        _gr_code:      r.code,       // temp: để join sau
        product_name:  names[i],
        product_code:  names[i],     // dùng tên làm code tạm
        expected_qty:  billAmts[i] || 0,
        received_qty:  amounts[i]  || 0,
        is_accepted:   true,
        note:          units[i] || null,
      });
    }
  }

  // Upsert goods_receipts
  const grCount = await upsertBatch('goods_receipts', grRows, 'gr_code');
  console.log(`  ✅ Đã upsert ${grCount}/${grRows.length} goods_receipts`);

  // Fetch gr_id map (gr_code → id)
  const { data: grData } = await supabase.from('goods_receipts').select('id, gr_code');
  const grIdMap = {};
  for (const g of (grData || [])) grIdMap[g.gr_code] = g.id;

  // Clear old items and insert new ones
  const grItemRowsFinal = grItemRows
    .filter(r => grIdMap[r._gr_code])
    .map(({ _gr_code, ...rest }) => ({ ...rest, gr_id: grIdMap[_gr_code] }));

  if (grItemRowsFinal.length > 0) {
    // Delete existing items to avoid duplicates
    const grIds = [...new Set(grItemRowsFinal.map(r => r.gr_id))];
    for (let i = 0; i < grIds.length; i += 50) {
      await supabase.from('goods_receipt_items').delete().in('gr_id', grIds.slice(i, i + 50));
    }
    // Insert fresh
    const { error: itemErr } = await supabase.from('goods_receipt_items').insert(grItemRowsFinal);
    if (itemErr) console.warn(`  ⚠️ Insert gr_items: ${itemErr.message}`);
    else console.log(`  ✅ Đã insert ${grItemRowsFinal.length} goods_receipt_items`);
  }

  return grCount;
}

// ══════════════════════════════════════════════════════════
// SYNC 3: SALE CONTRACTS (Hợp đồng bán)
// ══════════════════════════════════════════════════════════
async function syncSaleContracts() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SYNC: sale_contracts (Hợp đồng bán)');
  console.log('═══════════════════════════════════════════');

  const items = await fetchAll('/api/sale/contract/gets', 'CONTRACTS');
  if (!items.length) { console.log('  ⚠️ Không có data.'); return 0; }

  const rows = items.map(c => ({
    oneoffice_id:    c.ID,
    contract_code:   c.code || String(c.ID),
    contract_type:   c.contract_type || null,
    type:            c.type || null,
    customer_name:   c.customer_name || c.customer_id || null,
    customer_code:   c.customer_code || null,
    customer_type:   c.customer_type || null,
    customer_phone:  c.customer_phones || null,
    customer_email:  c.customer_emails || null,
    sign_date:       parseDate(c.date_sign),
    start_date:      parseDate(c.date_start),
    end_date:        parseDate(c.date_end) || null,
    status:          c.status_view || null,
    approval_status: c.app_approval_status || null,
    total_amount:    parsePrice(c.total_price),
    currency_unit:   c.currency_unit || 'VND',
    pay_type:        c.pay_type || null,
    product_list:    c.product_ids || null,
    detail_text:     c.details || null,
    note:            c.desc || null,
    created_by:      c.created_by_id || null,
  }));

  const count = await upsertBatch('sale_contracts', rows, 'oneoffice_id');
  console.log(`  ✅ Đã upsert ${count}/${rows.length} sale_contracts`);
  return count;
}

// ══════════════════════════════════════════════════════════
// SYNC 4: SALE QUOTATIONS (Báo giá)
// ══════════════════════════════════════════════════════════
async function syncSaleQuotations() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SYNC: sale_quotations (Báo giá)');
  console.log('═══════════════════════════════════════════');

  const items = await fetchAll('/api/sale/quotation/gets', 'QUOTATIONS');
  if (!items.length) { console.log('  ⚠️ Không có data.'); return 0; }

  const rows = items.map(q => ({
    oneoffice_id:    q.ID,
    quotation_code:  q.code || String(q.ID),
    title:           q.title || null,
    customer_id:     typeof q.customer_id === 'number' ? q.customer_id : null,
    customer_name:   q.customer_name || null,
    customer_code:   q.customer_code || null,
    customer_phone:  q.customer_phone || null,
    customer_email:  q.customer_email || null,
    quotation_date:  parseDate(q.date_sign),
    expiry_date:     parseDate(q.date_to) || null,
    total_amount:    parsePrice(q.total_price || q.money_currency),
    currency_unit:   q.currency_unit || 'VND',
    approval_status: q.app_approval_status || null,
    product_list:    q.product_ids || null,
    product_detail:  q.product_detail || null,
    note:            q.desc || null,
    created_by:      q.created_by_id || null,
  }));

  const count = await upsertBatch('sale_quotations', rows, 'oneoffice_id');
  console.log(`  ✅ Đã upsert ${count}/${rows.length} sale_quotations`);
  return count;
}

// ══════════════════════════════════════════════════════════
// SYNC 5: STOCKTAKES (Phiếu kiểm kho)
// ══════════════════════════════════════════════════════════
async function syncStocktakes() {
  console.log('\n═══════════════════════════════════════════');
  console.log(' SYNC: stocktakes (Phiếu kiểm kho)');
  console.log('═══════════════════════════════════════════');

  const items = await fetchAll('/api/warehouse/stocktake/gets', 'STOCKTAKES');
  if (!items.length) { console.log('  ⚠️ Không có data.'); return 0; }

  const rows = items.map(s => ({
    oneoffice_id:    s.ID,
    stocktake_code:  s.code || String(s.ID),
    warehouse_name:  s.inventory_id || null,
    warehouse_address: s.inventory_address || null,
    status:          s.status || null,
    approval_status: s.app_approval_status || null,
    note:            s.desc || null,
    stocktake_date:  parseDate(s.date_sign) || parseDate(s.date_created),
    created_by:      s.created_by_id || null,
  }));

  const count = await upsertBatch('stocktakes', rows, 'oneoffice_id');
  console.log(`  ✅ Đã upsert ${count}/${rows.length} stocktakes`);
  return count;
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   1Office → Supabase Full Sync                ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`Bắt đầu lúc: ${new Date().toLocaleString('vi-VN')}\n`);

  const results = {};

  try { results.products       = await syncProducts();       } catch (e) { console.error('❌ syncProducts:', e.message); }
  try { results.goods_receipts = await syncGoodsReceipts();  } catch (e) { console.error('❌ syncGoodsReceipts:', e.message); }
  try { results.sale_contracts = await syncSaleContracts();  } catch (e) { console.error('❌ syncSaleContracts:', e.message); }
  try { results.sale_quotations= await syncSaleQuotations(); } catch (e) { console.error('❌ syncSaleQuotations:', e.message); }
  try { results.stocktakes     = await syncStocktakes();     } catch (e) { console.error('❌ syncStocktakes:', e.message); }

  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║   KẾT QUẢ ĐỒNG BỘ                            ║');
  console.log('╚═══════════════════════════════════════════════╝');
  for (const [table, count] of Object.entries(results)) {
    console.log(`  ✅ ${table.padEnd(20)} → ${count ?? 'N/A'} bản ghi`);
  }
  console.log(`\nHoàn thành lúc: ${new Date().toLocaleString('vi-VN')}`);
}

main().catch(console.error);
