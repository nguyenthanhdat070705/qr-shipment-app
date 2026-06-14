/**
 * CRM Sheet Sync — đọc 14 Google Sheets (append-only) → rút current-state → mirror vào Supabase.
 *
 * Mỗi Sheet là LỊCH SỬ (mỗi thay đổi = 1 dòng mới, kèm 3 cột audit). "Hiện trạng" =
 * dòng cuối cùng theo `id`, loại các bản ghi mà thay đổi cuối là "Đã xóa".
 *
 * Đọc qua export?format=xlsx (giống `api/cron/sync-dam`), parse bằng `xlsx` (đã có sẵn).
 * Dùng service-role client (getSupabaseAdmin) để upsert/delete.
 */

import * as xlsx from 'xlsx';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CRM_MODULES, AUDIT_COLS, type CrmModule } from '@/config/crmModules';
import { CRM_HEADER_MAP } from '@/config/crmHeaderMap';
import { formatPhone, formatCccd } from '@/lib/khtt';

// Sửa số 0 đầu SĐT/CCCD (Google Sheet lưu dạng số nên rớt số 0). Chỉ sửa khi TOÀN SỐ.
const isPhoneKey = (k: string) => /phone|mobile|so_dien_thoai/i.test(k);
const isCccdKey = (k: string) => /cccd|vneid/i.test(k);
function fixLeadingZero(key: string, val: string): string {
  if (!val || !/^\d+$/.test(val)) return val;
  if (isPhoneKey(key)) return formatPhone(val);
  if (isCccdKey(key)) return formatCccd(val);
  return val;
}

const DELETED_LABEL = 'Đã xóa';
const UPSERT_CHUNK = 500;

export interface SheetRecord {
  id: string;
  data: Record<string, string>;
  change_type: string;
  recorded_at: string;
}

export interface ModuleSyncResult {
  module: string;
  table: string;
  label: string;
  sheetRows: number;   // tổng dòng lịch sử đọc được
  current: number;     // số bản ghi hiện trạng (sau khi rút gọn)
  upserted: number;
  deleted: number;
  error?: string;
}

