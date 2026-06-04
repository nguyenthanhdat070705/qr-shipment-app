/**
 * Đồng bộ đơn hàng KHTT (Khách Hàng Trăm Tuổi) từ GetFly → Supabase.
 *
 * CHỈ ĐỌC từ GetFly qua API v3 chính thức (header X-API-KEY).
 * ⚠️ TUYỆT ĐỐI không POST sang web API /crm/order/* — sẽ tạo đơn rác.
 * Xem [[reference_getfly_api]].
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isKhttOrderCode, KHTT_STATUS_WAITING, KHTT_STATUS_WAITING_LABEL, toAmount } from './khtt';

const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';
const GETFLY_WEB_BASE = 'https://blackstonesdvtl.getflycrm.com';
const PER_PAGE = 100;
const DETAIL_CONCURRENCY = 15;
const EXPIRY_CONCURRENCY = 8;

type Json = Record<string, unknown>;

function headers() {
  const key = (process.env.GETFLY_API_KEY || '').trim();
  if (!key) throw new Error('Thiếu GETFLY_API_KEY.');
  return { 'X-API-KEY': key, Accept: 'application/json' } as Record<string, string>;
}

async function fetchJson(url: string, retries = 3): Promise<Json> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: headers(), cache: 'no-store' });
      if (res.ok) return (await res.json()) as Json;
      if (res.status === 404) return {};
    } catch {
      /* retry */
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }
  throw new Error(`GetFly fetch thất bại: ${url}`);
}

/** Lấy toàn bộ đơn hàng bán (order_type=2). */
async function fetchAllSalesOrders(): Promise<Json[]> {
  const all: Json[] = [];
  let page = 1;
  while (page <= 40) {
    const data = await fetchJson(`${GETFLY_BASE}/orders?order_type=2&page=${page}&per_page=${PER_PAGE}`);
    const records = (data.records as Json[]) || [];
    if (records.length === 0) break;
    all.push(...records);
    const total = parseInt(String((data.pagination as Json)?.total_record || '0'), 10);
    if ((total && all.length >= total) || records.length < PER_PAGE) break;
    page++;
  }
  return all;
}

interface AccountInfo {
  account_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
}

/** Nạp toàn bộ getfly_accounts → map account_id → {tên KH, người thụ hưởng}. */
async function loadAccountMap(supabase: SupabaseClient): Promise<Map<string, AccountInfo>> {
  const map = new Map<string, AccountInfo>();
  const PAGE = 1000;
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase
      .from('getfly_accounts')
      .select('getfly_account_id, account_name, contact_name, contact_phone')
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const a of data as Json[]) {
      map.set(String(a.getfly_account_id), {
        account_name: (a.account_name as string) || null,
        contact_name: (a.contact_name as string) || null,
        contact_phone: (a.contact_phone as string) || null,
      });
    }
    if (data.length < PAGE) break;
  }
  return map;
}

/** Dự phòng: lấy account trực tiếp từ GetFly khi không có trong getfly_accounts. */
async function fetchAccountInfo(accountId: string): Promise<AccountInfo | null> {
  if (!accountId) return null;
  const data = await fetchJson(`${GETFLY_BASE}/account?account_id=${encodeURIComponent(accountId)}`);
  const info = (data.info as Json) || null;
  const contact = ((data.contacts as Json[]) || [])[0] || null;
  if (!info && !contact) return null;
  return {
    account_name: (info?.account_name as string) || null,
    contact_name: (contact?.first_name as string) || null,
    contact_phone: (contact?.phone_mobile as string) || (contact?.phone_home as string) || null,
  };
}

/** Lấy chi tiết đơn để biết "Gói sử dụng" (danh sách sản phẩm). */
async function fetchOrderDetails(codes: string[]): Promise<Map<string, Json>> {
  const out = new Map<string, Json>();
  for (let i = 0; i < codes.length; i += DETAIL_CONCURRENCY) {
    const batch = codes.slice(i, i + DETAIL_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (code) => {
        try {
          return [code, await fetchJson(`${GETFLY_BASE}/orders/${encodeURIComponent(code)}`)] as const;
        } catch {
          return [code, {} as Json] as const;
        }
      }),
    );
    for (const [code, detail] of results) out.set(code, detail);
  }
  return out;
}

