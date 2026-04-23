require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing DB credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all products...");
  const { data: products, error } = await supabase.from('dim_hom').select('id, ma_hom, ten_hom, loai_go, "Thanh", ten_hom_the_hien');
  
  if (error) {
    console.error("Fetch DB error:", error);
    return;
  }
  console.log(`Found ${products.length} products. Analyzing...`);

  let updatedCount = 0;
  for (const p of products) {
    const loaiGo = p.loai_go ? ` ${p.loai_go}` : '';
    const thanh = p.Thanh ? ` ${p.Thanh}` : '';
    const expected = `Quan Tài${loaiGo}${thanh}`.trim();
    
    if (p.ten_hom_the_hien !== expected) {
      console.log(`Updating ${p.ma_hom}: '${p.ten_hom_the_hien}' -> '${expected}'`);
      const { error: upErr } = await supabase
        .from('dim_hom')
        .update({ ten_hom_the_hien: expected })
        .eq('id', p.id);
        
      if (upErr) {
        console.error(`Error updating ${p.ma_hom}:`, upErr);
      } else {
        updatedCount++;
      }
    }
  }
  
  console.log(`Finished updating ${updatedCount} products.`);
}

run();
