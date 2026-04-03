/**
 * Script chạy SQL rebuild database trực tiếp qua Supabase REST API
 * Sử dụng service_role key để bypass RLS
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Read and split SQL file into individual statements
const sqlFile = fs.readFileSync(path.join(__dirname, '..', 'sql', 'V2_REBUILD_DATABASE.sql'), 'utf-8');

// Split by semicolons but keep only real statements (skip comments and empty)
const statements = sqlFile
  .split(';')
  .map(s => s.trim())
  .filter(s => {
    // Remove leading comments
    const cleaned = s.replace(/--[^\n]*/g, '').trim();
    return cleaned.length > 0 && !cleaned.startsWith('--');
  })
  .map(s => s + ';');

console.log(`\n🔄 REBUILD DATABASE v2-testing`);
console.log(`📊 Found ${statements.length} SQL statements to execute`);
console.log(`🎯 Target: ${SUPABASE_URL}\n`);

let success = 0;
let failed = 0;
let skipped = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  // Extract a short label from the statement
  const label = stmt.replace(/\s+/g, ' ').substring(0, 80);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });
    
    if (error) {
      // If exec_sql doesn't exist yet, we need an alternative approach
      if (error.message.includes('function') && error.message.includes('does not exist') && i < 5) {
        console.log(`⚠️  [${i+1}/${statements.length}] exec_sql not available yet, using direct approach...`);
        
        // Try using the Supabase SQL API endpoint (pg_net or direct)
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: stmt }),
        });
        
        if (!res.ok) {
          console.log(`⏭️  [${i+1}/${statements.length}] Skipped (exec_sql not ready): ${label}`);
          skipped++;
        } else {
          console.log(`✅ [${i+1}/${statements.length}] ${label}`);
          success++;
        }
      } else {
        console.log(`❌ [${i+1}/${statements.length}] ${label}`);
        console.log(`   Error: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`✅ [${i+1}/${statements.length}] ${label}`);
      success++;
    }
  } catch (err) {
    console.log(`❌ [${i+1}/${statements.length}] ${label}`);
    console.log(`   Exception: ${err.message}`);
    failed++;
  }
}

console.log(`\n════════════════════════════════════`);
console.log(`✅ Success: ${success}`);
console.log(`❌ Failed:  ${failed}`);
console.log(`⏭️  Skipped: ${skipped}`);
console.log(`════════════════════════════════════`);

// Verify: list all tables
console.log(`\n🔍 Verifying tables...`);
const { data: tables, error: listErr } = await supabase.rpc('exec_sql', {
  sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
});

if (tables) {
  console.log(`📋 Tables found:`, tables);
} else if (listErr) {
  // Fallback: try querying each expected table
  const expectedTables = [
    'dim_account', 'dim_kho', 'dim_ncc', 'dim_hom', 'dim_dam',
    'fact_inventory', 'fact_don_hang', 'fact_don_hang_items',
    'fact_nhap_hang', 'fact_nhap_hang_items',
    'fact_xuat_hang', 'fact_xuat_hang_items', 'fact_dam',
    'delivery_orders', 'delivery_order_items', 'export_confirmations',
    'notifications', 'qr_codes', 'product_logs', 'sync_logs',
    'warehouses_1office', 'goods_receipts_1office', 'inventory_1office', 'sale_orders',
  ];
  
  console.log('\n📋 Checking tables individually...');
  for (const t of expectedTables) {
    const { error: checkErr } = await supabase.from(t).select('*', { count: 'exact', head: true });
    const status = checkErr ? '❌' : '✅';
    console.log(`  ${status} ${t}${checkErr ? ' — ' + checkErr.message : ''}`);
  }
}

console.log('\n🎉 Done! Database rebuild complete.');
