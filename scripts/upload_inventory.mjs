/**
 * Upload CSV → fact_inventory (với cột Loại hàng + giữ thứ tự file)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CSV_PATH = 'C:\\Users\\Thanh Dat\\Downloads\\Fact_Hom_Inventory - Hòm tồn kho 25.03.2025.csv';

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
  for (let i=1; i<lines.length; i++) {
    const f = parseCSVLine(lines[i]);
    if (f.length>=4 && f[0]) rows.push({
      stt: i,  // Giữ thứ tự gốc từ file
      ma: f[0], ten: f[1]||'', kho: f[2]||'',
      so_luong: f[3]===''?0:parseInt(f[3],10)||0,
      loai_hang: f[4]||null,
      ghi_chu: f[5]||null,
    });
  }
  return rows;
}

async function main() {
  console.log('📦 Upload tồn kho → fact_inventory (có Loại hàng)');
  console.log('─'.repeat(55));

  const csvText = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`📄 ${rows.length} dòng dữ liệu`);

  // Get dim_hom
  const { data: allHom } = await supabase.from('dim_hom').select('id, ma_hom');
  const homMap = new Map();
  for (const h of allHom||[]) homMap.set(h.ma_hom, h.id);

  // Create missing products
  const missing = new Map();
  for (const r of rows) if (!homMap.has(r.ma) && !missing.has(r.ma)) missing.set(r.ma, r.ten);
  if (missing.size > 0) {
    console.log(`⚠️  ${missing.size} SP mới → tạo dim_hom`);
    for (const [ma, ten] of missing) {
      const { data } = await supabase.from('dim_hom').insert({ ma_hom: ma, ten_hom: ten }).select('id').single();
      if (data) homMap.set(ma, data.id);
    }
  }

  // Get dim_kho
  const { data: allKho } = await supabase.from('dim_kho').select('id, ten_kho');
  const khoMap = new Map();
  for (const k of allKho||[]) khoMap.set(k.ten_kho, k.id);
  console.log(`🏭 Kho: ${[...khoMap.keys()].join(', ')}`);

  // Delete old data
  console.log('🗑️  Xóa data cũ...');
  const { data: old } = await supabase.from('fact_inventory').select('Mã');
  if (old && old.length > 0) {
    for (let i=0; i<old.length; i+=50) {
      await supabase.from('fact_inventory').delete().in('Mã', old.slice(i,i+50).map(r=>r['Mã']));
    }
    console.log(`   ✅ Xóa ${old.length} dòng`);
  }

  // Build insert data - INSERT THEO THỨ TỰ TỪ FILE (từng dòng 1 để đảm bảo thứ tự)
  console.log(`📥 Insert ${rows.length} dòng (giữ thứ tự file)...`);
  let ok = 0, skip = 0;
  const errors = [];

  // Insert từng dòng để đảm bảo thứ tự chính xác
  for (const row of rows) {
    const hom_id = homMap.get(row.ma);
    const kho_id = khoMap.get(row.kho);
    if (!hom_id) { errors.push(`Mã "${row.ma}" không có`); skip++; continue; }
    if (!kho_id) { errors.push(`Kho "${row.kho}" không có`); skip++; continue; }

    let kha_dung = row.so_luong;
    const gc = (row.ghi_chu||'').toLowerCase();
    if (gc.includes('cọc')) {
      const m = (row.ghi_chu||'').match(/(\d+)\s*(?:cái)?\s*(?:đã)?\s*(?:đặt)?\s*cọc/i);
      kha_dung = m ? Math.max(0, row.so_luong - parseInt(m[1],10)) : Math.max(0, row.so_luong - 1);
    }

    const { error } = await supabase.from('fact_inventory').insert({
      'Mã': randomUUID(),
      'Tên hàng hóa': hom_id,
      'Kho': kho_id,
      'Số lượng': row.so_luong,
      'Loại hàng': row.loai_hang,   // ← CỘT MỚI
      'Ghi chú': kha_dung,
    });

    if (error) {
      errors.push(`Dòng ${row.stt}: ${error.message}`);
      skip++;
    } else {
      ok++;
    }
  }

  // Report
  const { count } = await supabase.from('fact_inventory').select('*',{count:'exact',head:true});
  console.log(`\n${'═'.repeat(55)}`);
  console.log(`✅ Thành công: ${ok}/${rows.length} | DB total: ${count}`);
  if (skip > 0) {
    console.log(`   Bỏ qua: ${skip}`);
    console.log(`   Lỗi đầu: ${errors[0]}`);
  }
  console.log(`${'═'.repeat(55)}`);

  // Verify distribution
  const { data: inv } = await supabase.from('fact_inventory').select('Kho, Loại hàng');
  const dist = {};
  const loaiDist = {};
  for (const r of inv||[]) {
    dist[r['Kho']] = (dist[r['Kho']]||0)+1;
    const loai = r['Loại hàng'] || 'null';
    loaiDist[loai] = (loaiDist[loai]||0)+1;
  }
  console.log('\nPhân bố kho:');
  for (const k of allKho||[]) console.log(`   ${k.ten_kho}: ${dist[k.id]||0}`);
  console.log('\nPhân bố loại hàng:');
  for (const [l, c] of Object.entries(loaiDist)) console.log(`   ${l}: ${c}`);
}

main().catch(e=>{console.error('💥',e.message);process.exit(1)});
