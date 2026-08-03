/**
 * crm_sync_v1.mjs — Nạp 15 sheet "Blackstones Data Sync V1" → Supabase crm_*.
 *
 * Đọc export?format=xlsx (sheet phải share "Anyone with link → Viewer"), remap
 * header tiếng Việt → key ASCII (giống src/lib/crmSheetSync.ts), rút current-state
 * (dòng cuối / id, bỏ "Đã xóa"), upsert qua service-role.
 *
 * Chạy:  node scripts/crm_sync_v1.mjs            (tất cả 15 module)
 *        node scripts/crm_sync_v1.mjs crm_don_ban  (1 bảng)
 *
 * Yêu cầu trước: (1) đã chạy sql/migration_crm_v1_rebuild.sql; (2) 15 sheet đã public.
 */
import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- env ----
function loadEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r/g, '').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      // strip quotes + trailing literal \r \n \t escape-sequences + real whitespace
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '').replace(/(\\[rnt]|\s)+$/g, '').trim();
    }
  } catch { /* ignore */ }
  return out;
}
const env = { ...loadEnv('.env.local'), ...process.env };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong .env.local'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ---- header→key remap (suy từ scratch/_v1_headers.json) ----
const TBL = {
  accounts: 'crm_khach_hang', sale_orders: 'crm_don_ban', purchase_orders: 'crm_don_mua',
  sale_contracts: 'crm_hop_dong_ban', purchase_contracts: 'crm_hop_dong_mua', quotes: 'crm_bao_gia',
  products: 'crm_san_pham', tasks: 'crm_cong_viec', opportunities: 'crm_co_hoi', campaigns: 'crm_chien_dich',
  users: 'crm_nguoi_dung', warehouses: 'crm_kho', funds: 'crm_quy', payment_methods: 'crm_pt_thanh_toan', comments: 'crm_trao_doi',
};
const HMAP = {};
for (const m of JSON.parse(fs.readFileSync(path.join(ROOT, 'scratch/_v1_headers.json'), 'utf8'))) {
  const t = TBL[m.key]; if (!t) continue;
  HMAP[t] = {};
  for (const s of m.specs) if (HMAP[t][s.disp] === undefined) HMAP[t][s.disp] = s.h;
}

const AUDIT = new Set(['Thời điểm ghi nhận', 'Loại thay đổi', 'Trường thay đổi (cũ → mới)']);
const DELETED = 'Đã xóa';

// ── Sửa số 0 đầu SĐT/CCCD (Google Sheet lưu dạng số nên rớt số 0). Giống src/lib/khtt.ts ──
const isPhoneKey = (k) => /phone|mobile|so_dien_thoai/i.test(k);
const isCccdKey = (k) => /cccd|vneid/i.test(k);
function formatPhone(value) {
  let d = String(value ?? '').replace(/\D/g, '');
  if (!d) return String(value ?? '');
  if (d.startsWith('84') && d.length >= 11) d = d.slice(2);
  if (!d.startsWith('0')) d = '0' + d;
  return d;
}
function formatCccd(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d) return String(value ?? '');
  if (d.length === 11) return '0' + d; // CCCD/VNeID 12 số luôn bắt đầu bằng 0
  return d;
}
// Chỉ sửa khi giá trị TOÀN SỐ (đúng case bị Sheet ép kiểu số rớt 0) — tránh phá ghi chú.
function fixZero(key, val) {
  if (!val || !/^\d+$/.test(val)) return val;
  if (isPhoneKey(key)) return formatPhone(val);
  if (isCccdKey(key)) return formatCccd(val);
  return val;
}

