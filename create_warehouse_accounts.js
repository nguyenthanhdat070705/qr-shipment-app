const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

const WAREHOUSE_ACCOUNTS = [
  {
    email: 'kho1@blackstone.com.vn',
    password: '123456@',
    ho_ten: 'Kho 1',
    phong_ban: 'Kho',
    chuc_vu: 'Thủ kho',
    role: 'warehouse',
  },
  {
    email: 'kho2@blackstone.com.vn',
    password: '123456@',
    ho_ten: 'Kho 2',
    phong_ban: 'Kho',
    chuc_vu: 'Thủ kho',
    role: 'warehouse',
  },
];

async function createOrUpdateUser(account) {
  console.log(`\n📦 Processing: ${account.email}`);

  // 1. Check if user already exists
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const existing = usersData?.users?.find(
    (u) => u.email?.toLowerCase() === account.email.toLowerCase()
  );

  let userId;

  if (existing) {
    console.log(`  ↳ User exists (${existing.id}), updating password...`);
    const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
      password: account.password,
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
      email: account.email,
      password: account.password,
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
    email: account.email,
    ho_ten: account.ho_ten,
    phong_ban: account.phong_ban,
    chuc_vu: account.chuc_vu,
    role: account.role,
  }, { onConflict: 'email' });

  if (dbErr) {
    console.warn(`  ⚠ dim_account upsert warning: ${dbErr.message}`);
  } else {
    console.log(`  ✓ dim_account updated!`);
  }

  console.log(`  ✅ Done: ${account.email} / ${account.password}`);
}

async function main() {
  console.log('🚀 Creating warehouse accounts...\n');
  for (const account of WAREHOUSE_ACCOUNTS) {
    await createOrUpdateUser(account);
  }
  console.log('\n🎉 All done! Warehouse accounts are ready.\n');
  console.log('Accounts:');
  for (const a of WAREHOUSE_ACCOUNTS) {
    console.log(`  📧 ${a.email}  🔑 ${a.password}`);
  }
}

main().catch(console.error);
