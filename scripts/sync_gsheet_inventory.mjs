/**
 * Sync Google Sheet "Fact_Hom_Inventory" → Supabase fact_inventory
 * 
 * Cách dùng:
 *   1. Thay GOOGLE_SHEET_ID bằng ID thực của Google Sheet
 *   2. Đảm bảo sheet đã chia sẻ dạng "Mọi người có đường link"
 *   3. Chạy: node scripts/sync_gsheet_inventory.mjs
 * 
 * Cấu trúc Google Sheet:
 *   A: Mã | B: Tên hàng hóa | C: Kho | D: Số lượng | E: Loại hàng | F: Ghi chú
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════════
// ⚙️ CẤU HÌNH — THAY ĐỔI THEO DỰ ÁN CỦA BẠN
// ═══════════════════════════════════════════════════════════

// 👉 THAY GOOGLE_SHEET_ID bằng ID Google Sheet thực
//    Lấy từ URL: https://docs.google.com/spreadsheets/d/{ID}/edit
const GOOGLE_SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';

// 👉 GID = ID của sheet tab (mặc định tab đầu tiên = 0)
const GOOGLE_SHEET_GID = '0';

// Supabase config
const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

// ═══════════════════════════════════════════════════════════

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── CSV Parser ──────────────────────────────────────────────
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  console.log(`   Headers: ${headers.join(' | ')}`);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length >= 4 && fields[0]) {
      rows.push({
        ma:       fields[0],             // Cột A: Mã
        ten:      fields[1] || '',        // Cột B: Tên hàng hóa
        kho:      fields[2] || '',        // Cột C: Kho
        so_luong: fields[3] === '' ? 0 : parseInt(fields[3], 10) || 0, // Cột D
        loai:     fields[4] || null,      // Cột E: Loại hàng
        ghi_chu:  fields[5] || null,      // Cột F: Ghi chú
      });
    }
  }
  return rows;
}

// ── Fetch Google Sheet as CSV ───────────────────────────────
async function fetchGoogleSheet() {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}`;
  console.log(`🌐 Fetching: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Sheets error ${response.status}: ${response.statusText}\n` +
      `   → Kiểm tra lại:\n` +
      `   1. GOOGLE_SHEET_ID có đúng không?\n` +
      `   2. Sheet đã chia sẻ "Mọi người có đường link" chưa?`);
  }

  const text = await response.text();
  return text;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log('📊 Sync Google Sheet → fact_inventory');
  console.log('─'.repeat(55));

  // 1. Fetch CSV from Google Sheets
  console.log('\n📥 Step 1: Tải dữ liệu từ Google Sheet...');
  const csvText = await fetchGoogleSheet();
  const rows = parseCSV(csvText);
  console.log(`   → ${rows.length} dòng dữ liệu\n`);

  if (rows.length === 0) {
    console.log('⚠️  Không có dữ liệu để import!');
    return;
  }

  // Show sample
  console.log('   📋 Mẫu 3 dòng đầu:');
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const r = rows[i];
    console.log(`      ${r.ma} | ${r.ten.substring(0, 40)}... | ${r.kho} | SL: ${r.so_luong}`);
  }

  // 2. Get dim_hom → map ma_hom → id
  console.log('\n📋 Step 2: Lấy dim_hom...');
  const { data: allHom, error: homErr } = await supabase.from('dim_hom').select('id, ma_hom');
  if (homErr) throw new Error(`Lỗi dim_hom: ${homErr.message}`);
  const homMap = new Map();
  for (const h of allHom || []) homMap.set(h.ma_hom, h.id);

  // Tạo dim_hom mới nếu chưa có
  const missingHom = new Map();
  for (const r of rows) {
    if (!homMap.has(r.ma) && !missingHom.has(r.ma)) {
      missingHom.set(r.ma, r.ten);
    }
  }
  if (missingHom.size > 0) {
    console.log(`   ⚠️  ${missingHom.size} mã SP mới → tạo dim_hom`);
    for (const [ma, ten] of missingHom) {
      const { data: newH, error } = await supabase
        .from('dim_hom').insert({ ma_hom: ma, ten_hom: ten }).select('id').single();
      if (!error && newH) {
        homMap.set(ma, newH.id);
        console.log(`      ✅ ${ma}`);
      } else {
        console.error(`      ❌ ${ma}: ${error?.message}`);
      }
    }
  }
  console.log(`   → ${homMap.size} sản phẩm`);

  // 3. Get dim_kho → map ten_kho → id
  console.log('\n🏭 Step 3: Lấy dim_kho...');
  const { data: allKho, error: khoErr } = await supabase.from('dim_kho').select('id, ten_kho');
  if (khoErr) throw new Error(`Lỗi dim_kho: ${khoErr.message}`);
  const khoMap = new Map();
  for (const k of allKho || []) khoMap.set(k.ten_kho, k.id);
  console.log(`   → ${khoMap.size} kho: ${[...khoMap.keys()].join(', ')}`);

  // Check missing kho
  const khoSet = [...new Set(rows.map(r => r.kho))];
  for (const tenKho of khoSet) {
    if (!khoMap.has(tenKho)) {
      console.error(`   ❌ Kho "${tenKho}" không tồn tại trong dim_kho!`);
      console.error(`      → Hãy thêm kho này vào dim_kho trước khi chạy lại.`);
    }
  }

  // 4. Delete existing fact_inventory
  console.log('\n🗑️  Step 4: Xóa dữ liệu cũ...');
  const { data: existingRows } = await supabase.from('fact_inventory').select('Mã');
  if (existingRows && existingRows.length > 0) {
    for (let i = 0; i < existingRows.length; i += 50) {
      const batch = existingRows.slice(i, i + 50).map(r => r['Mã']);
      await supabase.from('fact_inventory').delete().in('Mã', batch);
    }
    console.log(`   ✅ Xóa ${existingRows.length} dòng cũ`);
  } else {
    console.log('   ✅ Bảng đã trống');
  }

  // 5. Insert new data
  console.log(`\n📥 Step 5: Insert ${rows.length} dòng mới...`);
  const insertData = [];
  let skipCount = 0;

  for (const row of rows) {
    const hom_id = homMap.get(row.ma);
    const kho_id = khoMap.get(row.kho);
    if (!hom_id) { console.error(`   ❌ Skip: mã "${row.ma}" không có trong dim_hom`); skipCount++; continue; }
    if (!kho_id) { console.error(`   ❌ Skip: kho "${row.kho}" không có trong dim_kho`); skipCount++; continue; }

    // Tính số lượng khả dụng
    let kha_dung = row.so_luong;
    const gc = (row.ghi_chu || '').toLowerCase();
    if (gc.includes('cọc') || gc.includes('đặt cọc')) {
      const m = (row.ghi_chu || '').match(/(\d+)\s*(?:cái)?\s*(?:đã)?\s*(?:đặt)?\s*cọc/i);
      kha_dung = m ? Math.max(0, row.so_luong - parseInt(m[1], 10)) : Math.max(0, row.so_luong - 1);
    }

    insertData.push({
      'Mã': randomUUID(),
      'Tên hàng hóa': hom_id,
      'Kho': kho_id,
      'Số lượng': row.so_luong,
      'Ghi chú': kha_dung,
    });
  }

  // Batch insert
  let successCount = 0;
  const CHUNK_SIZE = 50;
  for (let i = 0; i < insertData.length; i += CHUNK_SIZE) {
    const chunk = insertData.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase.from('fact_inventory').insert(chunk).select();
    if (error) {
      console.error(`   ❌ Chunk ${i}: ${error.message}`);
    } else {
      successCount += (data || []).length;
      console.log(`   ✅ Chunk ${i + 1}-${i + (data || []).length}: OK`);
    }
  }

  // 6. Report
  const { count } = await supabase.from('fact_inventory').select('*', { count: 'exact', head: true });

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`✅ SYNC HOÀN TẤT`);
  console.log(`   Nguồn:      Google Sheet "${GOOGLE_SHEET_ID.substring(0, 20)}..."`);
  console.log(`   Thành công:  ${successCount} / ${rows.length}`);
  if (skipCount > 0) console.log(`   Bỏ qua:     ${skipCount}`);
  console.log(`   Tổng DB:     ${count} bản ghi`);
  console.log(`${'═'.repeat(55)}`);
}

main().catch(err => {
  console.error('\n💥 LỖI:', err.message);
  process.exit(1);
});
