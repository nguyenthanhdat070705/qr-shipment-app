/**
 * Script: Populate fact_inventory from dim_hom + dim_kho
 * Tạo 1 bản ghi inventory cho mỗi sản phẩm × mỗi kho
 * Số lượng ban đầu = 0
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
  console.log('🔍 Đang lấy danh sách sản phẩm từ dim_hom...');
  const { data: products, error: prodErr } = await supabase
    .from('dim_hom')
    .select('id, ma_hom, ten_hom, loai_hom');

  if (prodErr) { console.error('❌ Lỗi lấy dim_hom:', prodErr.message); return; }
  console.log(`   → Tìm thấy ${products.length} sản phẩm`);

  console.log('🔍 Đang lấy danh sách kho từ dim_kho...');
  const { data: warehouses, error: khoErr } = await supabase
    .from('dim_kho')
    .select('id, ma_kho, ten_kho');

  if (khoErr) { console.error('❌ Lỗi lấy dim_kho:', khoErr.message); return; }
  console.log(`   → Tìm thấy ${warehouses.length} kho`);

  // Check existing inventory
  const { data: existing } = await supabase.from('fact_inventory').select('"Mã"');
  console.log(`📦 Hiện tại fact_inventory có ${(existing || []).length} bản ghi`);

  // Build records: mỗi sản phẩm tạo 1 bản ghi cho kho đầu tiên (hoặc tất cả kho)
  // Sử dụng kho đầu tiên làm default
  const defaultKho = warehouses[0];
  if (!defaultKho) {
    console.error('❌ Không có kho nào trong dim_kho! Hãy tạo kho trước.');
    return;
  }
  console.log(`🏭 Sử dụng kho mặc định: ${defaultKho.ma_kho} - ${defaultKho.ten_kho}`);

  const records = [];
  const existingSet = new Set();

  // Check which products already exist in inventory
  if (existing && existing.length > 0) {
    const { data: existingInv } = await supabase.from('fact_inventory').select('"Tên hàng hóa"');
    (existingInv || []).forEach(r => existingSet.add(r['Tên hàng hóa']));
  }

  for (const prod of products) {
    // Skip if already in inventory
    if (existingSet.has(prod.id)) {
      continue;
    }

    records.push({
      'Tên hàng hóa': prod.id,       // FK → dim_hom.id
      'Kho': defaultKho.id,            // FK → dim_kho.id
      'Số lượng': 0,                   // Tồn kho ban đầu
      'Loại hàng': prod.loai_hom || '',
      'Ghi chú': 0,                    // Số lượng khả dụng
    });
  }

  if (records.length === 0) {
    console.log('⚠ Không có sản phẩm mới cần thêm vào tồn kho.');
    return;
  }

  console.log(`\n📥 Đang thêm ${records.length} sản phẩm vào fact_inventory...`);

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error: insertErr } = await supabase.from('fact_inventory').insert(batch);
    if (insertErr) {
      console.error(`❌ Batch ${Math.floor(i/50)+1} lỗi:`, insertErr.message);
    } else {
      inserted += batch.length;
      console.log(`   ✅ Batch ${Math.floor(i/50)+1}: ${batch.length} sản phẩm`);
    }
  }

  console.log(`\n🎉 Hoàn tất! Đã thêm ${inserted}/${records.length} sản phẩm vào kho.`);

  // Verify
  const { data: finalCount } = await supabase.from('fact_inventory').select('"Mã"');
  console.log(`📊 Tổng fact_inventory hiện tại: ${(finalCount || []).length} bản ghi`);
})();
