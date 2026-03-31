/**
 * ═══════════════════════════════════════════════════════════════════
 * Sync Google Sheet "Fact_Dam" → Supabase fact_dam + dim_dam
 * ═══════════════════════════════════════════════════════════════════
 *
 * Cách dùng:
 *   node scripts/sync_gsheet_fact_dam.mjs
 *
 * Nếu sheet CHƯA public (còn private), có 2 cách:
 *   A. Xuất CSV thủ công từ Google Sheets và để vào Downloads:
 *      → Script sẽ tự phát hiện và đọc file CSV đó
 *   B. Chia sẻ sheet "Mọi người có đường link (Viewer)"
 *      → Script sẽ tự động fetch từ Google Sheets
 *
 * Sheet URL: https://docs.google.com/spreadsheets/d/1NySorW3c07R_w7smqMkGbAja6I9rIVLT4s0OGZEOIOg
 * Sheet GID: 1072390539 (tab Fact_Dam)
 * ═══════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── CẤU HÌNH ──────────────────────────────────────────────────────
const GOOGLE_SHEET_ID = '1NySorW3c07R_w7smqMkGbAja6I9rIVLT4s0OGZEOIOg';
const GOOGLE_SHEET_GID = '1072390539'; // Tab Data2Sync (Lich_Lam_Dam_Sync)

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

// Fallback: đường dẫn CSV nếu export thủ công
const FALLBACK_CSV_PATHS = [
  join(homedir(), 'Downloads', 'Fact_Dam.csv'),
  join(homedir(), 'Downloads', 'fact_dam.csv'),
  join(homedir(), 'OneDrive', 'Documents', 'Fact_Dam.csv'),
];
// ───────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── CSV Parser chuẩn (hỗ trợ dấu ngoặc kép, dấu phẩy trong field) ──
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
  const lines = text.split('\n').map(l => l.replace(/\r$/, ''));
  return lines;
}

// ── Tìm header row (sheet Data2Sync có 2 dòng header, dữ liệu thực từ row 3) ─
function findHeaderRowIndex(lines) {
  // Sheet Data2Sync: Row 1 = nhóm chính, Row 2 = chi tiết, Row 3+ = data
  // Tìm dòng chứa "MÃ ĐÁM" hoặc "STT" để xác định header row cuối
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lower = lines[i].toLowerCase();
    // Dòng header chi tiết (row 2) thường có STT ở cột A
    if ((lower.startsWith('stt') || lower.match(/^["\s]*stt/)) &&
        (lower.includes('ng') || lower.includes('th'))) {
      // Đây là header row → dữ liệu bắt đầu từ dòng kế
      return i;
    }
    if (lower.includes('m\u00e3 \u0111\u00e1m') || lower.includes('ma dam') || lower.includes('m\u00e3 dam')) {
      return i;
    }
  }
  // Fallback: dòng có nhiều dấu phẩy nhất trong 5 dòng đầu
  let maxCommas = 0, maxIdx = 1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const count = (lines[i].match(/,/g) || []).length;
    if (count > maxCommas) { maxCommas = count; maxIdx = i; }
  }
  return maxIdx;
}

// ── Parse rows thành object fact_dam ───────────────────────────────
function parseFactDamRows(lines, headerIdx) {
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const r = parseCSVLine(line);
    if (!r || r.length < 5) continue;

    // Cột 0: STT — bỏ qua nếu rỗng hoặc không phải số
    if (!r[0] || r[0].trim() === '') continue;

    // Cột 3: mã đám (key chính)
    const maDam = r[3]?.trim();
    if (!maDam) continue;

    rows.push({
      stt:                           r[0]?.trim()  || '',
      ngay:                          r[1]?.trim()  || '',
      thang:                         r[2]?.trim()  || '',
      ma_dam:                        maDam,
      loai:                          r[4]?.trim()  || '',
      chi_nhanh:                     r[5]?.trim()  || '',
      nguoi_mat:                     r[6]?.trim()  || '',
      dia_chi_to_chuc:               r[7]?.trim()  || '',
      dia_chi_chon_thieu:            r[8]?.trim()  || '',
      gio_liem:                      r[9]?.trim()  || '',
      ngay_liem:                     r[10]?.trim() || '',
      gio_di_quan:                   r[11]?.trim() || '',
      ngay_di_quan:                  r[12]?.trim() || '',
      sale:                          r[13]?.trim() || '',
      dieu_phoi:                     r[14]?.trim() || '',
      thay_so_luong:                 r[15]?.trim() || '',
      thay_ncc:                      r[16]?.trim() || '',
      thay_ten:                      r[17]?.trim() || '',
      hom_loai:                      r[18]?.trim() || '',
      hom_ncc_hay_kho:               r[19]?.trim() || '',
      hoa:                           r[20]?.trim() || '',
      da_kho_tiem_focmol:            r[21]?.trim() || '',
      ken_tay_so_le:                 r[22]?.trim() || '',
      ken_tay_ncc:                   r[23]?.trim() || '',
      quay_phim_chup_hinh_goi_dv:    r[24]?.trim() || '',
      quay_phim_chup_hinh_ncc:       r[25]?.trim() || '',
      mam_cung_so_luong:             r[26]?.trim() || '',
      mam_cung_ncc:                  r[27]?.trim() || '',
      di_anh_cao_pho:                r[28]?.trim() || '',
      bang_ron:                      r[29]?.trim() || '',
      la_trieu_bai_vi:               r[30]?.trim() || '',
      nhac:                          r[31]?.trim() || '',
      thue_rap_ban_ghe_so_luong:     r[32]?.trim() || '',
      thue_rap_ban_ghe_ncc:          r[33]?.trim() || '',
      hu_tro_cot:                    r[34]?.trim() || '',
      teabreak:                      r[35]?.trim() || '',
      xe_tang_le_loai:               r[36]?.trim() || '',
      xe_tang_le_dao_ty:             r[37]?.trim() || '',
      xe_tang_le_ncc:                r[38]?.trim() || '',
      xe_khach_loai:                 r[39]?.trim() || '',
      xe_khach_ncc:                  r[40]?.trim() || '',
      xe_cap_cuu:                    r[41]?.trim() || '',
      xe_khac:                       r[42]?.trim() || '',
      thue_nv_truc:                  r[43]?.trim() || '',
      bao_don:                       r[44]?.trim() || '',
      ghi_chu:                       r[45]?.trim() || '',
      chon_thieu:                    r[46]?.trim() || '',
    });
  }

  return rows;
}

// ── Fetch từ Google Sheets (nếu public) ────────────────────────────
async function fetchFromGoogleSheets() {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}`;
  console.log(`   🌐 URL: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Sheet chưa public hoặc link bị sai.`);
  }

  const text = await res.text();
  if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
    throw new Error('Nhận được HTML thay vì CSV — Sheet đang bị private.');
  }

  return text;
}

// ── Đọc từ file CSV thủ công ────────────────────────────────────────
function readFromLocalCSV() {
  for (const p of FALLBACK_CSV_PATHS) {
    if (existsSync(p)) {
      console.log(`   📂 Tìm thấy file local: ${p}`);
      return readFileSync(p, 'utf-8');
    }
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  📊 SYNC Google Sheet Fact_Dam → Supabase fact_dam');
  console.log('═'.repeat(60));

  // ── 1. Lấy dữ liệu CSV ──────────────────────────────────────────
  console.log('\n📥 Step 1: Lấy dữ liệu CSV...');

  let csvText = null;
  let source = '';

  // Thử fetch từ Google Sheets trước
  try {
    console.log('   🌐 Thử fetch từ Google Sheets...');
    csvText = await fetchFromGoogleSheets();
    source = 'Google Sheets (online)';
    console.log(`   ✅ Thành công! Độ dài: ${csvText.length} ký tự`);
  } catch (e) {
    console.log(`   ⚠️  Online fetch thất bại: ${e.message}`);
    console.log('   📂 Thử đọc file CSV local...');
    csvText = readFromLocalCSV();
    if (csvText) {
      source = 'File CSV local';
      console.log(`   ✅ Đọc file local thành công!`);
    }
  }

  if (!csvText) {
    console.error('\n❌ KHÔNG TÌM THẤY DỮ LIỆU!');
    console.error('   Có 2 cách cung cấp dữ liệu:');
    console.error('   ① Chia sẻ Google Sheet thành "Mọi người có đường link (Viewer)"');
    console.error('     rồi chạy lại script này.');
    console.error('   ② Xuất CSV từ Google Sheets:');
    console.error('      File → Tải xuống → Comma Separated Values (.csv)');
    console.error(`      Lưu vào: ${FALLBACK_CSV_PATHS[0]}`);
    console.error('      Rồi chạy lại script này.');
    process.exit(1);
  }

  // ── 2. Parse CSV ─────────────────────────────────────────────────
  console.log('\n🔍 Step 2: Parse CSV...');
  const lines = parseCSV(csvText);
  console.log(`   → Tổng ${lines.length} dòng thô`);

  const headerIdx = findHeaderRowIndex(lines);
  console.log(`   → Header tìm thấy ở dòng ${headerIdx + 1}: ${lines[headerIdx]?.substring(0, 80)}...`);

  const rows = parseFactDamRows(lines, headerIdx);
  console.log(`   → ${rows.length} đám hợp lệ sau khi parse`);

  if (rows.length === 0) {
    console.warn('\n⚠️  Không có dữ liệu để import. Kiểm tra lại cấu trúc CSV.');
    process.exit(0);
  }

  // Preview
  console.log('\n   📋 Preview 3 đám đầu:');
  for (const r of rows.slice(0, 3)) {
    console.log(`      STT ${r.stt.padEnd(4)} | Mã: ${r.ma_dam.padEnd(12)} | ${r.nguoi_mat.substring(0, 20)} | ${r.loai}`);
  }

  // ── 3. Upsert vào fact_dam ───────────────────────────────────────
  console.log(`\n💾 Step 3: Upsert ${rows.length} đám vào Supabase fact_dam...`);

  let successCount = 0;
  let errorCount = 0;
  const CHUNK_SIZE = 50;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('fact_dam')
      .upsert(chunk, { onConflict: 'ma_dam' })
      .select('ma_dam');

    if (error) {
      console.error(`   ❌ Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`);
      errorCount += chunk.length;
    } else {
      successCount += data?.length || chunk.length;
      console.log(`   ✅ Chunk ${Math.floor(i / CHUNK_SIZE) + 1} (${i + 1}–${Math.min(i + CHUNK_SIZE, rows.length)}): OK`);
    }
  }

  // ── 4. Sync dim_dam ──────────────────────────────────────────────
  console.log('\n📇 Step 4: Sync dim_dam...');

  const dimRows = rows.map(r => ({
    ma_dam:    r.ma_dam,
    loai:      r.loai,
    chi_nhanh: r.chi_nhanh,
    nguoi_mat: r.nguoi_mat,
  }));

  let dimSuccess = 0;
  for (let i = 0; i < dimRows.length; i += CHUNK_SIZE) {
    const chunk = dimRows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('dim_dam')
      .upsert(chunk, { onConflict: 'ma_dam' });

    if (error) {
      console.error(`   ⚠️  dim_dam chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`);
    } else {
      dimSuccess += chunk.length;
    }
  }
  console.log(`   ✅ dim_dam: ${dimSuccess} bản ghi`);

  // ── 5. Kết quả cuối ─────────────────────────────────────────────
  const { count } = await supabase
    .from('fact_dam')
    .select('*', { count: 'exact', head: true });

  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ SYNC HOÀN TẤT');
  console.log('═'.repeat(60));
  console.log(`  Nguồn dữ liệu : ${source}`);
  console.log(`  Đám xử lý    : ${rows.length}`);
  console.log(`  Thành công    : ${successCount}`);
  if (errorCount > 0) console.log(`  Lỗi          : ${errorCount}`);
  console.log(`  Tổng trong DB : ${count} đám`);
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('\n💥 LỖI NGHIÊM TRỌNG:', err.message);
  console.error(err.stack);
  process.exit(1);
});