// table -> {sheetId, idField}
const MODULES = [
  { table: 'crm_khach_hang',     sheetId: '14JwbrZlwjBbfJegWkcGDI5_KPBwFLs130b8gOZUCu68', idField: 'ID hệ thống' },
  { table: 'crm_don_ban',        sheetId: '1U5dFQsLOzA-Nex9NbTUv6m1KPCoXlIDgBNjZw653jbw', idField: 'ID hệ thống' },
  { table: 'crm_don_mua',        sheetId: '1ON_VwEl5Knc57Ayh5nVNQ2BOUx2ccmBks2Ojl-J1FRw', idField: 'ID hệ thống' },
  { table: 'crm_hop_dong_ban',   sheetId: '1Fu7q5X3hSXCEjob0xj_4WCXtZwpBXS2uq4XAqstcVfw', idField: 'ID hệ thống' },
  { table: 'crm_hop_dong_mua',   sheetId: '1iYnF7DpkUK745uvyeEltXrFd6WhR_PGPydG2r5lLGnQ', idField: 'ID hệ thống' },
  { table: 'crm_bao_gia',        sheetId: '18XfsreoG-glKAnWevh4Dx-zwR_rq0-efEFbfeQWVvI0', idField: 'ID hệ thống' },
  { table: 'crm_san_pham',       sheetId: '1ajHK9tCDFYpPK9HOyVwYU9CBPk1WbefZldsDuOksl7Y', idField: 'ID hệ thống' },
  { table: 'crm_cong_viec',      sheetId: '1Qq-3si3vlIisrepY0o4XrG36ZRlHWW-TDtuiCMdIDgQ', idField: 'ID hệ thống' },
  { table: 'crm_co_hoi',         sheetId: '1daGiwdVYw3rs495fMlTOX_cdlH3xkQp8zyRdrMqgJEY', idField: 'ID hệ thống' },
  { table: 'crm_chien_dich',     sheetId: '18jw4Y14pXrM1hWIzzYa8uoydYPjlFALmPmUyTXt3WHs', idField: 'ID hệ thống' },
  { table: 'crm_nguoi_dung',     sheetId: '1TFSMQloytvpoPcapgqBaSxr29k9Fd_NyIn1NwkgygHM', idField: 'ID người dùng' },
  { table: 'crm_kho',            sheetId: '1oEoDG-4iaz52U-SQfMC2lrARmO7hpseQtPRk3_umcbo', idField: 'ID hệ thống' },
  { table: 'crm_quy',            sheetId: '1WfEZuhCsBMZ27TEMdBSFCx6xAW5-Sa47-kquO8FXyjI', idField: 'ID hệ thống' },
  { table: 'crm_pt_thanh_toan',  sheetId: '1guQYnoNMz50oMHhGU3PtMe7zpZE46z5m6BuGtk-qcn0', idField: 'ID hệ thống' },
  { table: 'crm_trao_doi',       sheetId: '1dABhzdU1lDS7KpvPETNJXd5kPPAbQ7mELwX8BfRU7gA', idField: 'ID hệ thống' },
];

async function syncOne(mod) {
  const url = `https://docs.google.com/spreadsheets/d/${mod.sheetId}/export?format=xlsx`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) { console.log(`✗ ${mod.table}: HTTP ${res.status} — sheet chưa share public?`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.slice(0, 2).toString() !== 'PK') { console.log(`✗ ${mod.table}: không phải xlsx (sheet private / trả HTML).`); return; }
  const wb = xlsx.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames.find((n) => n !== '_state') ?? wb.SheetNames[0];
  const aoa = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: false, defval: '' });
  if (aoa.length < 2) { console.log(`• ${mod.table}: 0 dòng`); return; }

  const hdr = aoa[0].map((h) => String(h ?? '').trim());
  const tsIdx = hdr.indexOf('Thời điểm ghi nhận');
  const typeIdx = hdr.indexOf('Loại thay đổi');
  const idIdx = hdr.indexOf(mod.idField);
  if (idIdx < 0 || tsIdx < 0) { console.log(`✗ ${mod.table}: header sai (thiếu "${mod.idField}"/audit).`); return; }

  const hmap = HMAP[mod.table] ?? {};
  const dataCols = hdr.map((h, i) => ({ h, key: hmap[h] ?? h, i })).filter((x) => x.h !== '' && !AUDIT.has(x.h));

  const cur = new Map();
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r]; if (!row || !row.length) continue;
    const id = String(row[idIdx] ?? '').trim(); if (!id) continue;
    const data = {};
    for (const c of dataCols) { const v = row[c.i]; data[c.key] = fixZero(c.key, v === null || v === undefined ? '' : String(v)); }
    cur.set(id, { id, data, change_type: typeIdx >= 0 ? String(row[typeIdx] ?? '') : '', recorded_at: String(row[tsIdx] ?? '') });
  }
  const rows = [...cur.values()].filter((r) => r.change_type !== DELETED)
    .map((r) => ({ id: r.id, data: r.data, change_type: r.change_type || null, recorded_at: r.recorded_at || null, synced_at: new Date().toISOString() }));

  let up = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(mod.table).upsert(rows.slice(i, i + 500), { onConflict: 'id' });
    if (error) { console.log(`✗ ${mod.table}: UPSERT lỗi — ${error.message}`); return; }
    up += Math.min(500, rows.length - i);
  }
  console.log(`✓ ${mod.table}: ${rows.length} bản ghi hiện trạng → upsert ${up}`);
}

const only = process.argv[2];
const list = only ? MODULES.filter((m) => m.table === only) : MODULES;
if (!list.length) { console.error('Không có bảng: ' + only); process.exit(1); }
console.log(`Nạp ${list.length} module → ${SUPABASE_URL}\n`);
for (const mod of list) { try { await syncOne(mod); } catch (e) { console.log(`✗ ${mod.table}: ${e.message}`); } }
console.log('\nXong.');
