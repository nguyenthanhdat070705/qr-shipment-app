
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCols() {
  const { data, error } = await supabase.rpc('hello'); // or something to get cols
  // Alternatively we can use pgmeta or just select one and object_keys it.
  const { data: rows } = await supabase.from('dim_hom').select('*').limit(1);
  console.log('dim_hom columns:', Object.keys(rows[0]));
}
checkCols();

