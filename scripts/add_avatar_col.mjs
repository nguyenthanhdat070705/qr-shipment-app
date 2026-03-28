import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

async function main() {
  // Create user_profiles table if not exist (with avatar_url + ghi_chu)
  // We use a trick - try to insert/select; if fail we know table doesn't exist
  const { error: checkErr } = await supabase
    .from('user_profiles')
    .select('id')
    .limit(1);

  if (checkErr && checkErr.message.includes('schema cache')) {
    console.log('user_profiles table does not exist. Please create it in Supabase SQL editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  ho_ten TEXT DEFAULT '',
  chuc_vu TEXT DEFAULT '',
  so_dien_thoai TEXT DEFAULT '',
  phong_ban TEXT DEFAULT '',
  ghi_chu TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
    `);
  } else {
    console.log('user_profiles table exists or accessible');
  }
  
  process.exit(0);
}

main();
