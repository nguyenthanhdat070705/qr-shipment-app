import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

console.log("==================================================");
console.log("🔧 SUPABASE DATA CLONER (V1 -> V2)");
console.log("==================================================\n");

// 1. Tải Biến Môi Trường (V1 và V2) thủ công do file .env.v1 có nhiều key trùng tên
const envV1Raw = fs.readFileSync('.env.v1', 'utf8');
const envV2Raw = fs.readFileSync('.env.local', 'utf8');

function extractKey(content, key) {
  const matches = content.match(new RegExp(`^${key}=(.+)`, 'gm'));
  // Lấy dòng cuối cùng khai báo (ví dụ có 2 dòng NEXT_PUBLIC_SUPABASE_URL thì lấy dòng cấu hình thật)
  if (matches && matches.length > 0) {
      return matches[matches.length - 1].split('=')[1].trim();
  }
  return null;
}

const V1_URL = extractKey(envV1Raw, 'NEXT_PUBLIC_SUPABASE_URL');
const V1_KEY = extractKey(envV1Raw, 'SUPABASE_SERVICE_ROLE_KEY') || extractKey(envV1Raw, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

const V2_URL = extractKey(envV2Raw, 'NEXT_PUBLIC_SUPABASE_URL');
const V2_KEY = extractKey(envV2Raw, 'SUPABASE_SERVICE_ROLE_KEY') || extractKey(envV2Raw, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!V1_KEY || !V2_KEY) {
  console.error("❌ Thiếu Service Role Key trong cấu hình!");
  process.exit(1);
}

// 2. Kết nối tới hai Database
const db1 = createClient(V1_URL, V1_KEY);
const db2 = createClient(V2_URL, V2_KEY);

// 3. Danh sách Bảng theo thứ tự An toàn (Ràng buộc FK)
const tablesToCopy = [
  'dim_hom', 
  'dim_kho', 
  'dim_ncc', 
  'dim_account',
  'warehouses', 
  'suppliers', 
  'products',
  'dim_dam', 
  'fact_dam', 
  'fact_inventory',
  'fact_don_hang',
  'fact_don_hang_items',
  'fact_nhap_hang',
  'fact_nhap_hang_items',
  'fact_xuat_hang',
  'fact_xuat_hang_items',
  'product_inventory', 
  'product_holds', 
  'product_logs',
  'purchase_orders', 
  'purchase_order_items',
  'goods_receipts', 
  'goods_receipt_items',
  'delivery_orders', 
  'delivery_order_items', 
  'export_confirmations', 
  'shipment_confirmations',
  'qr_codes', 
  'notifications'
];

async function copyTable(tableName) {
  process.stdout.write(`Đang sao chép [${tableName}]... `);
  
  // Hút dữ liệu từ V1
  const { data, error } = await db1.from(tableName).select('*').limit(3000); 
  
  if (error) {
     if (error.code === '42P01') {
         console.log(`Bỏ qua (bảng chưa từng tồn tại ở V1).`);
     } else {
         console.log(`\n   ❌ Lỗi đọc V1: ${error.message}`);
     }
     return;
  }
  
  if (!data || data.length === 0) {
      console.log(`Trống (0 dòng).`);
      return;
  }
  
  // ── XỬ LÝ LỖI "GENERATED ALWAYS" CHO CỘT thanh_tien ──
  if (tableName === 'fact_don_hang_items') {
    data.forEach(row => {
        delete row.thanh_tien;
    });
  }
  
  // Đẩy dữ liệu sang V2
  const { error: insErr } = await db2.from(tableName).insert(data);
  
  if (insErr) {
      if (insErr.code === '42P01') {
          console.log(`\n   ❌ Bảng ${tableName} CHƯA ĐƯỢC TẠO ở V2. Xin vui lòng chạy lại file migration_all.sql ở Supabase.`);
      } else {
          console.log(`\n   ❌ Ghi thất bại: ${insErr.message}`);
      }
  } else {
      console.log(`✅ Copy thành công ${data.length} hàng.`);
  }
}

async function run() {
   for (const t of tablesToCopy) {
       await copyTable(t);
   }
   console.log("\n🎉 HOÀN TẤT QUÁ TRÌNH NHÂN BẢN DỮ LIỆU!");
   console.log("Hãy bật (npm run dev) và vào Website V2 bằng trình duyệt để tận hưởng thành quả nhé.");
}

run();
