/**
 * Script RESET tồn kho: Xóa sạch fact_inventory rồi insert lại từ đầu
 * Chạy: node scripts/reset_inventory_apr20.mjs
 */
import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════════════════════════════════════════
// DATA kiểm kê chính thức 20/04/2026
// [ma_hom, kho_name, so_luong, loai_hang]
// ═══════════════════════════════════════════════════
const DATA = [
  ['2AQ0126', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0132', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0133', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0134', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0139', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0131', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0125', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0127', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0104', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0116', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0040', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0135', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0112', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0061', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0136', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0102', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0047', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0148', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0009', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0043', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0046', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0039', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0042', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0041', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0044', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0129', 'Kho Kha Vạn Cân', 4, 'Đã mua'],
  ['2AQ0128', 'Kho Kha Vạn Cân', 4, 'Đã mua'],
  ['2AQ0118', 'Kho Kha Vạn Cân', 8, 'Đã mua'],
  ['2AQ0119', 'Kho Kha Vạn Cân', 5, 'Đã mua'],
  ['2AQ0137', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0118', 'Kho Kha Vạn Cân', 4, 'Đã mua'],
  ['2AQ0100', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0064', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0124', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0163', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0165', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0168', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0105', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0075', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0010', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0011', 'Kho Kha Vạn Cân', 6, 'Đã mua'],
  ['2AQ0012', 'Kho Kha Vạn Cân', 3, 'Đã mua'],
  ['2AQ0106', 'Kho Kha Vạn Cân', 3, 'Đã mua'],
  ['2AQ0107', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0108', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0014', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0015', 'Kho Kha Vạn Cân', 0, 'Đã mua'],
  ['2AQ0172', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0173', 'Kho Kha Vạn Cân', 1, 'Đã mua'],
  ['2AQ0174', 'Kho Kha Vạn Cân', 2, 'Đã mua'],
  ['2AQ0046', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0043', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0039', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0044', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0111', 'Kho Kinh Dương Vương', 0, 'Đã mua'],
  ['2AQ0112', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0100', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0100', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0118', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0128', 'Kho Kinh Dương Vương', 3, 'Đã mua'],
  ['2AQ0129', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0157', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0064', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0119', 'Kho Kinh Dương Vương', 4, 'Đã mua'],
  ['2AQ0163', 'Kho Kinh Dương Vương', 4, 'Đã mua'],
  ['2AQ0168', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0010', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0012', 'Kho Kinh Dương Vương', 3, 'Đã mua'],
  ['2AQ0011', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0135', 'Kho Kinh Dương Vương', 2, 'Đã mua'],
  ['2AQ0106', 'Kho Kinh Dương Vương', 1, 'Đã mua'],
  ['2AQ0124', 'Kho Kinh Dương Vương', 0, 'Đã mua'],
  ['2AQ0172', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0173', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0133', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0128', 'Kho Hàm Long', 4, 'Đã mua'],
  ['2AQ0129', 'Kho Hàm Long', 3, 'Đã mua'],
  ['2AQ0130', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0118', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0119', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0163', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0002', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0046', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0044', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0039', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0100', 'Kho Hàm Long', 3, 'Đã mua'],
  ['2AQ0047', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0023', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0175', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0120', 'Kho Hàm Long', 0, 'Đã mua'],
  ['2AQ0116', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0115', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0043', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0110', 'Kho Hàm Long', 2, 'Đã mua'],
  ['2AQ0149', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0135', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0171', 'Kho Hàm Long', 1, 'Đã mua'],
  ['2AQ0061', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0050', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0104', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0090', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0014', 'Kho Hàm Long', 2, 'Ký gửi'],
  ['2AQ0015', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0013', 'Kho Hàm Long', 1, 'Ký gửi'],
  ['2AQ0012', 'Kho Hàm Long', 5, 'Ký gửi'],
  ['2AQ0011', 'Kho Hàm Long', 3, 'Ký gửi'],
  ['2AQ0010', 'Kho Hàm Long', 4, 'Ký gửi'],
  ['2AQ0106', 'Kho Hàm Long', 2, 'Ký gửi'],
  ['2AQ0107', 'Kho Hàm Long', 0, 'Ký gửi'],
];

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🔄 RESET TỒN KHO - Kiểm kê 20/04/2026');
  console.log('═══════════════════════════════════════\n');

  // 1. Load dim_hom
  const { data: allHom, error: homErr } = await supabase.from('dim_hom').select('id, ma_hom');
  if (homErr) { console.error('❌ Lỗi load dim_hom:', homErr.message); return; }
  const homMap = new Map();
  allHom.forEach(h => homMap.set(h.ma_hom, h.id));
  console.log(`📦 dim_hom: ${allHom.length} sản phẩm`);

  // 2. Load dim_kho
  const { data: allKho, error: khoErr } = await supabase.from('dim_kho').select('id, ten_kho');
  if (khoErr) { console.error('❌ Lỗi load dim_kho:', khoErr.message); return; }
  const khoMap = new Map();
  allKho.forEach(k => {
    khoMap.set(k.ten_kho, k.id);
    khoMap.set('Kho ' + k.ten_kho, k.id);
  });
  console.log(`🏭 dim_kho: ${allKho.length} kho`);
  allKho.forEach(k => console.log(`   • ${k.ten_kho} → ${k.id}`));

  // 3. DELETE toàn bộ fact_inventory
  console.log('\n🗑️  Đang xóa toàn bộ fact_inventory...');
  const { data: allInv } = await supabase.from('fact_inventory').select('"Mã"');
  if (allInv && allInv.length > 0) {
    const allIds = allInv.map(r => r['Mã']);
    // Delete in batches of 50
    for (let i = 0; i < allIds.length; i += 50) {
      const batch = allIds.slice(i, i + 50);
      const { error: delErr } = await supabase.from('fact_inventory').delete().in('Mã', batch);
      if (delErr) console.error(`   ❌ Lỗi xóa batch ${i}: ${delErr.message}`);
    }
    console.log(`   ✅ Đã xóa ${allInv.length} bản ghi cũ`);
  } else {
    console.log('   ℹ️  Bảng trống, không cần xóa');
  }

  // 4. Aggregate: nếu cùng ma_hom + kho + loại hàng → cộng dồn
  const aggMap = new Map(); // key: "ma_hom|khoName|loaiHang" -> sum
  for (const [maHom, khoName, qty, loaiHang] of DATA) {
    const key = `${maHom}|${khoName}|${loaiHang}`;
    aggMap.set(key, qty); // OVERWRITE instead of summing, because duplicates in Excel are errors
  }

  // 5. Insert fresh data
  console.log(`\n📝 Đang insert ${aggMap.size} bản ghi mới...`);
  let inserted = 0, skipped = 0, totalQty = 0;
  const rows = [];

  for (const [key, qty] of aggMap) {
    const [maHom, khoName, loaiHang] = key.split('|');
    const homId = homMap.get(maHom);
    const khoId = khoMap.get(khoName);

    if (!homId) {
      console.log(`   ⚠️  SKIP: ma_hom "${maHom}" không có trong dim_hom`);
      skipped++;
      continue;
    }
    if (!khoId) {
      console.log(`   ⚠️  SKIP: Kho "${khoName}" không có trong dim_kho`);
      skipped++;
      continue;
    }

    const khoShort = khoName.replace('Kho ', '').replace(/\s+/g, '').slice(0, 6);
    rows.push({
      'Mã': crypto.randomUUID(),
      'Tên hàng hóa': homId,
      'Kho': khoId,
      'Số lượng': qty,
      'Ghi chú': qty,
      'Loại hàng': loaiHang,
    });
    totalQty += qty;
  }

  // Insert in batches of 30
  for (let i = 0; i < rows.length; i += 30) {
    const batch = rows.slice(i, i + 30);
    const { error: insErr } = await supabase.from('fact_inventory').insert(batch);
    if (insErr) {
      console.error(`   ❌ Lỗi insert batch ${i}: ${insErr.message}`);
      // Try one by one for this batch
      for (const row of batch) {
        const { error: singleErr } = await supabase.from('fact_inventory').insert(row);
        if (singleErr) {
          console.error(`      ❌ ${row['Mã']}: ${singleErr.message}`);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
    }
  }

  // 6. Verify
  const { data: finalInv } = await supabase.from('fact_inventory').select('"Số lượng"');
  const finalTotal = finalInv ? finalInv.reduce((sum, r) => sum + Number(r['Số lượng'] || 0), 0) : 0;

  console.log('\n═══════════════════════════════════════');
  console.log('📊 KẾT QUẢ RESET TỒN KHO:');
  console.log(`   ✅ Đã insert: ${inserted} bản ghi`);
  console.log(`   ⚠️  Bỏ qua:   ${skipped} (không tìm thấy trong DB)`);
  console.log(`   📦 Tổng SL hòm (data gửi): ${totalQty}`);
  console.log(`   📦 Tổng SL hòm (DB thực tế): ${finalTotal}`);
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
