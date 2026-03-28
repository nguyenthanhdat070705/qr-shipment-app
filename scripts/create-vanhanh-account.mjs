/**
 * Script tạo tài khoản bộ phận Vận hành
 * Email: bophanvanhanh@blackstone.com.vn
 * Password: 123456@
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EMAIL    = 'bophanvanhanh@blackstone.com.vn';
const PASSWORD = '123456@';

async function main() {
  console.log('🚀 Bắt đầu tạo/cập nhật tài khoản Vận hành...\n');

  // Step 1: Check existing
  const { data: users } = await supabase.auth.admin.listUsers();
  const existing = users?.users?.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase());

  if (existing) {
    console.log(`ℹ️  Tài khoản đã tồn tại: ${EMAIL}`);
    console.log(`   ID: ${existing.id}`);

    // Update password
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
    });

    if (updateErr) {
      console.error('❌ Lỗi cập nhật:', updateErr.message);
    } else {
      console.log('✅ Đã cập nhật mật khẩu và xác nhận email!');
    }
  } else {
    // Create new
    const { data, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });

    if (error) {
      console.error('❌ Lỗi tạo tài khoản:', error.message);
      return;
    }
    console.log(`✅ Tạo tài khoản thành công!`);
    console.log(`   Email: ${EMAIL}`);
    console.log(`   ID:    ${data.user?.id}`);
  }

  // Step 2: Upsert into dim_account
  console.log('\n📋 Cập nhật bảng dim_account...');
  const { error: dimErr } = await supabase
    .from('dim_account')
    .upsert({
      email: EMAIL,
      ho_ten: 'Bộ phận Vận hành',
      phong_ban: 'Vận hành',
      role: 'operations',
    }, { onConflict: 'email' });

  if (dimErr) {
    console.warn('⚠️  Không thể upsert dim_account (có thể bảng chưa có cột role):', dimErr.message);
  } else {
    console.log('✅ dim_account đã được cập nhật!');
  }

  console.log('\n══════════════════════════════════════');
  console.log('🎉 Hoàn thành!');
  console.log('');
  console.log('Thông tin đăng nhập:');
  console.log(`  Email   : ${EMAIL}`);
  console.log(`  Mật khẩu: ${PASSWORD}`);
  console.log(`  Role    : operations (Vận hành)`);
  console.log('══════════════════════════════════════');
}

main().catch(console.error);