// ── Web API: đọc custom field "Ngày hết hạn" (ngay_het_han) — chỉ GET, an toàn ──
async function getWebToken(): Promise<string | null> {
  const username = (process.env.GETFLY_WEB_USERNAME || '').trim();
  const password = (process.env.GETFLY_WEB_PASSWORD || '').trim();
  if (!username || !password) return null;
  try {
    const res = await fetch(`${GETFLY_WEB_BASE}/authenticate/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username, password, locale: 'vi', version: 5, is_desktop: true }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Json;
    return data.access_token ? String(data.access_token) : null;
  } catch {
    return null;
  }
}

/** "27/05/2028" (DD/MM/YYYY) → "2028-05-27"; trả null nếu rỗng/không hợp lệ. */
function vnDateToIso(value: unknown): string | null {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

/** Lấy ngày hết hạn cho từng đơn: GET /crm/order/edit?order_id=X&order_type=2 → mapper.ngay_het_han.field_value */
async function fetchExpiryMap(orderIds: string[], token: string): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const wh = { 'X-Authorization': `Bearer ${token}`, 'X-Getfly-Version': '5', Accept: 'application/json' };
  for (let i = 0; i < orderIds.length; i += EXPIRY_CONCURRENCY) {
    const batch = orderIds.slice(i, i + EXPIRY_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (id) => {
        try {
          const r = await fetch(
            `${GETFLY_WEB_BASE}/crm/order/edit?order_id=${encodeURIComponent(id)}&order_type=2`,
            { headers: wh, cache: 'no-store' },
          );
          if (!r.ok) return [id, null] as const;
          const j = (await r.json()) as Json;
          const mapper = (j.mapper as Json) || {};
          const cf = (mapper.ngay_het_han as Json) || {};
          return [id, vnDateToIso(cf.field_value)] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    );
    for (const [id, v] of results) out.set(id, v);
  }
  return out;
}

function packageFromDetail(detail: Json | undefined): { name: string | null; summary: string | null } {
  const products = (detail?.products as Json[]) || [];
  if (products.length === 0) return { name: null, summary: null };
  const names = products.map((p) => String(p.product_name || '').trim()).filter(Boolean);
  return { name: names[0] || null, summary: names.join('; ') || null };
}

export interface SyncResult {
  scanned: number;
  active: number;
  detailFetched: number;
  synced: number;
  removed: number;
}

/**
 * Đồng bộ. opts.dryRun = true → chỉ trả về dữ liệu, không ghi DB.
 */
export async function syncKhttOrders(
  supabase: SupabaseClient,
  opts: { dryRun?: boolean } = {},
): Promise<SyncResult & { rows?: Json[] }> {
  const orders = await fetchAllSalesOrders();
  const active = orders.filter(
    (o) => isKhttOrderCode(o.order_code) && String(o.status ?? '') === KHTT_STATUS_WAITING,
  );
  const activeIds = new Set(active.map((o) => String(o.order_id)));

  // Hợp đồng đã có (để bỏ qua fetch detail — gói không đổi).
  const existing = new Map<string, { package_name: string | null; package_summary: string | null }>();
  if (!opts.dryRun) {
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error } = await supabase
        .from('getfly_khtt_orders')
        .select('getfly_order_id, package_name, package_summary')
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      for (const r of data as Json[]) {
        existing.set(String(r.getfly_order_id), {
          package_name: (r.package_name as string) || null,
          package_summary: (r.package_summary as string) || null,
        });
      }
      if (data.length < 1000) break;
    }
  }

  const accountMap = opts.dryRun ? new Map<string, AccountInfo>() : await loadAccountMap(supabase);

  // Chỉ fetch detail cho đơn mới / chưa có tên gói.
  const needDetail = active.filter((o) => !existing.get(String(o.order_id))?.package_name);
  const detailMap = await fetchOrderDetails(needDetail.map((o) => String(o.order_code)).filter(Boolean));

  // Ngày hết hạn (custom field ngay_het_han) qua web API. Nếu đăng nhập web lỗi
  // → bỏ qua, KHÔNG ghi đè expiry_date đang có trong DB.
  const webToken = await getWebToken();
  const expiryMap = webToken
    ? await fetchExpiryMap(active.map((o) => String(o.order_id)), webToken)
    : null;

  // Dự phòng người thụ hưởng cho account không có trong getfly_accounts.
  const accountCache = new Map<string, AccountInfo | null>();
  async function resolveAccount(accId: string): Promise<AccountInfo | null> {
    if (accountMap.has(accId)) return accountMap.get(accId)!;
    if (accountCache.has(accId)) return accountCache.get(accId)!;
    const info = await fetchAccountInfo(accId);
    accountCache.set(accId, info);
    return info;
  }

  const rows: Json[] = [];
  for (const o of active) {
    const id = String(o.order_id);
    const accInfo = (o.account_info as Json) || {};
    const accId = String(accInfo.account_id || '');
    const acc = await resolveAccount(accId);
    const detail = detailMap.get(String(o.order_code));

    const pkg = detail
      ? packageFromDetail(detail)
      : { name: existing.get(id)?.package_name || null, summary: existing.get(id)?.package_summary || null };

    const customerName =
      acc?.account_name || ((detail?.order_info as Json)?.account_name as string) || null;

    const total = toAmount(o.amount);
    const paid = toAmount(o.f_amount);

    const row: Json = {
      getfly_order_id: id,
      order_code: (o.order_code as string) || null,
      order_date: (o.order_date as string) || null,
      order_status_code: KHTT_STATUS_WAITING,
      order_status: KHTT_STATUS_WAITING_LABEL,
      account_id: accId || null,
      customer_code: (accInfo.account_code as string) || null,
      customer_name: customerName,
      customer_phone: (accInfo.phone as string) || null,
      package_name: pkg.name,
      package_summary: pkg.summary,
      total_value: total,
      paid_amount: paid,
      remaining_amount: total - paid,
      beneficiary_name: acc?.contact_name || null,
      beneficiary_phone: acc?.contact_phone || null,
      person_in_charge: (o.assigned_name as string) || null,
      synced_at: new Date().toISOString(),
      raw_data: o,
    };
    // Chỉ set expiry_date khi đăng nhập web thành công (tránh ghi đè giá trị cũ trong DB).
    if (expiryMap) row.expiry_date = expiryMap.get(id) ?? null;
    rows.push(row);
  }

  const result: SyncResult & { rows?: Json[] } = {
    scanned: orders.length,
    active: active.length,
    detailFetched: detailMap.size,
    synced: 0,
    removed: 0,
  };

  if (opts.dryRun) {
    result.rows = rows;
    return result;
  }

  // Upsert theo từng chunk.
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase
      .from('getfly_khtt_orders')
      .upsert(chunk, { onConflict: 'getfly_order_id' });
    if (error) throw new Error(`Upsert lỗi: ${error.message}`);
    result.synced += chunk.length;
  }

  // Xoá các đơn không còn ở trạng thái Chờ duyệt (đã duyệt / huỷ).
  const { data: dbRows } = await supabase.from('getfly_khtt_orders').select('getfly_order_id');
  const stale = ((dbRows as Json[]) || [])
    .map((r) => String(r.getfly_order_id))
    .filter((id) => !activeIds.has(id));
  if (stale.length > 0) {
    const { error } = await supabase.from('getfly_khtt_orders').delete().in('getfly_order_id', stale);
    if (!error) result.removed = stale.length;
  }

  return result;
}
