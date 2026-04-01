import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFilter() {
  console.log("Testing goods issue filter for Kho Hàm Long...");
  const { data, error } = await supabase.from('fact_xuat_hang').select(`
    id,
    dim_kho!inner ( ten_kho ),
    fact_xuat_hang_items ( ten_hom )
  `).ilike('dim_kho.ten_kho', '%Kho Hàm Long%')
    .order('created_at', { ascending: false }).limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Data:", JSON.stringify(data, null, 2));
  }
}

testFilter();
