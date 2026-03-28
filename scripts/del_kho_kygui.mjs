import { createClient } from '@supabase/supabase-js';

const s = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

const KHO_KY_GUI_ID = 'c18a1d0d-5bf7-4097-a741-3fc9a1eae816';

async function main() {
  // Check references
  const { count } = await s.from('fact_inventory').select('*', { count: 'exact', head: true }).eq('Kho', KHO_KY_GUI_ID);
  console.log(`fact_inventory refs to kho ky gui: ${count}`);

  if (count > 0) {
    console.log('ERROR: Still has references! Cannot delete.');
    return;
  }

  // Delete kho ky gui
  const { error } = await s.from('dim_kho').delete().eq('id', KHO_KY_GUI_ID);
  if (error) {
    console.log('Delete error:', error.message);
  } else {
    console.log('✅ Deleted kho ky gui');
  }

  // Show remaining
  const { data } = await s.from('dim_kho').select('ma_kho, ten_kho').order('ma_kho');
  console.log('\nRemaining kho:');
  for (const k of data || []) console.log(`  ${k.ma_kho} | ${k.ten_kho}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
