/**
 * Fix kho: Delete fact_inventory → Delete dup kho → Re-insert with correct kho IDs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 4 kho gốc cần giữ (IDs from dim_kho)
const KEEP_KHO = {
  'Kho Kinh Dương Vương': '5d05ea62-125f-48b8-870b-52e916d1a5f9',  // KHO-03
  'Kho Hàm Long':        'd8808bcf-7ba4-45cb-879f-fc409f463fdd',  // KHO-01
  'Kho Kha Vạn Cân':     'cc42cba4-185e-4a0c-901a-a81e7f7de374',  // KHO-02
  'kho ký gửi':          'c18a1d0d-5bf7-4097-a741-3fc9a1eae816',  // KHO-KI-GUI
};

// 3 kho trùng cần xóa
const DELETE_KHO_IDS = [
  '2b7cf8d1-2882-4e98-a38d-d14eb101dfca',  // KHO-MYHV48
  'f66fe9f0-0b45-4bac-ae7b-3a90c648f0a6',  // KHO-IOSEK8
  '490764b0-d150-4ed5-8263-d1dcbc81ea1f',  // KHO-G792TL
];

// CSV Parser
function parseCSVLine(line) {
  const fields = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuotes && i+1<line.length && line[i+1]==='"') { current+='"'; i++; } else { inQuotes=!inQuotes; } }
    else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current=''; }
    else { current += ch; }
  }
  fields.push(current.trim()); return fields;
}
function parseCSV(text) {
  const lines = text.split('\n').map(l=>l.replace(/\r$/,'')).filter(l=>l.trim());
  const rows = [];
  for (let i=1;i<lines.length;i++) {
    const f = parseCSVLine(lines[i]);
    if (f.length>=4 && f[0]) rows.push({ ma:f[0], ten:f[1]||'', kho:f[2]||'', so_luong: f[3]===''?0:parseInt(f[3],10)||0, ghi_chu:f[4]||null });
  }
  return rows;
}

async function main() {
  console.log('🔧 Fix dim_kho & re-upload fact_inventory');
  console.log('─'.repeat(50));

  // Step 1: Delete ALL fact_inventory data
  console.log('\n🗑️  Step 1: Xóa toàn bộ fact_inventory...');
  const { data: allRows } = await supabase.from('fact_inventory').select('Mã');
  if (allRows && allRows.length > 0) {
    for (let i = 0; i < allRows.length; i += 50) {
      const batch = allRows.slice(i, i+50).map(r => r['Mã']);
      await supabase.from('fact_inventory').delete().in('Mã', batch);
    }
    console.log(`   ✅ Đã xóa ${allRows.length} dòng`);
  } else {
    console.log('   ✅ Bảng đã trống');
  }

  // Step 2: Update ten_kho of originals (already done from previous run, but re-ensure)
  console.log('\n📝 Step 2: Update ten_kho...');
  for (const [tenKho, id] of Object.entries(KEEP_KHO)) {
    await supabase.from('dim_kho').update({ ten_kho: tenKho }).eq('id', id);
    console.log(`   ✅ ${id.substring(0,8)} → "${tenKho}"`);
  }

  // Step 3: Delete duplicate kho
  console.log('\n🗑️  Step 3: Xóa 3 kho trùng...');
  for (const id of DELETE_KHO_IDS) {
    const { error } = await supabase.from('dim_kho').delete().eq('id', id);
    if (error) console.error(`   ❌ ${id.substring(0,8)}: ${error.message}`);
    else console.log(`   ✅ Deleted ${id.substring(0,8)}`);
  }

  // Verify dim_kho
  const { data: finalKho } = await supabase.from('dim_kho').select('id, ma_kho, ten_kho').order('ma_kho');
  console.log('\n📊 dim_kho sau xử lý:');
  for (const k of finalKho || []) {
    console.log(`   ${k.ma_kho} | ${k.ten_kho} | ${k.id}`);
  }

  // Step 4: Re-upload fact_inventory with correct kho IDs
  console.log('\n📥 Step 4: Re-upload fact_inventory...');
  const csvPath = resolve(__dirname, '..', 'Sample data', 'Hòm tồn kho 25.03.2025.csv');
  const csvText = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`   CSV: ${rows.length} dòng`);

  // Get dim_hom
  const { data: allHom } = await supabase.from('dim_hom').select('id, ma_hom');
  const homMap = new Map();
  for (const h of allHom || []) homMap.set(h.ma_hom, h.id);

  // Build kho map from remaining dim_kho
  const khoMap = new Map();
  for (const k of finalKho || []) khoMap.set(k.ten_kho, k.id);

  // Build insert data
  const insertData = [];
  let skipCount = 0;
  for (const row of rows) {
    const hom_id = homMap.get(row.ma);
    const kho_id = khoMap.get(row.kho);
    if (!hom_id) { console.error(`   ❌ Missing hom: ${row.ma}`); skipCount++; continue; }
    if (!kho_id) { console.error(`   ❌ Missing kho: "${row.kho}"`); skipCount++; continue; }

    let kha_dung = row.so_luong;
    const gc = (row.ghi_chu || '').toLowerCase();
    if (gc.includes('cọc') || gc.includes('đặt cọc')) {
      const m = (row.ghi_chu||'').match(/(\d+)\s*(?:cái)?\s*(?:đã)?\s*(?:đặt)?\s*cọc/i);
      kha_dung = m ? Math.max(0, row.so_luong - parseInt(m[1],10)) : Math.max(0, row.so_luong - 1);
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
  let success = 0;
  for (let i = 0; i < insertData.length; i += 50) {
    const chunk = insertData.slice(i, i+50);
    const { data, error } = await supabase.from('fact_inventory').insert(chunk).select();
    if (error) { console.error(`   ❌ Chunk ${i}: ${error.message}`); }
    else { success += (data||[]).length; console.log(`   ✅ Chunk ${i+1}-${i+(data||[]).length}: OK`); }
  }

  // Final verify
  const { count } = await supabase.from('fact_inventory').select('*', { count: 'exact', head: true });
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ HOÀN TẤT`);
  console.log(`   dim_kho: ${(finalKho||[]).length} kho`);
  console.log(`   fact_inventory: ${count} / ${rows.length} dòng`);
  if (skipCount > 0) console.log(`   Skipped: ${skipCount}`);
  console.log(`${'═'.repeat(50)}`);

  // Distribution
  const { data: inv } = await supabase.from('fact_inventory').select('Kho');
  const dist = {};
  for (const r of inv||[]) dist[r['Kho']] = (dist[r['Kho']]||0)+1;
  console.log('\nPhân bố kho:');
  for (const k of finalKho||[]) {
    console.log(`   ${k.ten_kho}: ${dist[k.id]||0} dòng`);
  }
}

main().catch(err => { console.error('\n💥', err.message); process.exit(1); });
