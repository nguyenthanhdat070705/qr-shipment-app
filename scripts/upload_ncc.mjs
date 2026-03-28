/**
 * Upload "Danh sách ncc hòm.csv" → dim_ncc (Supabase)
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://zspazvdyrrkdosqigomk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY'
);

const CSV_PATH = 'C:\\Users\\Thanh Dat\\OneDrive\\Documents\\Danh sách ncc hòm.csv';

function parseCSVLine(line) {
  const fields = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuotes && i+1<line.length && line[i+1]==='"') { current+='"'; i++; } else { inQuotes=!inQuotes; } }
    else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current=''; }
    else { current += ch; }
  }
  fields.push(current.trim()); return fields;
}

async function main() {
  console.log('📋 Upload NCC → dim_ncc');
  console.log('─'.repeat(50));

  const csvText = readFileSync(CSV_PATH, 'utf-8');
  const lines = csvText.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
  
  console.log(`Headers: ${lines[0]}`);
  // STT, Mã NCC, Tên NCC, Thông tin liên hệ, SDT, Nội dung, Địa chỉ, Thông tin thanh toán, Ghi chú, Thông tin hóa đơn

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCSVLine(lines[i]);
    if (f.length >= 3 && f[1]) {
      rows.push({
        ma_ncc:        f[1],           // Mã NCC
        ten_ncc:       f[2],           // Tên NCC
        nguoi_lien_he: f[3] || null,   // Thông tin liên hệ
        sdt:           f[4] || null,   // SDT
        email:         null,           // Không có trong CSV
        dia_chi:       f[6] || null,   // Địa chỉ
      });
    }
  }
  console.log(`📄 ${rows.length} nhà cung cấp\n`);

  // Xóa NCC mẫu cũ (seed data)
  console.log('🗑️  Xóa NCC mẫu cũ...');
  const { data: existing } = await supabase.from('dim_ncc').select('id, ma_ncc');
  if (existing && existing.length > 0) {
    for (const ncc of existing) {
      await supabase.from('dim_ncc').delete().eq('id', ncc.id);
    }
    console.log(`   ✅ Xóa ${existing.length} NCC cũ`);
  }

  // Insert mới
  console.log(`📥 Insert ${rows.length} NCC...`);
  let ok = 0;
  for (const row of rows) {
    const { error } = await supabase.from('dim_ncc').insert(row);
    if (error) {
      console.error(`   ❌ ${row.ma_ncc}: ${error.message}`);
    } else {
      ok++;
      console.log(`   ✅ ${row.ma_ncc} | ${row.ten_ncc}`);
    }
  }

  // Verify
  const { count } = await supabase.from('dim_ncc').select('*', { count: 'exact', head: true });
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Thành công: ${ok}/${rows.length} | DB total: ${count}`);
  console.log(`${'═'.repeat(50)}`);
}

main().then(() => process.exit(0)).catch(e => { console.error('💥', e.message); process.exit(1); });
