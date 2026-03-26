/**
 * sync-1office-manual.mjs
 * Chạy: node sync-1office-manual.mjs
 *
 * Script thuần Node.js (không cần Next.js) để:
 * 1. Fetch dữ liệu từ 1Office
 * 2. Upsert vào Supabase
 * 3. Báo cáo kết quả
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────
const ONEOFFICE_TOKEN = '84869196569c35038d0514699999665';
const ONEOFFICE_BASE  = 'https://cloud-cloud.1office.vn';
const SUPABASE_URL    = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_KEY    = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PAGE_SIZE = 20;
const DELAY_MS  = 600;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Fetch từ 1Office ──────────────────────────────────────────
async function fetchAll(endpoint) {
  const allData = [];
  let page = 1;
  console.log(`\n[1Office] Fetch: ${endpoint}`);

  while (true) {
    const url = `${ONEOFFICE_BASE}${endpoint}?access_token=${ONEOFFICE_TOKEN}&limit=${PAGE_SIZE}&page=${page}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = await res.text();

      let json = null;
      try { json = JSON.parse(text); }
      catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) try { json = JSON.parse(m[0]); } catch { /* ignore */ }
      }

      if (!json || json.error === true) {
        console.warn(`  ⚠ Lỗi trang ${page}: ${json?.message || 'parse error: ' + text.slice(0, 200)}`);
        break;
      }
      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
        console.log(`  ✓ Hết dữ liệu tại trang ${page}`);
        break;
      }

      allData.push(...json.data);
      console.log(`  → Trang ${page}: +${json.data.length} (tổng: ${allData.length})`);
      if (json.data.length < PAGE_SIZE) break;
      page++;
      await sleep(DELAY_MS);
    } catch(e) {
      console.error(`  ✗ Kết nối lỗi trang ${page}:`, e.message);
      break;
    }
  }
  return allData;
}

