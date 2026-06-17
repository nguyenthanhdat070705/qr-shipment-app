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
import { google } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CRM_MODULES, AUDIT_COLS, type CrmModule } from '@/config/crmModules';
import { CRM_HEADER_MAP } from '@/config/crmHeaderMap';
import { formatPhone, formatCccd } from '@/lib/khtt';

/**
 * Mã access-token của Service Account (nếu có cấu hình GOOGLE_CLIENT_EMAIL /
 * GOOGLE_PRIVATE_KEY) để đọc cả Sheet KHÔNG public.
 *
 * - CÓ creds  → mint token Drive read-only → fetch export URL kèm `Authorization`
 *   ⇒ đọc được Sheet riêng tư (chỉ cần share folder cho email service account).
 * - KHÔNG creds (hoặc mint lỗi) → trả null → fetch ẩn danh (Sheet phải public).
 *
 * Token cache theo từng lần chạy sync (15 Sheet dùng chung 1 token).
 */
let _tokenPromise: Promise<string | null> | null = null;
async function getGoogleAccessTokenOrNull(): Promise<string | null> {
  if (_tokenPromise) return _tokenPromise;
  _tokenPromise = (async () => {
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim();
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!clientEmail || !privateKey) return null;
    try {
      const jwt = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
      const { access_token } = await jwt.authorize();
      return access_token ?? null;
    } catch (e) {
      console.warn('[crmSheetSync] Không lấy được token service account, fallback ẩn danh:', e);
      return null;
    }
  })();
  return _tokenPromise;
}

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
const UPSERT_CHUNK = 1000; // chunk lớn hơn → ít round-trip → module nặng kịp trong 60s Vercel

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

/**
 * Tải buffer xlsx của 1 Sheet — CÓ RETRY. Sheet lớn (vd Trao Đổi ~30k dòng) hay rớt
 * kết nối giữa chừng ("fetch failed"/"terminated"); Google đôi khi trả HTML lỗi/redirect
 * (không phải xlsx). Hàm thử tối đa 3 lần, kiểm tra "PK" (magic của file ZIP/xlsx).
 */
async function downloadSheetXlsx(mod: CrmModule): Promise<Buffer> {
  const url = `https://docs.google.com/spreadsheets/d/${mod.sheetId}/export?format=xlsx`;
  const token = await getGoogleAccessTokenOrNull();
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store', headers });
      if (!res.ok) {
        // 401/403 = thiếu quyền đọc → KHÔNG retry, báo rõ cách khắc phục.
        if (res.status === 401 || res.status === 403) {
          const how = token
            ? `chưa chia sẻ cho service account (${process.env.GOOGLE_CLIENT_EMAIL ?? 'email service account'}) — vào folder "Blackstones Data Sync V1" → Share → thêm email này quyền Viewer.`
            : 'chưa được chia sẻ công khai — vào folder "Blackstones Data Sync V1" → Share → "Anyone with the link = Viewer" (hoặc cấu hình service account để giữ riêng tư).';
          throw new Error(`Không đọc được Sheet "${mod.label}" (HTTP ${res.status}): ${how}`);
        }
        throw new Error(`HTTP ${res.status}`); // 5xx/429 → để retry
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      // xlsx là ZIP → 2 byte đầu phải là "PK" (0x50 0x4B). Nếu không → Google trả HTML/redirect.
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        throw new Error(`không phải file Excel (Google chặn/redirect)`);
      }
      return buffer;
    } catch (e) {
      lastErr = e;
      // Lỗi quyền → ném ngay, không thử lại.
      if (e instanceof Error && /Không đọc được Sheet/.test(e.message)) throw e;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Không tải được Sheet "${mod.label}" sau 3 lần thử (${msg}).`);
}

/** Tải 1 Sheet → mảng bản ghi lịch sử (mỗi dòng = 1 record). */
export async function fetchSheetRecords(mod: CrmModule): Promise<SheetRecord[]> {
  const buffer = await downloadSheetXlsx(mod);
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

/**
 * Đồng bộ toàn bộ module (tuần tự — an toàn bộ nhớ serverless).
 * `budgetMs`: nếu đặt, NGỪNG bắt đầu module mới khi đã quá ngân sách thời gian (tránh
 * timeout cứng của Vercel). Module chưa kịp chạy được đánh dấu "bỏ qua" (sync lần sau).
 * Dùng cho cron (maxDuration 60s); nút "Sync ngay" trên UI gọi từng module riêng nên KHÔNG cần.
 */
export async function syncAllModules(
  supabase: SupabaseClient,
  opts: { budgetMs?: number } = {},
): Promise<ModuleSyncResult[]> {
  const started = Date.now();
  const results: ModuleSyncResult[] = [];
  for (const mod of CRM_MODULES) {
    if (opts.budgetMs && Date.now() - started > opts.budgetMs) {
      results.push({
        module: mod.key, table: mod.table, label: mod.label,
        sheetRows: 0, current: 0, upserted: 0, deleted: 0,
        error: 'Bỏ qua (hết thời gian cho phép trong 1 lần chạy) — sẽ đồng bộ ở lần sau.',
      });
      continue;
    }
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
