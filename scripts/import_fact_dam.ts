import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Setup Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const filepath = 'c:\\Users\\Thanh Dat\\OneDrive\\Documents\\Fact_Dam.csv';
  
  if (!fs.existsSync(filepath)) {
     console.error(`File not found: ${filepath}`);
     process.exit(1);
  }

  const content = fs.readFileSync(filepath, 'utf-8');

  const records = parse(content, {
    skip_empty_lines: true,
    relax_column_count: true
  });

  const rowsToInsert = [];

  for (let i = 5; i < records.length; i++) {
    const r = records[i];
    if (!r || r.length < 5) continue;
    if (!r[0] || r[0].trim() === '') continue; // Skip lines without STT

    const maDam = r[3]?.trim();
    if (!maDam) continue;

    rowsToInsert.push({
      stt: r[0]?.trim(),
      ngay: r[1]?.trim(),
      thang: r[2]?.trim(),
      ma_dam: maDam,
      loai: r[4]?.trim() || '',
      chi_nhanh: r[5]?.trim() || '',
      nguoi_mat: r[6]?.trim() || '',
      dia_chi_to_chuc: r[7]?.trim() || '',
      dia_chi_chon_thieu: r[8]?.trim() || '',
      gio_liem: r[9]?.trim() || '',
      ngay_liem: r[10]?.trim() || '',
      gio_di_quan: r[11]?.trim() || '',
      ngay_di_quan: r[12]?.trim() || '',
      sale: r[13]?.trim() || '',
      dieu_phoi: r[14]?.trim() || '',
      thay_so_luong: r[15]?.trim() || '',
      thay_ncc: r[16]?.trim() || '',
      thay_ten: r[17]?.trim() || '',
      hom_loai: r[18]?.trim() || '',
      hom_ncc_hay_kho: r[19]?.trim() || '',
      hoa: r[20]?.trim() || '',
      da_kho_tiem_focmol: r[21]?.trim() || '',
      ken_tay_so_le: r[22]?.trim() || '',
      ken_tay_ncc: r[23]?.trim() || '',
      quay_phim_chup_hinh_goi_dv: r[24]?.trim() || '',
      quay_phim_chup_hinh_ncc: r[25]?.trim() || '',
      mam_cung_so_luong: r[26]?.trim() || '',
      mam_cung_ncc: r[27]?.trim() || '',
      di_anh_cao_pho: r[28]?.trim() || '',
      bang_ron: r[29]?.trim() || '',
      la_trieu_bai_vi: r[30]?.trim() || '',
      nhac: r[31]?.trim() || '',
      thue_rap_ban_ghe_so_luong: r[32]?.trim() || '',
      thue_rap_ban_ghe_ncc: r[33]?.trim() || '',
      hu_tro_cot: r[34]?.trim() || '',
      teabreak: r[35]?.trim() || '',
      xe_tang_le_loai: r[36]?.trim() || '',
      xe_tang_le_dao_ty: r[37]?.trim() || '',
      xe_tang_le_ncc: r[38]?.trim() || '',
      xe_khach_loai: r[39]?.trim() || '',
      xe_khach_ncc: r[40]?.trim() || '',
      xe_cap_cuu: r[41]?.trim() || '',
      xe_khac: r[42]?.trim() || '',
      thue_nv_truc: r[43]?.trim() || '',
      bao_don: r[44]?.trim() || '',
      ghi_chu: r[45]?.trim() || '',
      chon_thieu: r[46]?.trim() || ''
    });
  }

  console.log(`Parsed ${rowsToInsert.length} valid rows from CSV.`);

  // Insert logic
  const batchSize = 50;
  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('fact_dam')
      .upsert(batch, { onConflict: 'ma_dam' });

    if (error) {
       console.error(`Error inserting batch ${i}:`, error.message);
    } else {
       console.log(`Inserted batch ${i} to ${i + batchSize}`);
    }
  }

  // Sync to dim_dam for lookup functionality
  const dimDamRows = rowsToInsert.map(r => ({
    ma_dam: r.ma_dam,
    ngay: r.ngay,
    loai: r.loai,
    chi_nhanh: r.chi_nhanh,
    nguoi_mat: r.nguoi_mat
  }));

  for (let i = 0; i < dimDamRows.length; i += batchSize) {
    const batch = dimDamRows.slice(i, i + batchSize);
    const { error: dimErr } = await supabase
      .from('dim_dam')
      .upsert(batch, { onConflict: 'ma_dam' });

    if (dimErr) {
       console.error(`Error updating dim_dam batch ${i}:`, dimErr.message);
    } else {
       console.log(`Synced batch ${i} to ${i + batchSize} to dim_dam.`);
    }
  }

  console.log('✅ Done loading all info.');
}

main().catch(console.error);
