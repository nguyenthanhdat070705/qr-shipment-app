import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const [khoRes, accRes] = await Promise.all([
     supabase.from('dim_kho').select('*'),
     supabase.from('dim_account').select('*').eq('email', 'kho1@blackstone.com.vn')
  ]);
  fs.writeFileSync('kho_output.json', JSON.stringify({ KHO: khoRes.data, ACC: accRes.data }, null, 2));
}
check();
