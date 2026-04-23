const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const payload = {
    ma_hom: 'TEST_UPSERT_01', 
    ten_hom: 'Test Upsert', 
    gia_ban: 0, 
    gia_von: 0
  };
  const { data, error } = await supabase.from('dim_hom').upsert([payload], { onConflict: 'ma_hom' });
  console.log(error || 'SUCCESS');
}
check();