/** Tải 1 Sheet → mảng bản ghi lịch sử (mỗi dòng = 1 record). */
export async function fetchSheetRecords(mod: CrmModule): Promise<SheetRecord[]> {
  const url = `https://docs.google.com/spreadsheets/d/${mod.sheetId}/export?format=xlsx`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Không tải được Sheet "${mod.label}" (HTTP ${res.status}). Sheet có thể chưa public.`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const workbook = xlsx.read(buffer, { type: 'buffer' });

  // Sheet data là sheet đầu tiên không phải "_state" (sheet ẩn so-sánh của Apps Script).
  const dataSheetName = workbook.SheetNames.find((n) => n !== '_state') ?? workbook.SheetNames[0];
  const ws = workbook.Sheets[dataSheetName];
  if (!ws) return [];

  // raw:false → lấy text đã format (đúng như hiển thị trên Sheet) → tránh lỗi serial date / số.
  const aoa = xlsx.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
  if (aoa.length < 2) return [];

  const headers = (aoa[0] as unknown[]).map((h) => String(h ?? '').trim());
  const auditSet = new Set(AUDIT_COLS);
  const tsIdx = headers.indexOf(AUDIT_COLS[0]);
  const typeIdx = headers.indexOf(AUDIT_COLS[1]);
  const idIdx = headers.indexOf(mod.idField);
  // Validate header: phải có cột khoá VÀ cột audit đầu tiên. Nếu Google trả trang
  // lỗi/HTML (throttle, mất quyền) → header sai → THROW (không trả rỗng âm thầm).
  if (idIdx < 0 || tsIdx < 0) {
    throw new Error(`Sheet "${mod.label}" header không hợp lệ (thiếu "${mod.idField}"/audit) — có thể Google trả lỗi.`);
  }
  // Sheet V1 dùng header TIẾNG VIỆT. Remap header -> KEY ASCII ổn định (account_code,
  // cf_cccd_kh, status...) để JSONB giữ key mà app + SQL đang phụ thuộc. Header lạ -> giữ nguyên.
  const hmap = CRM_HEADER_MAP[mod.table] ?? {};
  const dataCols = headers
    .map((h, i) => ({ h, key: hmap[h] ?? h, i }))
    .filter((x) => x.h !== '' && !auditSet.has(x.h));

  const out: SheetRecord[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    if (!row || row.length === 0) continue;
    const id = String(row[idIdx] ?? '').trim();
    if (!id) continue;
    const data: Record<string, string> = {};
    for (const { key, i } of dataCols) {
      const v = row[i];
      data[key] = fixLeadingZero(key, v === null || v === undefined ? '' : String(v));
    }
    out.push({
      id,
      data,
      change_type: typeIdx >= 0 ? String(row[typeIdx] ?? '') : '',
      recorded_at: tsIdx >= 0 ? String(row[tsIdx] ?? '') : '',
    });
  }
  return out;
}

/** Rút gọn lịch sử → hiện trạng: dòng cuối / id, bỏ bản ghi "Đã xóa". */
export function reduceToCurrent(records: SheetRecord[]): SheetRecord[] {
  const map = new Map<string, SheetRecord>();
  for (const rec of records) map.set(rec.id, rec); // append-only → dòng sau đè dòng trước
  const result: SheetRecord[] = [];
  for (const rec of map.values()) {
    if (rec.change_type === DELETED_LABEL) continue;
    result.push(rec);
  }
  return result;
}

/** Đồng bộ 1 module: Sheet → bảng Supabase (upsert hiện trạng + xoá bản ghi không còn). */
export async function syncModule(supabase: SupabaseClient, mod: CrmModule): Promise<ModuleSyncResult> {
  const base: ModuleSyncResult = {
    module: mod.key, table: mod.table, label: mod.label,
    sheetRows: 0, current: 0, upserted: 0, deleted: 0,
  };
  try {
    const records = await fetchSheetRecords(mod);
    const current = reduceToCurrent(records);
    base.sheetRows = records.length;
    base.current = current.length;

    const syncedAt = new Date().toISOString();
    const rows = current.map((rec) => ({
      id: rec.id,
      data: rec.data,
      change_type: rec.change_type || null,
      recorded_at: rec.recorded_at || null,
      synced_at: syncedAt,
    }));

    // Upsert theo id (chunk để tránh payload quá lớn).
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      const chunk = rows.slice(i, i + UPSERT_CHUNK);
      const { error } = await supabase.from(mod.table).upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(error.message);
      base.upserted += chunk.length;
    }

    // Xoá bản ghi không còn ở hiện trạng — CÓ HÀNG RÀO AN TOÀN chống xoá nhầm toàn bảng.
    const keep = new Set(rows.map((r) => r.id));
    const { data: existing, error: exErr } = await supabase.from(mod.table).select('id');
    if (exErr) throw new Error(exErr.message);
    const existingIds = (existing ?? []).map((e: { id: unknown }) => String(e.id));
    const stale = existingIds.filter((id) => !keep.has(id));

    // An toàn 1: Sheet trả 0 dòng nhưng bảng đang có data → fetch nhiều khả năng lỗi → KHÔNG xoá.
    if (current.length === 0 && existingIds.length > 0) {
      base.error = `Sheet "${mod.label}" trả 0 dòng nhưng bảng có ${existingIds.length} dòng — BỎ QUA để tránh xoá nhầm toàn bộ.`;
      return base;
    }
    // An toàn 2: định xoá > 50% bảng lớn (≥20 dòng) → nghi Sheet trả thiếu → KHÔNG xoá.
    if (existingIds.length >= 20 && stale.length > existingIds.length * 0.5) {
      base.error = `Sheet "${mod.label}" định xoá ${stale.length}/${existingIds.length} dòng (>50%) — BỎ QUA xoá để tránh mất data.`;
      return base;
    }

    for (let i = 0; i < stale.length; i += UPSERT_CHUNK) {
      const chunk = stale.slice(i, i + UPSERT_CHUNK);
      const { error } = await supabase.from(mod.table).delete().in('id', chunk);
      if (error) throw new Error(error.message);
      base.deleted += chunk.length;
    }

    return base;
  } catch (e) {
    base.error = e instanceof Error ? e.message : String(e);
    return base;
  }
}

/** Đồng bộ toàn bộ 14 module (tuần tự — an toàn bộ nhớ serverless). */
export async function syncAllModules(supabase: SupabaseClient): Promise<ModuleSyncResult[]> {
  const results: ModuleSyncResult[] = [];
  for (const mod of CRM_MODULES) {
    results.push(await syncModule(supabase, mod));
  }
  return results;
}

/** Đồng bộ 1 module theo slug (dùng cho sync chọn lọc nếu cần). */
export async function syncModuleByKey(supabase: SupabaseClient, key: string): Promise<ModuleSyncResult> {
  const mod = CRM_MODULES.find((m) => m.key === key);
  if (!mod) throw new Error(`Không có module CRM: ${key}`);
  return syncModule(supabase, mod);
}
