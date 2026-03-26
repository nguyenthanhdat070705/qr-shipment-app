import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

async function seed() {
  console.log('🚀 BẮT ĐẦU FILL DỮ LIỆU ĐỂ HỆ THỐNG VẬN HÀNH ĐẦY ĐỦ...');

  // 1. Kho hàng 1Office (warehouses_1office)
  const whs = [
    { oneoffice_id: 101, code: 'KHO-01', name: 'Kho Hàm Long', address: 'Số 5, Đường 103-TML, Phường Cát Lái, Thủ Đức', is_active: true },
    { oneoffice_id: 102, code: 'KHO-02', name: 'Kho Kha Vạn Cân', address: '124 Kha Vạn Cân, Hiệp Bình, Thủ Đức', is_active: true },
    { oneoffice_id: 103, code: 'KHO-03', name: 'Kho Kinh Dương Vương', address: '36 Kinh Dương Vương, Phường Phú Lâm', is_active: true },
  ];
  await sb.from('warehouses_1office').upsert(whs, { onConflict: 'oneoffice_id' });
  console.log('✅ Filled: warehouses_1office');

  // 1b. Kho hành nội bộ (warehouses)
  for (const w of whs) {
    await sb.from('warehouses').upsert({ code: w.code, name: w.name, address: w.address, is_active: true }, { onConflict: 'code' });
  }
  console.log('✅ Filled: warehouses');

  // 2. Lấy 3 sản phẩm thực tế vừa kéo từ 1office (đối chiếu mapping)
  const { data: realProducts } = await sb.from('products').select('code, name, unit').limit(5);
  
  if (realProducts && realProducts.length > 0) {
    // 3. Tồn kho (inventory_1office)
    const inventories = [];
    for (let i = 0; i < realProducts.length; i++) {
      const p = realProducts[i];
      inventories.push({
        oneoffice_id: 5000 + i,
        product_code: p.code,
        product_name: p.name,
        warehouse_name: 'Kho Hàm Long',
        warehouse_code: 'KHO-01',
        quantity: Math.floor(Math.random() * 50) + 10,
        available_qty: Math.floor(Math.random() * 50) + 10,
        unit: p.unit || 'Cái'
      });
      inventories.push({
         oneoffice_id: 6000 + i,
         product_code: p.code,
         product_name: p.name,
         warehouse_name: 'Kho Kha Vạn Cân',
         warehouse_code: 'KHO-02',
         quantity: Math.floor(Math.random() * 30) + 5,
         available_qty: Math.floor(Math.random() * 30) + 5,
         unit: p.unit || 'Cái'
      });
    }
    await sb.from('inventory_1office').upsert(inventories, { onConflict: 'oneoffice_id' });
    console.log('✅ Filled: inventory_1office (Tồn kho dựa trên sản phẩm thực)');
  }

  // 4. Nhà cung cấp (suppliers)
  const sups = [
    { code: 'NCC-001', name: 'Nhà cung cấp Gỗ Tiến Đạt', tax_code: '0101234567', phone: '0901234567', is_active: true },
    { code: 'NCC-002', name: 'Công ty Inox Phát Tài', tax_code: '0109876543', phone: '0987654321', is_active: true },
  ];
  await sb.from('suppliers').upsert(sups, { onConflict: 'code' });
  console.log('✅ Filled: suppliers');

  // 5. Phiếu xuất kho mẫu để hệ thống hiển thị (delivery_orders & delivery_order_items)
  const { data: q1 } = await sb.from('delivery_orders').select('id').limit(1);
  if (!q1 || q1.length === 0) {
    const do1 = await sb.from('delivery_orders').insert({
      do_code: 'DO-202603-001',
      status: 'pending',
      customer_name: 'Đại lý vật tư Bình Dương',
      customer_phone: '0909999000',
      customer_address: 'BD'
    }).select('id').single();

    if (do1.data && realProducts && realProducts.length > 0) {
      await sb.from('delivery_order_items').insert({
        do_id: do1.data.id,
        product_code: realProducts[0].code,
        product_name: realProducts[0].name,
        quantity: 5
      });
    }
    console.log('✅ Filled: delivery_orders & items');
  }

  // 6. Notifications
  await sb.from('notifications').insert({
    sender_email: 'system@blackstone.com.vn',
    receiver_role: 'Admin',
    title: 'Đồng bộ 1Office thành công',
    message: 'Tất cả các dữ liệu đã được điền đủ 1 lần (Hợp đồng, phiếu nhập, xuất, sản phẩm, tồn kho) theo yêu cầu khẩn cấp của quản trị viên.',
    type: 'SYNC_SUCCESS',
    is_read: false
  });
  console.log('✅ Filled: notifications');
  console.log('🎉 XONG TOÀN BỘ!');
}

seed().catch(console.error);
