/**
 * create-tables-via-api.mjs
 * Tạo bảng trong Supabase bằng cách insert một row thử rồi check
 * Sau đó dùng CREATE TABLE IF NOT EXISTS qua function RPC
 */
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'zspazvdyrrkdosqigomk';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

const sb = createClient(`https://${PROJECT_REF}.supabase.co`, SERVICE_KEY);

// Thử tạo function exec_sql trước
async function tryCreateFunction() {
  const createFnSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text) 
    RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      EXECUTE sql;
      RETURN 'OK';
    EXCEPTION WHEN OTHERS THEN
      RETURN SQLERRM;
    END;
    $$;
  `;
  
  // Dùng fetch trực tiếp tới postgres endpoint
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: createFnSQL })
  });
  console.log('Create function status:', res.status);
  return res.text();
}

// Thu dung Supabase Edge Function
async function runSQLViaEdge(sql) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/execute-sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql })
  });
  return { status: res.status, body: await res.text() };
}

// Try using /pg/ endpoint (Supabase internal)
async function runSQLViaPG(sql) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/pg/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });
  return { status: res.status, body: await res.text() };
}

console.log('Testing SQL execution methods...\n');

// Method 1: Edge function
const r1 = await runSQLViaEdge('SELECT 1');
console.log('Edge function:', r1.status, r1.body.slice(0,100));

// Method 2: PG endpoint
const r2 = await runSQLViaPG('SELECT 1');
console.log('PG endpoint:', r2.status, r2.body.slice(0,100));

// Method 3: Thử exec_sql RPC
const r3 = await sb.rpc('exec_sql', { sql: 'SELECT 1' });
console.log('exec_sql RPC:', r3.error?.message || 'OK', r3.data);

// Method 4: query RPC
const r4 = await sb.rpc('query', { query_text: 'SELECT 1' });
console.log('query RPC:', r4.error?.message || 'OK', r4.data);
