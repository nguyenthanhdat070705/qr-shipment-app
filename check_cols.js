const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: factDam } = await supabase.from('fact_dam').select('*').limit(1);
  if (factDam && factDam.length > 0) {
     console.log(Object.keys(factDam[0]));
  }
}
check();
