const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

async function addAdmin() {
  console.log('Creating/Updating admin user...');
  
  // Create or Update admin
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@blackstones.vn',
    password: 'admin123',
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('User already exists, updating password...');
      // Update password
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const user = usersData.users.find((u) => u.email === 'admin@blackstones.vn');
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, {
          password: 'admin123',
          email_confirm: true
        });
        console.log('Password updated successfully to admin123!');
      }
    } else {
      console.error('Error:', error);
    }
  } else {
    console.log('Admin user created successfully with password admin123');
  }
}

addAdmin();
