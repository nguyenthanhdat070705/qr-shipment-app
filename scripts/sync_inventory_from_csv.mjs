/**
 * sync_inventory_from_csv.mjs
 * Đọc file CSV tồn kho thực tế → So sánh với DB → Cập nhật lại đúng số
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Parse CSV lines ──────────────────────────────────────────────────────────
const csvPath = resolve('C:/Users/Thanh Dat/OneDrive/Documents/Hòm tồn kho 25.03.2025 (dat).csv');
const raw = readFileSync(csvPath, 'utf-8');

const lines = raw.split('\n').slice(1); // skip header

const csvRows = [];
for (const line of lines) {
  if (!line.trim()) continue;
  // CSV parse (handle quoted fields)
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cols.push(cur.trim().replace('\r', ''));

  const [ma, ten, kho, slRaw, loai, ghiChu] = cols;
  const sl = parseInt(slRaw) || 0;
  if (!ma || !ten || !kho) continue;
  csvRows.push({ ma, ten, kho, sl, loai: loai || '', ghiChu: ghiChu || '' });
}

console.log(`\n📄 Tổng dòng CSV: ${csvRows.length}`);

// ── Fetch dim_kho ─────────────────────────────────────────────────────────────
const { data: khoList } = await supabase.from('dim_kho').select('id, ten_kho');
const khoMap = new Map(khoList.map(k => [k.ten_kho.trim(), k.id]));

// ── Fetch dim_hom ─────────────────────────────────────────────────────────────
const { data: homList } = await supabase.from('dim_hom').select('id, ma_hom');
const homMap = new Map(homList.map(h => [h.ma_hom.trim(), h.id]));

// ── Fetch current fact_inventory ──────────────────────────────────────────────
const { data: dbRows } = await supabase.from('fact_inventory').select('*');
console.log(`🗄️  Trong DB hiện có: ${dbRows.length} dòng\n`);

// ── Compare & report ──────────────────────────────────────────────────────────
let mismatches = 0;
let updated = 0;
let skipped = 0;

for (const csv of csvRows) {
  const khoId = khoMap.get(csv.kho);
  const homId = homMap.get(csv.ma);

  if (!khoId) { console.warn(`  ⚠️  Kho không tìm thấy: "${csv.kho}"`); continue; }
  if (!homId) { console.warn(`  ⚠️  Mã hòm không tìm thấy trong dim_hom: "${csv.ma}"`); continue; }

  // Find matching DB row
  const dbRow = dbRows.find(r => r['Tên hàng hóa'] === homId && r['Kho'] === khoId);

  if (!dbRow) {
    console.log(`  🆕 Thiếu: ${csv.ma} @ ${csv.kho} → SL=${csv.sl}`);
    skipped++;
    continue;
  }

  const dbSl = Number(dbRow['Số lượng'] || 0);
  const dbAvail = Number(dbRow['Ghi chú'] || 0);

  // "Ghi chú" (khả dụng) from CSV = SL minus any noted reservations
  let csvAvail = csv.sl;
  const note = csv.ghiChu.toLowerCase();
  // detect reservations in note
  const reserveMatch = note.match(/(\d+)\s*(cái)?\s*(đã\s*đặt\s*cọc|cọc|đặt\s*cọc)/);
  if (reserveMatch) {
    const reserved = parseInt(reserveMatch[1]);
    csvAvail = Math.max(0, csv.sl - reserved);
  }

  if (dbSl !== csv.sl || dbAvail !== csvAvail) {
    mismatches++;
    console.log(`  📊 ${csv.ma} @ ${csv.kho}`);
    console.log(`     DB: SL=${dbSl}, Khả dụng=${dbAvail}`);
    console.log(`     CSV: SL=${csv.sl}, Khả dụng=${csvAvail}${reserveMatch ? ` (trừ ${reserveMatch[1]} đặt cọc)` : ''}`);

    const { error } = await supabase
      .from('fact_inventory')
      .update({
        'Số lượng': csv.sl,
        'Ghi chú': csvAvail,
        'Loại hàng': csv.loai || dbRow['Loại hàng'],
      })
      .eq('Mã', dbRow['Mã']);

    if (error) {
      console.error(`     ❌ Lỗi update: ${error.message}`);
    } else {
      console.log(`     ✅ Đã cập nhật`);
      updated++;
    }
  }
}

console.log(`\n══════════════════════════════════════════`);
console.log(`✅ Đã cập nhật: ${updated} dòng`);
console.log(`⚠️  Thiếu dòng (cần thêm mới): ${skipped} dòng`);
console.log(`✔️  Không lệch: ${csvRows.length - mismatches - skipped} dòng`);
console.log(`══════════════════════════════════════════\n`);
