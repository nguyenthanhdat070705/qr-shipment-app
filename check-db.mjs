import { createClient } from '@supabase/supabase-js';

const url = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const sb = createClient(url, key);

async function check() {
  // Check all tables that might have export data
  const tables = ['export_confirmations', 'fact_xuat_hang', 'fact_xuat_hang_items', 'product_logs'];
  
  for (const table of tables) {
    const r = await sb.from(table).select('*').order('created_at', { ascending: false }).limit(5);
    console.log(`\n=== ${table} ===`);
    console.log(`count: ${r.data?.length ?? 0}, error: ${r.error?.message || 'none'}`);
    if (r.data && r.data.length > 0) {
      console.log(JSON.stringify(r.data, null, 2));
    }
  }

  // Check recent inventory changes (items with qty = 0 that were recently modified)
  const r2 = await sb.from('fact_inventory').select('*').eq('Số lượng', 0).limit(10);
  console.log('\n=== fact_inventory (qty=0, recently exported) ===');
  console.log('count:', r2.data?.length);

  // Check product_logs for export actions
  const r3 = await sb.from('product_logs').select('*').eq('action_type', 'confirmed_export').order('created_at', { ascending: false }).limit(5);
  console.log('\n=== product_logs (confirmed_export) ===');
  console.log('count:', r3.data?.length, 'error:', r3.error?.message || 'none');
  if (r3.data && r3.data.length > 0) console.log(JSON.stringify(r3.data, null, 2));
}

check();
