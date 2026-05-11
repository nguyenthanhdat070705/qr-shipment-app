const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: issues, error } = await supabase
    .from('fact_xuat_hang')
    .select('*, items:fact_xuat_hang_items(*)')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) console.error(error);
  console.log(JSON.stringify(issues, null, 2));
}
run();
