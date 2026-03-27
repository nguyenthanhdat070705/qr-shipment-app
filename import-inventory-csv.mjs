/**
 * import-inventory-csv.mjs
 * 
 * Import dữ liệu từ CSV "Hòm tồn kho" vào schema Star mới.
 * Tự động:
 *  1. Đọc CSV
 *  2. Tạo dim_hom (sản phẩm) nếu chưa có
 *  3. Tạo dim_kho (kho) nếu chưa có
 *  4. Tạo fact_inventory với FK đúng
 *
 * Usage: node import-inventory-csv.mjs "path/to/file.csv"
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Load env ──
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) { /* ignore */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Parse CSV ──
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    // Handle CSV with possible commas inside quotes
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  }).filter(row => {
    // Loại bỏ dòng trống
    const vals = Object.values(row);
    return vals.some(v => v && v.trim() !== '' && v !== 'NULL');
  });
}

// ── Main ──
async function main() {
  const csvPath = process.argv[2];
  
  if (!csvPath) {
    console.error('Usage: node import-inventory-csv.mjs "path/to/file.csv"');
    console.error('');
    console.error('CSV cần có các cột: Mã, Tên hàng hóa, Kho, Số lượng, Ghi chú');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════');
  console.log('  IMPORT INVENTORY CSV → STAR SCHEMA');
  console.log('═══════════════════════════════════════');

  // 1. Read CSV
  const csvContent = readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  console.log(`\n📄 Đọc CSV: ${rows.length} dòng dữ liệu`);
  
  if (rows.length === 0) {
    console.log('❌ Không có dữ liệu trong CSV');
    return;
  }

  // Show headers detected
  const sampleRow = rows[0];
  console.log('   Cột phát hiện:', Object.keys(sampleRow).join(', '));
  console.log('   Mẫu dòng đầu:', JSON.stringify(sampleRow));

  // 2. Auto-detect column mapping
  const keys = Object.keys(sampleRow);
  const colMa    = keys.find(k => /^m[ãa]/i.test(k)) || keys[0];
  const colTen   = keys.find(k => /t[eê]n|h[àa]ng/i.test(k)) || keys[1];
  const colKho   = keys.find(k => /kho/i.test(k)) || keys[2];
  const colSL    = keys.find(k => /s[ôốo]\s*l/i.test(k) || /quantity/i.test(k)) || keys[3];
  const colNote  = keys.find(k => /ghi\s*ch|note/i.test(k)) || keys[4];

  console.log(`\n🔍 Mapping cột:`);
  console.log(`   Mã SP     → "${colMa}"`);
  console.log(`   Tên SP    → "${colTen}"`);
  console.log(`   Kho       → "${colKho}"`);
  console.log(`   Số lượng  → "${colSL}"`);
  console.log(`   Ghi chú   → "${colNote}"`);

  // 3. Extract unique products and warehouses
  const uniqueProducts = new Map(); // ma_hom → ten_hom
  const uniqueWarehouses = new Set();

  for (const row of rows) {
    const ma  = String(row[colMa] || '').trim();
    const ten = String(row[colTen] || '').trim();
    const kho = String(row[colKho] || '').trim();
    
    if (ma) uniqueProducts.set(ma, ten || ma);
    if (kho) uniqueWarehouses.add(kho);
  }

  console.log(`\n📦 Phát hiện: ${uniqueProducts.size} sản phẩm, ${uniqueWarehouses.size} kho`);

  // 4. Upsert dim_hom
  console.log('\n── Bước 1: Import dim_hom (sản phẩm) ──');
  const homRows = [];
  for (const [ma, ten] of uniqueProducts) {
    homRows.push({ ma_hom: ma, ten_hom: ten });
  }

  const BATCH_SIZE = 50;
  let homInserted = 0;
  for (let i = 0; i < homRows.length; i += BATCH_SIZE) {
    const batch = homRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('dim_hom')
      .upsert(batch, { onConflict: 'ma_hom' });
    
    if (error) {
      console.log(`   ❌ Lỗi batch ${i}: ${error.message}`);
    } else {
      homInserted += batch.length;
    }
  }
  console.log(`   ✅ ${homInserted} sản phẩm`);

  // 5. Upsert dim_kho
  console.log('\n── Bước 2: Import dim_kho (kho) ──');
  for (const khoName of uniqueWarehouses) {
    const maKho = khoName
      .replace(/^Kho\s*/i, '')
      .substring(0, 20)
      .toUpperCase()
      .replace(/\s+/g, '-');
    
    const { error } = await supabase
      .from('dim_kho')
      .upsert({ 
        ma_kho: `KHO-${maKho}`, 
        ten_kho: khoName 
      }, { onConflict: 'ma_kho' });
    
    if (error) {
      // Có thể đã tồn tại với tên kho khác, thử dùng tên kho làm mã
      const { error: e2 } = await supabase
        .from('dim_kho')
        .upsert({ 
          ma_kho: khoName, 
          ten_kho: khoName 
        }, { onConflict: 'ma_kho' });
      
      if (e2) console.log(`   ⚠️ ${khoName}: ${e2.message}`);
      else console.log(`   ✅ ${khoName}`);
    } else {
      console.log(`   ✅ ${khoName} (mã: KHO-${maKho})`);
    }
  }

  // 6. Build lookup maps (ma → uuid)
  console.log('\n── Bước 3: Tạo mapping ID ──');
  
  const { data: allHom } = await supabase.from('dim_hom').select('id, ma_hom');
  const homMap = new Map();
  (allHom || []).forEach(h => homMap.set(h.ma_hom, h.id));
  console.log(`   dim_hom: ${homMap.size} records`);

  const { data: allKho } = await supabase.from('dim_kho').select('id, ma_kho, ten_kho');
  const khoMap = new Map();
  (allKho || []).forEach(k => {
    khoMap.set(k.ten_kho, k.id);
    khoMap.set(k.ma_kho, k.id);
  });
  console.log(`   dim_kho: ${khoMap.size} records`);

  // 7. Insert fact_inventory
  console.log('\n── Bước 4: Import fact_inventory ──');
  
  let insertedCount = 0;
  let errorCount = 0;
  const inventoryBatch = [];

  for (const row of rows) {
    const ma  = String(row[colMa] || '').trim();
    const kho = String(row[colKho] || '').trim();
    const sl  = parseInt(String(row[colSL] || '0').replace(/,/g, '')) || 0;
    const note = String(row[colNote] || '').trim();

    const homId = homMap.get(ma);
    const khoId = khoMap.get(kho);

    if (!homId) {
      console.log(`   ⚠️ Bỏ qua: Mã "${ma}" không tìm thấy trong dim_hom`);
      errorCount++;
      continue;
    }

    if (!khoId) {
      console.log(`   ⚠️ Bỏ qua: Kho "${kho}" không tìm thấy trong dim_kho`);
      errorCount++;
      continue;
    }

    inventoryBatch.push({
      hom_id: homId,
      kho_id: khoId,
      so_luong: sl,
      so_luong_kha_dung: sl,
      ma_lo: `LOT-${ma}`,
      trang_thai: sl > 0 ? 'active' : 'depleted',
      ghi_chu: note && note !== 'NULL' ? note : null,
    });
  }

  // Insert in batches
  for (let i = 0; i < inventoryBatch.length; i += BATCH_SIZE) {
    const batch = inventoryBatch.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('fact_inventory').insert(batch);
    
    if (error) {
      console.log(`   ❌ Batch ${i}: ${error.message}`);
      errorCount += batch.length;
    } else {
      insertedCount += batch.length;
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  ✅ Import hoàn tất!`);
  console.log(`  📊 fact_inventory: ${insertedCount} dòng thành công`);
  if (errorCount > 0) console.log(`  ⚠️ Bỏ qua: ${errorCount} dòng lỗi`);
  console.log(`═══════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
