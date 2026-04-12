/**
 * Migrate dim_kho data from V2 Supabase to V3 Supabase
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
  console.log('=== Migration dim_kho: V2 → V3 ===\n');

  // Step 1: Read all Kho from V2
  console.log('1. Reading dim_kho from V2...');
  const { data: v2Data, error: v2Error } = await v2
    .from('dim_kho')
    .select('*')
    .order('ma_kho', { ascending: true });

  if (v2Error) {
    console.error('❌ Error reading V2 dim_kho:', v2Error.message);
    process.exit(1);
  }

  console.log(`   ✅ Found ${v2Data.length} Kho records in V2`);
  if (v2Data.length > 0) {
    console.log(`   Sample columns: ${Object.keys(v2Data[0]).join(', ')}`);
  }

  // Step 2: Check existing data in V3
  console.log('\n2. Checking existing dim_kho in V3...');
  const { data: v3Existing } = await v3
    .from('dim_kho')
    .select('ma_kho');

  const existingCodes = new Set((v3Existing || []).map(r => r.ma_kho));
  console.log(`   ℹ️ V3 already has ${existingCodes.size} Kho records`);

  // Step 3: Prepare records to insert (skip duplicates)
  const toInsert = [];
  const toUpdate = [];

  for (const row of v2Data) {
    // Remove id to let V3 auto-generate, keep all other fields
    const { id, ...record } = row;
    
    if (existingCodes.has(record.ma_kho)) {
      toUpdate.push(record);
    } else {
      toInsert.push(record);
    }
  }

  console.log(`\n3. Migration plan:`);
  console.log(`   → ${toInsert.length} new records to INSERT`);
  console.log(`   → ${toUpdate.length} existing records to UPDATE`);

  // Step 4: Insert new records
  if (toInsert.length > 0) {
    console.log('\n4. Inserting new records into V3...');
    const chunkSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      const { error: insertError } = await v3
        .from('dim_kho')
        .insert(chunk);

      if (insertError) {
        console.error(`   ❌ Error inserting chunk ${i}:`, insertError.message);
        for (const record of chunk) {
          const { error: singleErr } = await v3.from('dim_kho').insert(record);
          if (singleErr) {
            console.error(`   ❌ Failed: ${record.ma_kho} - ${singleErr.message}`);
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

  // Step 5: Update existing records
  if (toUpdate.length > 0) {
    console.log('\n5. Updating existing records in V3...');
    let updatedCount = 0;
    for (const record of toUpdate) {
      const { error: updateError } = await v3
        .from('dim_kho')
        .update({ ...record, updated_at: new Date().toISOString() })
        .eq('ma_kho', record.ma_kho);

      if (updateError) {
        console.error(`   ❌ Failed to update ${record.ma_kho}: ${updateError.message}`);
      } else {
        updatedCount++;
      }
    }
    console.log(`   ✅ Updated ${updatedCount}/${toUpdate.length}`);
  }

  console.log('\n=== Migration complete! ===');
}

main().catch(console.error);
