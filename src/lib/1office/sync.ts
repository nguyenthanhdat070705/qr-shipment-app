/**
 * 1Office → Supabase Sync Engine
 * Upsert dữ liệu từ 1Office vào các bảng Supabase
 * Mapping based on actual 1Office API response fields (tested 2026-03)
 */

import { createClient } from '@supabase/supabase-js';
import {
  fetchProducts,
  fetchReceipts,
  fetchContracts,
  fetchQuotations,
  fetchStocktakes,
  fetchSaleOrders,
} from './client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 50;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertBatch(table: string, rows: any[], conflictKey: string): Promise<{ upserted: number; errors: number }> {
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictKey, ignoreDuplicates: false });

    if (error) {
      console.error(`[Sync] Upsert lỗi [${table}] batch ${i}:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  return { upserted, errors };
}

// ── Helper ────────────────────────────────────────────────────────

/** Parse "dd/mm/YYYY" → "YYYY-MM-DD" hoặc null */
function parseDate(str: unknown): string | null {
  if (!str || typeof str !== 'string') return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!d || !m || !y || y.length !== 4) return null;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isNaN(Date.parse(iso)) ? null : iso;
}

/** Parse "1,234,567" → number */
function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ── Mappers — based on actual 1Office API response (cloud-cloud.1office.vn) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProduct(item: any) {
  // Actual fields: ID, code, title, unit_id, price, price_buy, product_category,
  // manage_type, barcode, status, supplier_list, desc, product_type
  return {
    oneoffice_id:   Number(item.ID) || null,
    code:           item.code || String(item.ID),
    name:           item.title || `SP #${item.ID}`,
    barcode:        item.barcode || null,
    unit:           item.unit_id || null,
    cost_price:     parseNum(item.price_buy),
    selling_price:  parseNum(item.price),
    category:       item.product_category || null,
    product_type:   item.product_type || null,
    manage_type:    item.manage_type || null,
    supplier_list:  item.supplier_list || null,
    description:    item.desc || null,
    is_active:      item.status === 'Hoạt động' || item.status === 'active' || item.status === 1,
    updated_at:     new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReceipt(item: any) {
  // Actual fields: ID, code, inventory_id (warehouse name), inventory_address,
  // user_id, app_approval_status, total_price, date_sign, date_created,
  // type, product_ids (multiline), amount_receipt (multiline), price (multiline), unit (multiline)
  function mapStatus(s: string): string {
    if (!s) return 'pending';
    if (s.includes('Đã duyệt')) return 'completed';
    if (s.includes('Từ chối')) return 'rejected';
    if (s.includes('Chờ')) return 'pending';
    return 'pending';
  }
  return {
    oneoffice_id:    Number(item.ID) || null,
    gr_code:         item.code || `GR-${item.ID}`,
    // warehouse_id will be null — we store warehouse name in note
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContract(item: any) {
  // Actual fields: ID, code, contract_type, type, customer_id (name), customer_name,
  // customer_code, customer_type, customer_phones, customer_emails,
  // date_sign, date_start, date_end, status_view, app_approval_status,
  // total_price, currency_unit, pay_type, product_ids, details, desc, created_by_id
  return {
    oneoffice_id:     Number(item.ID) || null,
    contract_code:    item.code || `CTR-${item.ID}`,
    contract_type:    item.contract_type || null,
    type:             item.type || null,
    customer_name:    item.customer_name || item.customer_id || null,
    customer_code:    item.customer_code || null,
    customer_type:    item.customer_type || null,
    customer_phone:   item.customer_phones || null,
    customer_email:   item.customer_emails || null,
    sign_date:        parseDate(item.date_sign),
    start_date:       parseDate(item.date_start),
    end_date:         parseDate(item.date_end) || null,
    status:           item.status_view || null,
    approval_status:  item.app_approval_status || null,
    total_amount:     parseNum(item.total_price),
    currency_unit:    item.currency_unit || 'VND',
    pay_type:         item.pay_type || null,
    product_list:     item.product_ids || null,
    detail_text:      item.details || null,
    note:             item.desc || null,
    created_by:       item.created_by_id || null,
    updated_at:       new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapQuotation(item: any) {
  // Actual fields: ID, code, title, customer_id (int), customer_name, customer_code,
  // customer_phone, customer_email, date_sign, date_to, total_price (number),
  // money_currency, app_approval_status, product_ids, product_detail, desc, created_by_id
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
    total_amount:    parseNum(item.total_price || item.money_currency),
    currency_unit:   item.currency_unit || 'VND',
    approval_status: item.app_approval_status || null,
    product_list:    item.product_ids || null,
    product_detail:  item.product_detail || null,
    note:            item.desc || null,
    created_by:      item.created_by_id || null,
    updated_at:      new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStocktake(item: any) {
  // Actual fields: ID, code, inventory_id (warehouse name), inventory_address,
  // status, app_approval_status, desc, date_sign, date_created, created_by_id
  return {
    oneoffice_id:      Number(item.ID) || null,
    stocktake_code:    item.code || `ST-${item.ID}`,
    warehouse_name:    item.inventory_id || null,
    warehouse_address: item.inventory_address || null,
    status:            item.status || null,
    approval_status:   item.app_approval_status || null,
    note:              item.desc || null,
    stocktake_date:    parseDate(item.date_sign) || parseDate(item.date_created),
    created_by:        item.created_by_id || null,
    updated_at:        new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSaleOrder(item: any) {
  return {
    oneoffice_id:    Number(item.ID) || null,
    order_code:      item.code || `SO-${item.ID}`,
    title:           item.title || null,
    customer_id:     Number(item.customer_id) || null,
    customer_name:   item.customer_name || null,
    customer_code:   item.customer_code || null,
    customer_phone:  item.customer_phone || null,
    customer_email:  item.customer_email || null,
    order_date:      parseDate(item.date_sign) || parseDate(item.date_created),
    delivery_date:   parseDate(item.delivery_date) || null,
    status:          item.status_view || item.status || null,
    approval_status: item.app_approval_status || null,
    total_amount:    parseNum(item.total_price),
    currency_unit:   item.currency_unit || 'VND',
    product_list:    item.product_ids || null,
    note:            item.desc || null,
    created_by:      item.created_by_id || null,
    updated_at:      new Date().toISOString(),
  };
}

// ── Sync Functions ──────────────────────────────────────────────

export interface SyncResult {
  table: string;
  fetched: number;
  upserted: number;
  errors: number;
  duration_ms: number;
  error_msg?: string;
}

async function syncTable(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetcher: () => Promise<any[]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapper: (item: any) => Record<string, unknown>,
  conflictKey: string,
  supabaseTable: string = name
): Promise<SyncResult> {
  const start = Date.now();
  try {
    console.log(`\n[Sync] ▶ Bắt đầu sync ${name} → ${supabaseTable}...`);
    const raw = await fetcher();
    const mapped = raw.map(mapper);
    const { upserted, errors } = await upsertBatch(supabaseTable, mapped, conflictKey);
    const duration_ms = Date.now() - start;
    console.log(`[Sync] ✅ ${name}: ${raw.length} fetch, ${upserted} upsert, ${errors} lỗi (${duration_ms}ms)`);
    return { table: supabaseTable, fetched: raw.length, upserted, errors, duration_ms };
  } catch (err) {
    const duration_ms = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] ❌ ${name}: ${msg}`);
    return { table: supabaseTable, fetched: 0, upserted: 0, errors: 1, duration_ms, error_msg: msg };
  }
}

export interface FullSyncResult {
  started_at: string;
  finished_at: string;
  total_duration_ms: number;
  results: SyncResult[];
  success: boolean;
}

/**
 * Chạy full sync tất cả bảng từ 1Office → Supabase
 */
export async function runFullSync(options?: { tables?: string[] }): Promise<FullSyncResult> {
  const startTime = Date.now();
  const started_at = new Date().toISOString();

  // Các task sync — table names phải khớp với Supabase schema thực tế
  const allTasks = [
    {
      name: 'products',
      fetcher: fetchProducts,
      mapper: mapProduct,
      conflict: 'oneoffice_id',
      table: 'products',
    },
    {
      name: 'goods_receipts',
      fetcher: fetchReceipts,
      mapper: mapReceipt,
      conflict: 'gr_code',
      table: 'goods_receipts',
    },
    {
      name: 'sale_contracts',
      fetcher: fetchContracts,
      mapper: mapContract,
      conflict: 'oneoffice_id',
      table: 'sale_contracts',
    },
    {
      name: 'sale_quotations',
      fetcher: fetchQuotations,
      mapper: mapQuotation,
      conflict: 'oneoffice_id',
      table: 'sale_quotations',
    },
    {
      name: 'stocktakes',
      fetcher: fetchStocktakes,
      mapper: mapStocktake,
      conflict: 'oneoffice_id',
      table: 'stocktakes',
    },
    {
      name: 'sale_orders',
      fetcher: fetchSaleOrders,
      mapper: mapSaleOrder,
      conflict: 'oneoffice_id',
      table: 'sale_orders',
    },
  ];

  // Lọc theo danh sách bảng nếu có
  const tasks = options?.tables
    ? allTasks.filter(t => options.tables!.includes(t.name) || options.tables!.includes(t.table))
    : allTasks;

  const results: SyncResult[] = [];

  for (const task of tasks) {
    const result = await syncTable(
      task.name,
      task.fetcher,
      task.mapper,
      task.conflict,
      task.table
    );
    results.push(result);
  }

  const finished_at = new Date().toISOString();
  const total_duration_ms = Date.now() - startTime;
  const success = results.every(r => r.error_msg === undefined);

  console.log(`\n[Sync] 🏁 Hoàn thành: ${total_duration_ms}ms | success=${success}`);

  return {
    started_at,
    finished_at,
    total_duration_ms,
    results,
    success,
  };
}
