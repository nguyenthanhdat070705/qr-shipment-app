const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: dimHom } = await supabase.from('dim_hom').select('*');
  const { data: dimNcc } = await supabase.from('dim_ncc').select('*');
  fs.writeFileSync('output.json', JSON.stringify({ dimHom, dimNcc }, null, 2));
}

main();
