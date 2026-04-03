import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

// Get dim maps
const { data: homs } = await supabase.from('dim_hom').select('id, ma_hom');
const { data: khos } = await supabase.from('dim_kho').select('id, ten_kho');
const homMap = new Map(homs.map(h => [h.id, h.ma_hom]));
const khoMap = new Map(khos.map(k => [k.id, k.ten_kho]));

// Get all inv
const { data } = await supabase.from('fact_inventory').select('*');

// Show rows with high Số lượng
console.log('=== Rows with Số lượng > 10 ===');
for (const r of data) {
  const qty = Number(r['Số lượng'] || 0);
  if (qty > 10) {
    const ma = homMap.get(r['Tên hàng hóa']) || '???';
    const kho = khoMap.get(r['Kho']) || '???';
    console.log(`  ${ma} @ ${kho}: qty=${qty}, avail=${r['Ghi chú']}`);
  }
}

// Summary by kho
const khoSums = {};
for (const r of data) {
  const kho = khoMap.get(r['Kho']) || '???';
  if (!khoSums[kho]) khoSums[kho] = { rows: 0, qty: 0 };
  khoSums[kho].rows++;
  khoSums[kho].qty += Number(r['Số lượng'] || 0);
}
console.log('\n=== Summary by warehouse ===');
for (const [k, v] of Object.entries(khoSums)) {
  console.log(`  ${k}: ${v.rows} rows, total qty: ${v.qty}`);
}
