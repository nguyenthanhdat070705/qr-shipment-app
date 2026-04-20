// Script tạo HV test có CCCD để demo tính năng tra cứu
// Chạy: node scripts/seed_test_member.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const testMember = {
  member_code: 'Mem260415_TEST',
  full_name:   'Nguyễn Văn Test CCCD',
  phone:       '0911000999',
  id_number:   '079111222333',     // ← CCCD dùng để test search
  email:       'test.cccd@blackstones.vn',
  address:     '123 Đường Demo, Quận 1, TP.HCM',
  registered_date: '2026-04-15',
  expiry_date:     '2036-04-15',
  status:          'active',
  payment_method:  'transfer',
  consultant_name: 'Admin Demo',
  branch:          'CN1',
  notes:           'HV tạo tự động để test tính năng tra cứu CCCD',
};

async function seed() {
  console.log('🌱 Tạo hội viên test...');

  // Xoá nếu đã tồn tại (để idempotent)
  await supabase.from('members').delete().eq('member_code', testMember.member_code);

  const { data, error } = await supabase
    .from('members')
    .insert(testMember)
    .select()
    .single();

  if (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }

  console.log('✅ Tạo thành công!');
  console.log('');
  console.log('📋 Thông tin hội viên test:');
  console.log(`   Mã HV   : ${data.member_code}`);
  console.log(`   Họ tên  : ${data.full_name}`);
  console.log(`   SĐT     : ${data.phone}`);
  console.log(`   CCCD    : ${data.id_number}`);
  console.log(`   ID (UUID): ${data.id}`);
  console.log('');
  console.log('🔍 Bây giờ mở trình duyệt và thử search:');
  console.log('   → http://localhost:3000/membership/lookup');
  console.log('   → Gõ: 079111222333  (CCCD)');
  console.log('   → Gõ: 0911000999    (SĐT)');
  console.log('   → Gõ: Test CCCD     (Tên)');
}

seed();
