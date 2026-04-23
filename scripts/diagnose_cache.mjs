// Trigger PostgREST schema reload via Supabase Management API
// Ref: https://supabase.com/docs/reference/api/introduction

const PROJECT_REF = 'woqtdgzldkxmcgjshthx';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';
const BASE = `https://${PROJECT_REF}.supabase.co`;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function checkTable(name) {
  const r = await fetch(`${BASE}/rest/v1/${name}?limit=1`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  return r.status === 200;
}

async function main() {
  console.log('\n🔄 Checking table visibility...\n');
  
  // Bảng có tồn tại trong DB không? Dùng SQL query trực tiếp qua /rest/v1/rpc
  // hoặc qua pg_catalog
  
  // Try method: HEAD request with different headers
  const methods = [
    ['Normal GET', () => fetch(`${BASE}/rest/v1/sale_contracts?limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
    })],
    ['With Accept-Profile', () => fetch(`${BASE}/rest/v1/sale_contracts?limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Accept-Profile': 'public' }
    })],
  ];
  
  for (const [label, fn] of methods) {
    const r = await fn();
    const body = await r.text();
    console.log(`${label}: HTTP ${r.status} — ${body.slice(0,100)}`);
  }
  
  // Check if it's a cache issue — does the table exist in Postgres directly?
  // Use the Supabase SQL endpoint to query pg_tables
  console.log('\n📊 Querying pg_tables via Supabase SQL...');
  
  // We can use the /pg endpoint if accessible
  const sqlCheck = await fetch(`${BASE}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sale%' ORDER BY tablename" }),
  });
  console.log('exec_sql status:', sqlCheck.status, (await sqlCheck.text()).slice(0,200));
  
  // Alternative: try Supabase admin API to reload postgrest
  console.log('\n🔄 Attempting schema reload via Management API...');
  const reloadRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/schema-migrations`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}` }
  });
  console.log('Management API status:', reloadRes.status, (await reloadRes.text()).slice(0,200));
  
  // Wait a bit and retry
  console.log('\n⏳ Waiting 10s and retrying table check...');
  await sleep(10000);
  const ok = await checkTable('sale_contracts');
  console.log('sale_contracts accessible:', ok ? '✅ YES' : '❌ NO');
}

main().catch(console.error);
