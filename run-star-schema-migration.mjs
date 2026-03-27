/**
 * run-star-schema-migration.mjs
 * Chạy migration Star Schema lên Supabase
 *
 * Usage: node run-star-schema-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Load env ──
const envPath = join(__dirname, '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) {
      process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  console.log('⚠️  Không tìm thấy .env.local, dùng env hiện có');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Danh sách bảng cần xóa (thứ tự quan trọng: con trước, cha sau) ──
const TABLES_TO_DROP = [
  'delivery_order_items',
  'delivery_orders',
  'goods_receipt_items',
  'goods_receipts',
  'purchase_order_items',
  'purchase_orders',
  'suppliers',
  'warehouses',
  'qr_codes',
  'notifications',
  'export_confirmations',
  'user_profiles',
  'product_holds',
  'product_logs',
  'products',
  'Dim_Products',
  'Hòm tháng 3',
  'sale_contracts',
  'sale_quotations',
  'sale_orders',
  'stocktakes',
  'warehouses_1office',
  'goods_receipts_1office',
  'inventory_1office',
  'sync_logs',
];

// ── Kiểm tra bảng hiện có ──
async function listCurrentTables() {
  console.log('\n📋 Kiểm tra bảng hiện có...');
  
  const existing = [];
  for (const table of TABLES_TO_DROP) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      existing.push(table);
    }
  }
  
  console.log(`   Tìm thấy ${existing.length} bảng: ${existing.join(', ')}`);
  return existing;
}

// ── Xóa từng bảng ──
async function dropTables(tables) {
  console.log('\n🗑️  Bắt đầu xóa bảng...');
  
  for (const table of tables) {
    // Xóa toàn bộ dữ liệu trước
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error && !error.message?.includes('does not exist')) {
      // Thử với column khác (một số bảng dùng 'stt' thay vì 'id')
      const { error: err2 } = await supabase.from(table).delete().gte('created_at', '1970-01-01');
      if (err2) {
        console.log(`   ⚠️  ${table}: ${err2.message}`);
      } else {
        console.log(`   ✅ Cleared: ${table}`);
      }
    } else if (!error) {
      console.log(`   ✅ Cleared: ${table}`);
    }
  }
}

// ── Tạo bảng mới ──
async function createNewTables() {
  console.log('\n📦 Tạo bảng mới...');
  
  // Tạo Dim tables
  const dimTables = [
    {
      name: 'dim_hom',
      check: async () => {
        const { error } = await supabase.from('dim_hom').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'dim_kho',
      check: async () => {
        const { error } = await supabase.from('dim_kho').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'dim_ncc',
      check: async () => {
        const { error } = await supabase.from('dim_ncc').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'dim_account',
      check: async () => {
        const { error } = await supabase.from('dim_account').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'fact_inventory',
      check: async () => {
        const { error } = await supabase.from('fact_inventory').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'fact_don_hang',
      check: async () => {
        const { error } = await supabase.from('fact_don_hang').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'fact_don_hang_items',
      check: async () => {
        const { error } = await supabase.from('fact_don_hang_items').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'fact_nhap_hang',
      check: async () => {
        const { error } = await supabase.from('fact_nhap_hang').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'fact_nhap_hang_items',
      check: async () => {
        const { error } = await supabase.from('fact_nhap_hang_items').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'fact_xuat_hang',
      check: async () => {
        const { error } = await supabase.from('fact_xuat_hang').select('id').limit(1);
        return !error;
      }
    },
    {
      name: 'fact_xuat_hang_items',
      check: async () => {
        const { error } = await supabase.from('fact_xuat_hang_items').select('id').limit(1);
        return !error;
      }
    },
  ];

  for (const t of dimTables) {
    const exists = await t.check();
    console.log(`   ${exists ? '✅' : '❌'} ${t.name}: ${exists ? 'Đã tồn tại' : 'Chưa tồn tại — cần tạo qua SQL Editor'}`);
  }
}

// ── Seed data ──
async function seedData() {
  console.log('\n🌱 Thêm dữ liệu mẫu...');
  
  // Check if dim_kho exists and has data
  const { data: khoData, error: khoErr } = await supabase.from('dim_kho').select('id').limit(1);
  
  if (khoErr) {
    console.log('   ⚠️  Bảng dim_kho chưa tồn tại — chạy SQL migration trước!');
    return;
  }
  
  if (khoData && khoData.length > 0) {
    console.log('   ℹ️  Dữ liệu mẫu đã có sẵn, bỏ qua.');
    return;
  }

  // Insert kho
  const { error: e1 } = await supabase.from('dim_kho').insert([
    { ma_kho: 'KHO-01', ten_kho: 'Kho Chính',     dia_chi: 'Xưởng sản xuất chính' },
    { ma_kho: 'KHO-02', ten_kho: 'Kho Chi nhánh', dia_chi: 'Chi nhánh phía Nam' },
    { ma_kho: 'KHO-03', ten_kho: 'Kho Phụ',       dia_chi: 'Kho phụ' },
  ]);
  console.log(`   ${e1 ? '❌' : '✅'} dim_kho: ${e1 ? e1.message : '3 kho'}`);

  // Insert NCC
  const { error: e2 } = await supabase.from('dim_ncc').insert([
    { ma_ncc: 'NCC-001', ten_ncc: 'Công ty TNHH Gỗ Việt',       nguoi_lien_he: 'Nguyễn Văn A', sdt: '0901234567' },
    { ma_ncc: 'NCC-002', ten_ncc: 'Xưởng Gỗ Phú Yên',           nguoi_lien_he: 'Trần Văn B',   sdt: '0912345678' },
    { ma_ncc: 'NCC-003', ten_ncc: 'Công ty CP Vật liệu Sài Gòn', nguoi_lien_he: 'Lê Thị C',    sdt: '0923456789' },
  ]);
  console.log(`   ${e2 ? '❌' : '✅'} dim_ncc: ${e2 ? e2.message : '3 NCC'}`);

  // Insert admin account
  const { error: e3 } = await supabase.from('dim_account').insert([
    { email: 'admin@blackstones.com.vn', ho_ten: 'Admin', chuc_vu: 'Quản trị viên', phong_ban: 'IT', role: 'admin' },
  ]);
  console.log(`   ${e3 ? '❌' : '✅'} dim_account: ${e3 ? e3.message : '1 admin'}`);
}

// ── Main ──
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  BLACKSTONE SCM — STAR SCHEMA MIGRATION');
  console.log('═══════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  
  // Step 1: List current tables
  const existing = await listCurrentTables();
  
  // Step 2: Clear data from old tables
  if (existing.length > 0) {
    await dropTables(existing);
  }
  
  // Step 3: Check new tables
  await createNewTables();
  
  // Step 4: Seed
  await seedData();
  
  console.log('\n═══════════════════════════════════════');
  console.log('  📌 BƯỚC TIẾP THEO:');
  console.log('  1. Mở Supabase Dashboard → SQL Editor');
  console.log('  2. Paste nội dung file migration_star_schema.sql');
  console.log('  3. Nhấn RUN để tạo bảng mới');
  console.log('  4. Chạy lại script này để seed dữ liệu mẫu');
  console.log('═══════════════════════════════════════\n');
}

main().catch(console.error);
