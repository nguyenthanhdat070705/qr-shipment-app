/**
 * Check dim_ncc table structure and data in V3 Supabase
 */
import { createClient } from '@supabase/supabase-js';

const V3_URL = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const V3_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';

const v3 = createClient(V3_URL, V3_KEY);

async function main() {
  console.log('=== Check V3 Supabase dim_ncc ===\n');

  // 1. Check table structure by fetching one record
  const { data, error } = await v3
    .from('dim_ncc')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const cols = Object.keys(data[0]);
    console.log(`✅ dim_ncc columns (${cols.length}):`);
    cols.forEach(c => console.log(`   - ${c}: ${JSON.stringify(data[0][c])?.slice(0, 60)}`));
    
    // Check specific required columns
    const requiredCols = ['noi_dung', 'thong_tin_lien_he', 'thong_tin_hoa_don'];
    console.log('\n📋 Required NCC columns check:');
    for (const col of requiredCols) {
      if (cols.includes(col)) {
        console.log(`   ✅ ${col} — EXISTS`);
      } else {
        console.log(`   ❌ ${col} — MISSING! Need to run V2_ADD_NCC_COLUMNS.sql`);
      }
    }
  }

  // 2. Count total records
  const { data: all } = await v3.from('dim_ncc').select('ma_ncc, ten_ncc, noi_dung, thong_tin_lien_he, thong_tin_hoa_don').order('ma_ncc');
  console.log(`\n📊 Total NCC records: ${all?.length || 0}`);
  
  if (all && all.length > 0) {
    console.log('\nFirst 5 records:');
    all.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.ma_ncc} — ${r.ten_ncc} | noi_dung: "${(r.noi_dung || '').slice(0, 30)}" | ttlh: "${(r.thong_tin_lien_he || '').slice(0, 30)}" | tthd: "${(r.thong_tin_hoa_don || '').slice(0, 30)}"`);
    });
  }
}

main().catch(console.error);
