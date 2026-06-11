import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';
const envConfig = dotenv.parse(readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: gr } = await supabase
    .from('fact_nhap_hang')
    .select('*')
    .eq('ma_phieu_nhap', 'TGR-20260511-120');
  console.log("GRPO:", gr);

  const { data: items } = await supabase
    .from('fact_nhap_hang_items')
    .select('*')
    .eq('nhap_hang_id', gr?.[0]?.id);
  console.log("GR Items:", items);

  const { data: hom } = await supabase
    .from('dim_hom')
    .select('id, ma_hom')
    .eq('ma_hom', '2AQ0012');
  console.log("Hom:", hom);

  const { data: kho } = await supabase
    .from('dim_kho')
    .select('*')
    .ilike('ten_kho', '%Kinh Dương Vương%');
  console.log("Kho:", kho);

  if (hom?.[0]) {
    const { data: inv } = await supabase
      .from('fact_inventory')
      .select('*')
      .eq('Tên hàng hóa', hom[0].id)
      .eq('Kho', kho[0].id);
    
    console.log("Inventory before:", inv);
    
    if (inv?.length === 0) {
      console.log("Need to insert 3 items!");
      const { randomUUID } = await import('crypto');
      const { data, error } = await supabase.from('fact_inventory').insert({
        'Mã': randomUUID(),
        'Tên hàng hóa': hom[0].id,
        'Kho': kho[0].id,
        'Số lượng': 3,
        'Ghi chú': 3
      }).select();
      console.log("Insert result:", data, error);
    }
  }
}

check();
