/**
 * Script: Tạo tài khoản VIP Admin cho BlackStones SCM
 * Email: quantri@blackstone.com.vn
 * Password: 123456@
 * Role: admin (toàn quyền)
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://woqtdgzldkxmcgjshthx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM'
);

const VIP_ADMIN = {
  email: 'quantri@blackstone.com.vn',
  password: '123456@',
  ho_ten: 'Quản trị viên VIP',
  phong_ban: 'Ban Giám đốc',
  chuc_vu: 'Giám đốc Quản trị',
  role: 'admin',
};

async function createVIPAdmin() {
  console.log('🔑 Tạo tài khoản VIP Admin cho BlackStones...\n');
  console.log(`  📧 Email: ${VIP_ADMIN.email}`);
  console.log(`  🔐 Password: ${VIP_ADMIN.password}`);
  console.log(`  👤 Họ tên: ${VIP_ADMIN.ho_ten}`);
  console.log(`  🏢 Phòng ban: ${VIP_ADMIN.phong_ban}`);
  console.log(`  🎖️  Chức vụ: ${VIP_ADMIN.chuc_vu}`);
  console.log(`  🛡️  Role: ${VIP_ADMIN.role} (toàn quyền)\n`);

  // 1. Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Lỗi lấy danh sách users:', listError.message);
    return;
  }

  const existing = usersData?.users?.find(
    (u) => u.email?.toLowerCase() === VIP_ADMIN.email.toLowerCase()
  );

  let userId;

  if (existing) {
    console.log(`  ↳ User đã tồn tại (${existing.id}), đang cập nhật mật khẩu...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: VIP_ADMIN.password,
      email_confirm: true,
    });
    if (updateErr) {
      console.error(`  ❌ Cập nhật thất bại: ${updateErr.message}`);
      return;
    }
    console.log(`  ✅ Mật khẩu đã được cập nhật!`);
    userId = existing.id;
  } else {
    // 2. Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: VIP_ADMIN.email,
      password: VIP_ADMIN.password,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ❌ Tạo user thất bại: ${error.message}`);
      return;
    }
    console.log(`  ✅ User đã được tạo! ID: ${data.user.id}`);
    userId = data.user.id;
  }

  // 3. Upsert into dim_account
  const { error: dbErr } = await supabase.from('dim_account').upsert({
    email: VIP_ADMIN.email,
    ho_ten: VIP_ADMIN.ho_ten,
    phong_ban: VIP_ADMIN.phong_ban,
    chuc_vu: VIP_ADMIN.chuc_vu,
  }, { onConflict: 'email' });

  if (dbErr) {
    console.warn(`  ⚠️  dim_account upsert warning: ${dbErr.message}`);
  } else {
    console.log(`  ✅ dim_account đã cập nhật!`);
  }

  console.log(`\n🎉 Hoàn tất! Tài khoản VIP Admin đã sẵn sàng.`);
  console.log(`\n════════════════════════════════════════════`);
  console.log(`  📧 Email:    ${VIP_ADMIN.email}`);
  console.log(`  🔑 Mật khẩu: ${VIP_ADMIN.password}`);
  console.log(`  🛡️  Quyền:    ADMIN (toàn quyền hệ thống)`);
  console.log(`════════════════════════════════════════════\n`);
}

createVIPAdmin().catch(console.error);
