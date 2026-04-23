const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function parseCSVLine(line) {
  const result = [];
  let inQuotes = false;
  let currentVal = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal);
  return result;
}

async function run() {
  const fileContent = fs.readFileSync('dim_hom_import.csv', 'utf8').trim().split('\n');
  const headers = parseCSVLine(fileContent[0]);

  const upsertData = [];

  for (let i = 1; i < fileContent.length; i++) {
    const line = fileContent[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, index) => {
      let val = values[index];
      if (val === '') val = null;
      else if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (['gia_ban', 'gia_von'].includes(h)) val = Number(val) || 0;
      row[h] = val;
    });

    // Exclude 'id', 'created_at', 'updated_at', 'so_luong' 
    // because we want Supabase to auto-generate `id` for new items 
    // and we NEVER want to override `id` of existing items!
    if (row.ma_hom === 'TEST_UPSERT_01') continue;

    upsertData.push({
      ma_hom: row.ma_hom,
      ten_hom: row.ten_hom,
      gia_ban: row.gia_ban,
      gia_von: row.gia_von,
      hinh_anh: row.hinh_anh,
      NCC: row.NCC,
      loai_hom: row.loai_hom,
      mo_ta: row.mo_ta,
      is_active: row.is_active !== null ? row.is_active : true,
      kich_thuoc: row.kich_thuoc,
      thong_so_khac: row.thong_so_khac,
      do_day_thanh: row.do_day_thanh,
      don_vi_tinh: row.don_vi_tinh || 'Cái',
      tinh_chat: row.tinh_chat,
      muc_dich_su_dung: row.muc_dich_su_dung
    });
  }

  console.log(`Ready to upsert ${upsertData.length} records...`);

  const { data, error } = await supabase
    .from('dim_hom')
    .upsert(upsertData, { onConflict: 'ma_hom' })
    .select();

  if (error) {
    console.error(`ERROR upserting items:`, error);
  } else {
    console.log(`SUCCESS! Upserted / Inserted ${upsertData.length} products total.`);
    
    // Also delete the TEST item
    await supabase.from('dim_hom').delete().eq('ma_hom', 'TEST_UPSERT_01');
  }
}
run();