// ── Upsert vào Supabase ───────────────────────────────────────
async function upsertAll(table, rows, conflictKey) {
  let upserted = 0, errors = 0;
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictKey, ignoreDuplicates: false });
    if (error) {
      console.error(`  [Supabase] Batch ${i} lỗi:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
      process.stdout.write(`  → Upserted ${upserted}/${rows.length}\r`);
    }
  }
  console.log(`  ✅ Upserted ${upserted}, lỗi ${errors}`);
  return { upserted, errors };
}

// ── Mappers ───────────────────────────────────────────────────
function mapProduct(item) {
  return {
    oneoffice_id:  Number(item.ID || item.id) || null,
    code:          item.code || String(item.ID || item.id),
    name:          item.title || item.name || 'N/A',
    barcode:       item.barcode || null,
    unit:          item.unit || item.unit_id || null,
    cost_price:    parseFloat(item.price_buy || 0) || 0,
    selling_price: parseFloat(item.price || 0) || 0,
    category:      item.product_category || null,
    product_type:  item.product_type || null,
    manage_type:   item.manage_type || null,
    supplier_list: item.supplier_list
      ? (typeof item.supplier_list === 'string' ? item.supplier_list : JSON.stringify(item.supplier_list))
      : null,
    description:   item.desc || item.description || null,
    is_active:     item.status !== 'inactive' && item.status !== 0,
    updated_at:    new Date().toISOString(),
  };
}

function mapReceipt(item) {
  return {
    oneoffice_id:    Number(item.ID || item.id) || null,
    gr_code:         item.code || `GR-${item.ID || item.id}`,
    warehouse_name:  item.inventory_id || item.warehouse_name || null,
    warehouse_code:  item.inventory_code || item.warehouse_code || null,
    supplier_name:   item.supplier_name || item.customer_id || null,
    supplier_code:   item.supplier_code || null,
    status:          item.status || null,
    approval_status: item.app_approval_status || item.approval_status || null,
    total_amount:    parseFloat(item.money || item.total_amount || 0) || 0,
    note:            item.desc || item.note || null,
    received_date:   parseDateVN(item.date_created || item.date_sign || null),
    created_by:      item.user_id || item.created_by || null,
    product_list:    item.product_ids
      ? (typeof item.product_ids === 'string' ? item.product_ids : JSON.stringify(item.product_ids))
      : null,
    updated_at:      new Date().toISOString(),
  };
}

function mapContract(item) {
  return {
    oneoffice_id:     Number(item.ID || item.id) || null,
    contract_code:    item.code || `CTR-${item.ID || item.id}`,
    contract_type:    item.contract_type || null,
    type:             item.type || null,
    customer_name:    item.customer_name || item.customer_id || null,
    customer_code:    item.customer_code || null,
    customer_type:    item.customer_type || null,
    customer_phone:   item.customer_phone || null,
    customer_email:   item.customer_email || null,
    sign_date:        parseDateVN(item.date_sign || null),
    start_date:       parseDateVN(item.date_start || null),
    end_date:         parseDateVN(item.date_end || null),
    status:           item.status || null,
    approval_status:  item.app_approval_status || null,
    total_amount:     parseFloat(item.money || item.money_end || item.total_amount || 0) || 0,
    currency_unit:    item.currency_unit || 'VND',
    pay_type:         item.pay_type || null,
    product_list:     item.product_ids
      ? (typeof item.product_ids === 'string' ? item.product_ids : JSON.stringify(item.product_ids))
      : null,
    detail_text:      item.desc || null,
    note:             item.note || null,
    created_by:       item.user_id || null,
    updated_at:       new Date().toISOString(),
  };
}

function mapQuotation(item) {
  return {
    oneoffice_id:    Number(item.ID || item.id) || null,
    quotation_code:  item.code || `QT-${item.ID || item.id}`,
    title:           item.title || item.name || null,
    customer_id:     Number(item.customer_id_raw) || null,
    customer_name:   item.customer_name || item.customer_id || null,
    customer_code:   item.customer_code || null,
    customer_phone:  item.customer_phone || null,
    customer_email:  item.customer_email || null,
    quotation_date:  parseDateVN(item.date_sign || item.date_created || null),
    expiry_date:     parseDateVN(item.date_end || null),
    total_amount:    parseFloat(item.money || item.money_end || 0) || 0,
    currency_unit:   item.currency_unit || 'VND',
    approval_status: item.app_approval_status || null,
    product_list:    item.product_ids
      ? (typeof item.product_ids === 'string' ? item.product_ids : JSON.stringify(item.product_ids))
      : null,
    note:            item.desc || item.note || null,
    created_by:      item.user_id || null,
    updated_at:      new Date().toISOString(),
  };
}

function mapStocktake(item) {
  return {
    oneoffice_id:      Number(item.ID || item.id) || null,
    stocktake_code:    item.code || `ST-${item.ID || item.id}`,
    warehouse_name:    item.inventory_id || item.warehouse_name || null,
    warehouse_address: item.inventory_address || item.address || null,
    status:            item.status || null,
    approval_status:   item.app_approval_status || null,
    note:              item.desc || item.note || null,
    stocktake_date:    parseDateVN(item.date_created || null),
    created_by:        item.user_id || null,
    updated_at:        new Date().toISOString(),
  };
}

function mapSaleOrder(item) {
  return {
    oneoffice_id:    Number(item.ID || item.id) || null,
    order_code:      item.code || `SO-${item.ID || item.id}`,
    title:           item.title || null,
    customer_name:   item.customer_name || item.customer_id || null,
    customer_code:   item.customer_code || null,
    customer_phone:  item.customer_phone || null,
    customer_email:  item.customer_email || null,
    order_date:      parseDateVN(item.date_sign || item.date_created || null),
    delivery_date:   parseDateVN(item.date_end || null),
    status:          item.status || null,
    approval_status: item.app_approval_status || null,
    total_amount:    parseFloat(item.money || item.money_end || 0) || 0,
    currency_unit:   item.currency_unit || 'VND',
    product_list:    item.product_ids
      ? (typeof item.product_ids === 'string' ? item.product_ids : JSON.stringify(item.product_ids))
      : null,
    note:            item.desc || null,
    created_by:      item.user_id || null,
    updated_at:      new Date().toISOString(),
  };
}

// ── Helper: parse ngày dạng DD/MM/YYYY → ISO ─────────────────
function parseDateVN(val) {
  if (!val) return null;
  const m = String(val).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  return val.includes('-') ? val.split('T')[0] : null;
}

function mapWarehouse(item) {
  return {
    oneoffice_id: Number(item.ID || item.id) || null,
    code:   item.code || `WH-${item.ID || item.id}`,
    name:   item.name || item.title || 'N/A',
    address: item.address || null,
    is_active: item.status !== 'inactive' && item.status !== 0,
    updated_at: new Date().toISOString(),
  };
}

function mapInventory(item) {
  return {
    oneoffice_id:     Number(item.ID || item.id) || null,
    product_code:     item.product_code || item.code || null,
    product_name:     item.product_name || item.name || null,
    warehouse_name:   item.warehouse_name || item.inventory_name || item.warehouse || null,
    warehouse_code:   item.warehouse_code || item.inventory_code || null,
    quantity:         parseFloat(item.quantity || item.qty || 0) || 0,
    available_qty:    parseFloat(item.available_qty || item.available || 0) || 0,
    unit:             item.unit || item.unit_name || null,
    updated_at:       new Date().toISOString(),
  };
}

// Token mở rộng
const TOKEN_INV = '201770191369c4adde97a6d512470927';
const TOKEN_WH  = '21629249469c4ae9a40117149012318';

// ── Main ──────────────────────────────────────────────────────
const TASKS = [
  { name: 'warehouses_1office',   endpoint: '/api/warehouse/gets',          mapper: mapWarehouse,
    table: 'warehouses_1office',    conflict: 'oneoffice_id', token: TOKEN_WH },
  { name: 'inventory_1office',    endpoint: '/api/warehouse/inventory/gets',mapper: mapInventory,
    table: 'inventory_1office',     conflict: 'oneoffice_id', token: TOKEN_INV },
  { name: 'sale_orders',          endpoint: '/api/sale/order/gets',         mapper: mapSaleOrder, table: 'sale_orders', conflict: 'oneoffice_id' },
  { name: 'products',             endpoint: '/api/warehouse/product/gets',  mapper: mapProduct,    table: 'products',             conflict: 'oneoffice_id' },
  { name: 'goods_receipts_1office', endpoint: '/api/warehouse/receipt/gets', mapper: mapReceipt,   table: 'goods_receipts_1office', conflict: 'oneoffice_id' },
  { name: 'sale_contracts',       endpoint: '/api/sale/contract/gets',      mapper: mapContract,   table: 'sale_contracts',       conflict: 'oneoffice_id' },
  { name: 'sale_quotations',      endpoint: '/api/sale/quotation/gets',     mapper: mapQuotation,  table: 'sale_quotations',      conflict: 'oneoffice_id' },
  { name: 'stocktakes',           endpoint: '/api/warehouse/stocktake/gets',mapper: mapStocktake,  table: 'stocktakes',           conflict: 'oneoffice_id' },
];

const results = [];
const startTime = Date.now();

console.log('='.repeat(60));
console.log('🔄 BLACKSTONE SCM — 1Office → Supabase Sync');
console.log(`⏱  Bắt đầu: ${new Date().toLocaleString('vi-VN')}`);
console.log('='.repeat(60));

let onlyTable = process.argv[2]; // node sync-1office-manual.mjs products

for (const task of TASKS) {
  if (onlyTable && task.name !== onlyTable) continue;

  console.log(`\n📦 [${task.name}]`);
  const t0 = Date.now();

  try {
    const raw = await fetchAll(task.endpoint);
    const mapped = raw.map(task.mapper).filter(r => r.oneoffice_id !== null);
    console.log(`  Mapped: ${mapped.length} bản ghi hợp lệ`);

    const { upserted, errors } = await upsertAll(task.table, mapped, task.conflict);
    const dur = Date.now() - t0;

    results.push({ table: task.name, fetched: raw.length, upserted, errors, dur });
  } catch(e) {
    console.error(`  ❌ Lỗi:`, e.message);
    results.push({ table: task.name, fetched: 0, upserted: 0, errors: 1, error: e.message });
  }

  await sleep(1000);
}

// ── Báo cáo ───────────────────────────────────────────────────
const totalMs = Date.now() - startTime;
console.log('\n' + '='.repeat(60));
console.log('📊 KẾT QUẢ SYNC:');
console.log('='.repeat(60));
for (const r of results) {
  const status = r.errors > 0 ? '⚠️ ' : '✅';
  console.log(`${status} ${r.table.padEnd(28)} fetch=${r.fetched} upsert=${r.upserted} err=${r.errors}`);
}
console.log('-'.repeat(60));
console.log(`⏱  Tổng thời gian: ${(totalMs/1000).toFixed(1)}s`);
console.log(`⏰ Hoàn thành: ${new Date().toLocaleString('vi-VN')}`);
console.log('='.repeat(60));

// Ghi log vào Supabase
await supabase.from('sync_logs').insert({
  sync_type: '1office_manual',
  started_at: new Date(Date.now() - totalMs).toISOString(),
  finished_at: new Date().toISOString(),
  total_duration_ms: totalMs,
  tables_synced: results.map(r => r.table),
  total_fetched: results.reduce((s,r) => s + r.fetched, 0),
  total_upserted: results.reduce((s,r) => s + r.upserted, 0),
  total_errors: results.reduce((s,r) => s + r.errors, 0),
  success: results.every(r => !r.error),
  details: results,
});
