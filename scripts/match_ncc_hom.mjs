/**
 * Match random dim_ncc → dim_hom (cột "NCC" text)
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

async function main() {
  console.log('🔀 Match random NCC → dim_hom');
  console.log('─'.repeat(50));

  // Check dim_hom columns
  const { data: sampleHom } = await supabase.from('dim_hom').select('*').limit(1);
  const cols = sampleHom && sampleHom[0] ? Object.keys(sampleHom[0]) : [];
  console.log('dim_hom columns:', cols.join(', '));

  // Find the NCC column name
  const nccCol = cols.find(c => c.toLowerCase().includes('ncc')) || 'NCC';
  console.log(`NCC column: "${nccCol}"\n`);

  // Get all NCC
  const { data: nccList } = await supabase.from('dim_ncc').select('id, ma_ncc, ten_ncc');
  if (!nccList || nccList.length === 0) { console.error('❌ Không có NCC!'); return; }
  console.log(`📋 ${nccList.length} NCC`);

  // Get all hòm
  const { data: homList } = await supabase.from('dim_hom').select('id, ma_hom');
  if (!homList || homList.length === 0) { console.error('❌ Không có SP!'); return; }
  console.log(`📦 ${homList.length} sản phẩm\n`);

  // Random assign
  let ok = 0;
  const dist = {};
  for (const hom of homList) {
    const randomNcc = nccList[Math.floor(Math.random() * nccList.length)];
    
    const updateData = {};
    updateData[nccCol] = randomNcc.id;

    const { error } = await supabase.from('dim_hom').update(updateData).eq('id', hom.id);
    if (error) {
      console.error(`   ❌ ${hom.ma_hom}: ${error.message}`);
    } else {
      ok++;
      dist[randomNcc.ma_ncc] = (dist[randomNcc.ma_ncc] || 0) + 1;
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Gán NCC: ${ok}/${homList.length}`);
  console.log(`\nPhân bố:`);
  for (const [ma, count] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    const ncc = nccList.find(n => n.ma_ncc === ma);
    console.log(`   ${ma} | ${ncc?.ten_ncc?.substring(0, 45)} → ${count} SP`);
  }
  console.log(`${'═'.repeat(50)}`);
}

main().then(() => process.exit(0)).catch(e => { console.error('💥', e.message); process.exit(1); });
