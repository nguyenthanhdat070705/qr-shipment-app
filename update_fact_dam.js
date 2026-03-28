const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDimHom() {
  const { data: dimHom } = await supabase.from('dim_hom').select('*');
  console.log("dimHom completely:", JSON.stringify(dimHom, null, 2));
}

checkDimHom();
