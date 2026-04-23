// Check if tables exist in Supabase
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';
const BASE = 'https://woqtdgzldkxmcgjshthx.supabase.co';

const tables = ['sale_contracts', 'sale_quotations', 'sale_orders', 'products', 'goods_receipts', 'oneoffice_sync_log'];

for (const t of tables) {
  const r = await fetch(`${BASE}/rest/v1/${t}?limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  const txt = await r.text();
  const ok = r.status === 200;
  console.log(`${ok ? '✅' : '❌'} ${t.padEnd(25)} HTTP ${r.status}${ok ? '' : ' → ' + txt.slice(0,100)}`);
}
