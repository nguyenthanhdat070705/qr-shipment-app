/**
 * Migrate dim_ncc data from V2 Supabase to V3 Supabase
 * 
 * V2: zspazvdyrrkdosqigomk.supabase.co
 * V3: woqtdgzldkxmcgjshthx.supabase.co
 */

import { createClient } from '@supabase/supabase-js';

// V2 (source)
const V2_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const V2_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

// V3 (target)
const V3_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const V3_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const v2 = createClient(V2_URL, V2_KEY);
const v3 = createClient(V3_URL, V3_KEY);

async function main() {
  console.log('=== Migration dim_ncc: V2 → V3 ===\n');

  // Step 1: Read all NCC from V2
  console.log('1. Reading dim_ncc from V2...');
  const { data: v2Data, error: v2Error } = await v2
    .from('dim_ncc')
    .select('*')
    .order('ma_ncc', { ascending: true });

  if (v2Error) {
    console.error('❌ Error reading V2 dim_ncc:', v2Error.message);
    process.exit(1);
  }

  console.log(`   ✅ Found ${v2Data.length} NCC records in V2`);
  if (v2Data.length > 0) {
    console.log(`   Sample columns: ${Object.keys(v2Data[0]).join(', ')}`);
  }

  // Step 2: Check if dim_ncc exists in V3
  console.log('\n2. Checking dim_ncc in V3...');
  const { data: v3Check, error: v3CheckError } = await v3
    .from('dim_ncc')
    .select('id')
    .limit(1);

  if (v3CheckError) {
    console.log(`   ⚠️ dim_ncc might not exist in V3: ${v3CheckError.message}`);
    console.log('   → You need to create it! Run the SQL below in V3 Supabase SQL Editor:\n');
    console.log(getCreateTableSQL());
    process.exit(1);
  }

  console.log(`   ✅ dim_ncc table exists in V3`);

  // Step 3: Check existing data in V3
  const { data: v3Existing } = await v3
    .from('dim_ncc')
    .select('ma_ncc');

  const existingCodes = new Set((v3Existing || []).map(r => r.ma_ncc));
  console.log(`   ℹ️ V3 already has ${existingCodes.size} NCC records`);

  // Step 4: Prepare records to insert (skip duplicates)
  const toInsert = [];
  const toUpdate = [];

  for (const row of v2Data) {
    // Remove id to let V3 auto-generate, keep all other fields
    const { id, ...record } = row;
    
    if (existingCodes.has(record.ma_ncc)) {
      toUpdate.push(record);
    } else {
      toInsert.push(record);
    }
  }

  console.log(`\n3. Migration plan:`);
  console.log(`   → ${toInsert.length} new records to INSERT`);
  console.log(`   → ${toUpdate.length} existing records to UPDATE`);

  // Step 5: Insert new records
  if (toInsert.length > 0) {
    console.log('\n4. Inserting new records into V3...');
    // Batch insert in chunks of 50
    const chunkSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error: insertError } = await v3
        .from('dim_ncc')
        .insert(chunk);

      if (insertError) {
        console.error(`   ❌ Error inserting chunk ${i}:`, insertError.message);
        // Try one by one
        for (const record of chunk) {
          const { error: singleErr } = await v3.from('dim_ncc').insert(record);
          if (singleErr) {
            console.error(`   ❌ Failed: ${record.ma_ncc} - ${singleErr.message}`);
          } else {
            insertedCount++;
          }
        }
      } else {
        insertedCount += chunk.length;
        console.log(`   ✅ Inserted ${insertedCount}/${toInsert.length}`);
      }
    }
  }

  // Step 6: Update existing records
  if (toUpdate.length > 0) {
    console.log('\n5. Updating existing records in V3...');
    let updatedCount = 0;
    for (const record of toUpdate) {
      const { error: updateError } = await v3
        .from('dim_ncc')
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq('ma_ncc', record.ma_ncc);

      if (updateError) {
        console.error(`   ❌ Failed to update ${record.ma_ncc}: ${updateError.message}`);
      } else {
        updatedCount++;
      }
    }
    console.log(`   ✅ Updated ${updatedCount}/${toUpdate.length}`);
  }

  // Final verification
  console.log('\n6. Verification...');
  const { data: finalCount } = await v3
    .from('dim_ncc')
    .select('id', { count: 'exact' });

  console.log(`   ✅ V3 now has ${finalCount?.length || 0} NCC records`);
  console.log('\n=== Migration complete! ===');
}

function getCreateTableSQL() {
  return `
-- Create dim_ncc table (if not exists)
CREATE TABLE IF NOT EXISTS dim_ncc (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ma_ncc text NOT NULL UNIQUE,
  ten_ncc text NOT NULL,
  nguoi_lien_he text DEFAULT '',
  sdt text DEFAULT '',
  dia_chi text DEFAULT '',
  email text DEFAULT '',
  ghi_chu text DEFAULT '',
  noi_dung text DEFAULT '',
  thong_tin_lien_he text DEFAULT '',
  thong_tin_hoa_don text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dim_ncc ENABLE ROW LEVEL SECURITY;

-- Allow all access for service role (API routes use service role key)
CREATE POLICY "Allow full access for service role" ON dim_ncc
  FOR ALL USING (true) WITH CHECK (true);
`;
}

main().catch(console.error);
