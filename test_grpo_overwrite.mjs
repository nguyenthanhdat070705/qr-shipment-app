import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const API = 'http://localhost:3000/api';

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log("==================================================");
  console.log("    BẮT ĐẦU TEST TỰ ĐỘNG: GHI ĐÈ PHIẾU NHẬP (UNDO/OVERWRITE)");
  console.log("==================================================\n");

  // 1. Get a random active Kho
  const { data: khos } = await supabase.from('dim_kho').select('id, ten_kho').limit(1);
  const kho = khos[0];
  console.log(`📍 Sử dụng Kho test: ${kho.ten_kho} (${kho.id})`);

  // 2. Get a random product 
  const { data: homs } = await supabase.from('dim_hom').select('id, ma_hom, ten_hom, gia_von').limit(1);
  const hom = homs[0];
  console.log(`📦 Sản phẩm test: [${hom.ma_hom}] - ${hom.ten_hom}\n`);

  // 3. Check starting inventory
  const { data: inv1 } = await supabase.from('fact_inventory')
                                        .select('*')
                                        .eq('Tên hàng hóa', hom.id)
                                        .eq('Kho', kho.id);
  const invStart = inv1 && inv1.length > 0 ? Number(inv1[0]['Số lượng']) : 0;
  console.log(`📊 TỒN KHO BAN ĐẦU: ${invStart} cái.\n`);

  // 4. Create a PO orders 1000 items
  console.log(`[Bước 1] Tạo Đơn Mua Hàng (PO) số lượng 1000...`);
  const poRes = await fetch(`${API}/purchase-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse_id: kho.id,
      created_by: 'bot_test@blackstones.vn',
      items: [ { product_code: hom.ma_hom, product_name: hom.ten_hom, quantity: 1000, unit_price: hom.gia_von || 100000, hang_ky_gui: false } ]
    })
  });
  const poData = await poRes.json();
  const poId = poData.data.id;
  const poCode = poData.po_code;
  console.log(`✅ Đã tạo thành công mã PO: ${poCode}`);
  
  await delay(1000);

  // 5. Create GRPO 1 (Nhập lộn 1002 cái)
  console.log(`\n[Bước 2] Kế toán nhập lộn số lượng thực tế: 1002 cái (DƯ 2 CÁI). Tạo phiếu Nhập kho lần 1...`);
  const grpo1Res = await fetch(`${API}/goods-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          po_id: poId,
          warehouse_id: kho.id,
          received_by: 'bot_test@blackstones.vn',
          note: 'Lần 1 - Nhập lộn 1002',
          items: [{ product_code: hom.ma_hom, product_name: hom.ten_hom, expected_qty: 1000, received_qty: 1002 }]
      })
  });
  const grpo1Data = await grpo1Res.json();
  console.log(`✅ Đã sinh ra Phiếu Nhập lần 1: ${grpo1Data.gr_code}`);

  await delay(1000);

  // Check Inventory after Error
  const { data: inv2 } = await supabase.from('fact_inventory').select('*').eq('Tên hàng hóa', hom.id).eq('Kho', kho.id);
  const invAfterError = inv2 && inv2.length > 0 ? Number(inv2[0]['Số lượng']) : 0;
  console.log(`⚠️ TỒN KHO HIỆN TẠI (SAI): ${invAfterError} cái.`);

  await delay(2000);

  // 6. Create GRPO 2 (Nhập ĐÚNG 1000 cái đè lên)
  console.log(`\n[Bước 3] Kế toán phát hiện sai sót, Scan lại mã PO ${poCode} để nhập ĐÚNG 1000 cái...`);
  const grpo2Res = await fetch(`${API}/goods-receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          po_id: poId,
          warehouse_id: kho.id,
          received_by: 'bot_test@blackstones.vn',
          note: 'Lần 2 - Ghi đè chữa sai (1000)',
          items: [{ product_code: hom.ma_hom, product_name: hom.ten_hom, expected_qty: 1000, received_qty: 1000 }]
      })
  });
  const grpo2Data = await grpo2Res.json();
  console.log(`✅ Đã ghi đè thành công Phiếu Nhập lần 2: ${grpo2Data.gr_code}`);

  await delay(1000);

  // Check Final Inventory 
  const { data: inv3 } = await supabase.from('fact_inventory').select('*').eq('Tên hàng hóa', hom.id).eq('Kho', kho.id);
  const invFinal = inv3 && inv3.length > 0 ? Number(inv3[0]['Số lượng']) : 0;
  console.log(`\n🎉 TỒN KHO CUỐI CÙNG SAU KHI CHỮA SAI: ${invFinal} cái. (Đúng chuẩn ban đầu ${invStart} + 1000)`);
  
  if (invFinal === invStart + 1000) {
      console.log(`\n🚀 KẾT LUẬN: THUẬT TOÁN AUTO-CORRECTION CHẠY HOÀN HẢO 100%!`);
  } else {
      console.log(`\n❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH TÍNH TOÁN!`);
  }
}
run();
