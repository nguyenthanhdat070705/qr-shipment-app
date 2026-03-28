const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateMaHom() {
  const { data: dimHom } = await supabase.from('dim_hom').select('ma_hom, ten_hom');
  const { data: factDam } = await supabase.from('fact_dam').select('id, hom_loai');
  
  if (!factDam || factDam.length === 0) return console.log('No data');

  let count = 0;
  for (const fact of factDam) {
    if (!fact.hom_loai) continue;
    const matchedDim = dimHom.find(d => d.ten_hom === fact.hom_loai);
    if (matchedDim) {
      await supabase.from('fact_dam').update({ ma_hom: matchedDim.ma_hom }).eq('id', fact.id);
      count++;
    }
  }
  console.log(`Updated ma_hom for ${count} records.`);
}
updateMaHom();
