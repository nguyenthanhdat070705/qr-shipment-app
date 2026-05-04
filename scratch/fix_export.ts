import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function rollback2() {
  const kho_id = 'cc42cba4-185e-4a0c-901a-a81e7f7de374'; // Kha Van Can
  const hom_id = '405ed8b5-5f0e-4d6c-bb45-04eba0f3fbdc'; // 2AQ0128
  const xuat_code = 'IT-260953'; // The new wrong export ma_phieu_xuat

  console.log('Rolling back new wrong export...', xuat_code);

  const { data: xuats } = await supabase.from('fact_xuat_hang').select('id, ma_phieu_xuat').ilike('ma_phieu_xuat', `%${xuat_code}%`);
  
  if (xuats && xuats.length > 0) {
    const target = xuats[0];
    console.log('Target fact_xuat_hang:', target);
    
    console.log('Deleting fact_xuat_hang_items...');
    await supabase.from('fact_xuat_hang_items').delete().eq('xuat_hang_id', target.id);
    console.log('Deleting fact_xuat_hang...');
    await supabase.from('fact_xuat_hang').delete().eq('id', target.id);
  }

  console.log('Deleting from export_confirmations...');
  await supabase.from('export_confirmations').delete().ilike('ghi_chu', '%[DAM:260953]%');

  console.log('Finding inventory...');
  const { data: invs } = await supabase.from('fact_inventory').select('*').eq('Kho', kho_id).eq('Tên hàng hóa', hom_id);

  if (invs && invs.length > 0) {
    const inv = invs[0];
    console.log('Current inventory record:', inv.Mã, 'Total:', inv['Số lượng'], 'Available:', inv['Ghi chú']);
    
    // Check if it is currently 4, if they had 5 before and lost 1.
    const newTotal = Number(inv['Số lượng'] || 0) + 1;
    const newAvail = Number(inv['Ghi chú'] || 0) + 1;

    console.log('Restoring +1 to Qty:', newTotal, 'and Avail:', newAvail);
    await supabase.from('fact_inventory').update({
        'Số lượng': newTotal,
        'Ghi chú': newAvail
    }).eq('Mã', inv.Mã);
    console.log('Inventory restored!');
  }

  console.log('ROLLBACK 2 COMPLETE.');
}
rollback2();
