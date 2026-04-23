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

  let updatedCount = 0;
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
      row[h] = val;
    });

    const updatePayload = {
      hinh_anh: row.hinh_anh,
      loai_hom: row.loai_hom,
      kich_thuoc: row.kich_thuoc,
      thong_so_khac: row.thong_so_khac,
      do_day_thanh: row.do_day_thanh,
      tinh_chat: row.tinh_chat,
      muc_dich_su_dung: row.muc_dich_su_dung
    };

    const { data, error } = await supabase
      .from('dim_hom')
      .update(updatePayload)
      .eq('ma_hom', row.ma_hom);

    if (error) {
       console.error(`Error updating ${row.ma_hom}:`, error);
    } else {
       updatedCount++;
    }
  }

  console.log(`SUCCESS! Updated ${updatedCount} rows from CSV based on ma_hom.`);
}
run();
