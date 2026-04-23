const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

const ACCOUNT = {
  email: 'bophanpttt@blackstone.com.vn',
  password: '123456@',
  ho_ten: 'Bộ phận PTTT',
  phong_ban: 'Phòng PTTT',
  chuc_vu: 'Nhân viên',
  role: 'sales',
};

async function main() {
  console.log(`\n📦 Creating account: ${ACCOUNT.email}`);

  // 1. Check if user already exists
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existing = usersData?.users?.find(
    (u) => u.email?.toLowerCase() === ACCOUNT.email.toLowerCase()
  );

  let userId;

  if (existing) {
    console.log(`  ↳ User exists (${existing.id}), updating password...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ACCOUNT.password,
      email_confirm: true,
    });
    if (updateErr) {
      console.error(`  ✗ Update failed: ${updateErr.message}`);
      return;
    }
    console.log(`  ✓ Password updated!`);
    userId = existing.id;
  } else {
    // 2. Create new user
    const { data, error } = await supabase.auth.admin.createUser({
      email: ACCOUNT.email,
      password: ACCOUNT.password,
      email_confirm: true,
    });
    if (error) {
      console.error(`  ✗ Create failed: ${error.message}`);
      return;
    }
    console.log(`  ✓ User created! ID: ${data.user.id}`);
    userId = data.user.id;
  }

  // 3. Upsert into dim_account
  const { error: dbErr } = await supabase.from('dim_account').upsert({
    email: ACCOUNT.email,
    ho_ten: ACCOUNT.ho_ten,
    phong_ban: ACCOUNT.phong_ban,
    chuc_vu: ACCOUNT.chuc_vu,
    role: ACCOUNT.role,
  }, { onConflict: 'email' });

  if (dbErr) {
    console.warn(`  ⚠ dim_account upsert warning: ${dbErr.message}`);
  } else {
    console.log(`  ✓ dim_account updated!`);
  }

  console.log(`\n  ✅ Done!`);
  console.log(`  📧 Email: ${ACCOUNT.email}`);
  console.log(`  🔑 Password: ${ACCOUNT.password}`);
}

main().catch(console.error);
