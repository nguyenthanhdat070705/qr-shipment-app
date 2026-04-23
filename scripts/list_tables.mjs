// Probe all tables in Supabase using pg_class
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';
const BASE = 'https://woqtdgzldkxmcgjshthx.supabase.co';

// Query Supabase via RPC to list all tables
const r = await fetch(`${BASE}/rest/v1/rpc/get_tables`, {
  method: 'POST',
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
  },
  body: '{}',
});

if (r.status === 404) {
  // Fallback: query information_schema via postgREST
  const r2 = await fetch(
    `${BASE}/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name&order=table_name`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
  );
  const data = await r2.json();
  if (Array.isArray(data)) {
    console.log('Tables in public schema:');
    data.forEach(t => console.log(' -', t.table_name));
  } else {
    console.log('Response:', JSON.stringify(data).slice(0, 500));
    // Try direct known suggestions from error messages
    const candidates = [
      'goods_receipts_1office', 'product_logs', 'sync_logs',
      'dim_products', 'dim_hom', 'inventory', 'product_inventory',
      'products_1office', 'receipts', 'contracts'
    ];
    console.log('\nProbing candidate table names...');
    for (const t of candidates) {
      const resp = await fetch(`${BASE}/rest/v1/${t}?limit=1`, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
      });
      if (resp.status === 200) {
        const d = await resp.json();
        console.log(`✅ ${t} — ${d.length} rows, fields: ${d.length > 0 ? Object.keys(d[0]).slice(0,6).join(', ') : 'empty'}`);
      } else {
        console.log(`❌ ${t}`);
      }
    }
  }
} else {
  const data = await r.json();
  console.log(data);
}
