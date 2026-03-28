const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: dimHom } = await supabase.from('dim_hom').select('*');
  const { data: dimNcc } = await supabase.from('dim_ncc').select('*');
  const { data: factDam } = await supabase.from('fact_dam').select('id, hom_loai, hom_ncc_hay_kho');
  
  const updates = [];
  
  for (const item of factDam) {
    const randomIdx = Math.floor(Math.random() * dimHom.length);
    const randomHom = dimHom[randomIdx];
    const ncc = dimNcc.find(n => n.id === randomHom.NCC);
    
    // update
    const { error } = await supabase
      .from('fact_dam')
      .update({
        hom_loai: randomHom.ten_hom,
        hom_ncc_hay_kho: ncc ? ncc.ten_ncc : 'KHÔNG RÕ'
      })
      .eq('id', item.id);
      
    if (error) {
     console.error("Error updating", item.id, error);
    } else {
      updates.push(item.id);
    }
  }
  
  console.log(`Updated ${updates.length} records in fact_dam.`);
}
main();
