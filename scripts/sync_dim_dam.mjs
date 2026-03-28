import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

function parseCSV(raw) {
  const records = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && i + 1 < raw.length && raw[i + 1] === '\n') i++;
      if (current.trim()) records.push(current);
      current = '';
    } else { current += ch; }
  }
  if (current.trim()) records.push(current);
  return records.map(line => {
    const fields = []; let field = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { fields.push(field.trim()); field = ''; }
      else { field += c; }
    }
    fields.push(field.trim());
    return fields;
  });
}

async function main() {
  console.log('=== Sync Dim_Đám → dim_dam ===\n');

  const raw = readFileSync('C:\\Users\\Thanh Dat\\OneDrive\\Documents\\Dim_đám.csv', 'utf-8');
  const allRows = parseCSV(raw);
  console.log('Header:', allRows[0]);
  const dataRows = allRows.slice(1).filter(r => r.length >= 1 && r[0]);
  console.log(`Tổng dòng: ${dataRows.length}\n`);

  // Check table
  const { error: checkErr } = await supabase.from('dim_dam').select('id').limit(1);
  if (checkErr) {
    console.error('❌ Bảng dim_dam chưa tồn tại!');
    console.log('\n👉 Vui lòng chạy file SQL trong Supabase SQL Editor trước:');
    console.log('   File: sql/create_dim_dam.sql');
    console.log('   URL:  https://supabase.com/dashboard/project/zspazvdyrrkdosqigomk/sql/new');
    console.log('\n   Sau đó chạy lại: node scripts/sync_dim_dam.mjs');
    process.exit(1);
  }
  console.log('✅ Bảng dim_dam tồn tại.\n');

  const records = dataRows.map(r => ({
    ma_dam: r[0], loai: r[1] || null, chi_nhanh: r[2] || null, nguoi_mat: r[3] || null,
  })).filter(r => r.ma_dam);

  console.log(`Upsert ${records.length} bản ghi...\n`);

  let ok = 0, fail = 0;
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { data, error } = await supabase
      .from('dim_dam')
      .upsert(batch, { onConflict: 'ma_dam', ignoreDuplicates: false })
      .select('id');
    if (error) { console.error(`  ❌ Batch ${i+1}-${i+batch.length}: ${error.message}`); fail += batch.length; }
    else { ok += (data||[]).length; console.log(`  ✓ Batch ${i+1}-${i+batch.length}: ${(data||[]).length} rows`); }
  }

  console.log(`\n${'═'.repeat(40)}`);
  console.log(`✅ Hoàn tất! Thành công: ${ok} | Lỗi: ${fail}`);
  console.log(`${'═'.repeat(40)}\n`);

  const { count } = await supabase.from('dim_dam').select('*', { count: 'exact', head: true });
  console.log(`Tổng bản ghi: ${count}\n`);

  const { data: sample } = await supabase.from('dim_dam').select('ma_dam, loai, chi_nhanh, nguoi_mat').limit(5);
  console.log('Mẫu:');
  console.table(sample);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
