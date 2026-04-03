/**
 * Tạo tài khoản admin cho DB v2-testing
 * Chạy: node scripts/create_admin.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createAdmin() {
  console.log('\n🔐 Creating admin account for v2-testing...\n');

  // 1. Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@blackstone.com.vn',
    password: 'admin123',
    email_confirm: true, // Tự xác nhận email
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('⚠️  Auth user đã tồn tại, bỏ qua...');
    } else {
      console.error('❌ Lỗi tạo auth user:', authError.message);
      return;
    }
  } else {
    console.log('✅ Supabase Auth user created:', authUser.user.email);
  }

  // 2. Add to dim_account
  const { data: account, error: accountError } = await supabase
    .from('dim_account')
    .upsert({
      email: 'admin@blackstone.com.vn',
      ho_ten: 'Admin',
      chuc_vu: 'admin',
      phong_ban: 'Quản trị',
      ghi_chu: 'Tài khoản admin hệ thống',
    }, { onConflict: 'email' })
    .select()
    .single();

  if (accountError) {
    console.error('❌ Lỗi tạo dim_account:', accountError.message);
  } else {
    console.log('✅ dim_account created:', account.email, '- Role:', account.chuc_vu);
  }

  // 3. Seed dim_kho (3 kho)
  const warehouses = [
    { ma_kho: 'KHO1', ten_kho: 'Kho 1' },
    { ma_kho: 'KHO2', ten_kho: 'Kho 2' },
    { ma_kho: 'KHO3', ten_kho: 'Kho 3' },
  ];

  const { error: khoError } = await supabase
    .from('dim_kho')
    .upsert(warehouses, { onConflict: 'ma_kho' });

  if (khoError) {
    console.error('❌ Lỗi tạo dim_kho:', khoError.message);
  } else {
    console.log('✅ dim_kho created: KHO1, KHO2, KHO3');
  }

  console.log('\n🎉 Done! Bạn có thể đăng nhập với:');
  console.log('   Email: admin@blackstone.com.vn');
  console.log('   Password: admin123\n');
}

createAdmin().catch(console.error);
