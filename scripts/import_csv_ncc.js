const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  try {
    console.log('Loading CSV file...');
    const filePath = 'C:\\Users\\Thanh Dat\\Downloads\\dim_ncc_rows.csv';
    
    const csvString = fs.readFileSync(filePath, 'utf-8');
    const workbook = XLSX.read(csvString, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });
    
    console.log(`Parsed ${rows.length} rows from CSV.`);
    
    const dataToInsert = rows.map(r => ({
      ma_ncc: r.ma_ncc || '',
      ten_ncc: r.ten_ncc || '',
      nguoi_lien_he: r.nguoi_lien_he || null,
      sdt: r.sdt || null,
      dia_chi: r.dia_chi || null,
      email: r.email || null,
      is_active: r.is_active === 'TRUE' || r.is_active === true || r.is_active === 'true' || true,
      created_at: r.created_at || new Date().toISOString(),
      updated_at: r.updated_at || new Date().toISOString()
    }));

    console.log(`Upserting ${dataToInsert.length} records into Supabase dim_ncc...`);
    
    // Do onConflict upsert based on 'id'
    const { error } = await supabase
      .from('dim_ncc')
      .upsert(dataToInsert, { onConflict: 'ma_ncc' });

    if (error) {
      console.error('Error inserting:', error);
    } else {
      console.log('✅ Import SUCCESSFUL!');
    }
  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

run();
