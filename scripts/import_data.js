const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Custom simple CSV parser to handle quotes
function parseCSVRow(str) {
    let result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        if (inQuotes) {
            if (char === '"') {
                if (str[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
}

async function uploadData() {
    console.log('Reading CSV file...');
    const csvData = fs.readFileSync('Dim_hom_official_1.csv', 'utf8');
    const lines = csvData.trim().split(/\r?\n/);
    if (lines.length < 2) {
        console.log('No data found in CSV.');
        return;
    }

    const headers = parseCSVRow(lines[0]);
    // BOM removal
    headers[0] = headers[0].replace(/^\uFEFF/, '');
    
    // Create header-to-index map
    const headerMap = {};
    headers.forEach((h, i) => headerMap[h.trim()] = i);

    console.log('Detected headers:', Object.keys(headerMap));

    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVRow(lines[i]);
        if (row.length < 2) continue; // Empty line

        const getVal = (colName) => {
            const idx = headerMap[colName];
            if (idx === undefined) return null;
            let val = row[idx].trim();
            if (val === '') return null;
            return val;
        };

        const ma_hom = getVal('ma_hom');
        if (!ma_hom) continue;

        // Data mapping mapping according to user requirements
        const record = {
            ma_hom: ma_hom,
            ten_hom: getVal('ten_hom'),
            ten_mkt: getVal('Ten_mkt'),
            ten_hom_the_hien: getVal('Ten_hom_the_hien'),
            ten_ky_thuat: getVal('Ten_ky_thuat'),
            ten_chuan_hoa: getVal('Ten_chuan_hoa'),
            don_vi_tinh: getVal('Don_vi'),
            loai_go: getVal('Loai_go'),
            "Muc_dich": getVal('Muc_dich'), // Replaced muc_dich_su_dung
            "Goi_dich_vu": getVal('Goi_dich_vu'),
            "Mau_sac": getVal('Mau_Sac'),
            nhom_hang_hoa: getVal('Nhom_Hang_Hoa'),
            loai_san_pham: getVal('Loai_san_pham'),
            "Ton_giao": getVal('Tôn giáo'),
            dac_diem: getVal('Dac_diem'),   // Replaced tinh_chat
            nap: getVal('Nắp'),
            "Nguon_goc": getVal('Nguon_goc'),
            "Thanh": getVal('Thanh'),       // Replaced do_day_thanh
            "Liet": getVal('Liet'),
            kich_thuoc: getVal('Kich_thuoc'),
            be_mat: getVal('Be_mat')
        };
        
        let giaVon = getVal('gia_von');
        if (giaVon) {
             giaVon = parseFloat(giaVon.replace(/,/g, ''));
             record.gia_von = isNaN(giaVon) ? 0 : giaVon;
        } else {
             record.gia_von = 0;
        }

        records.push(record);
    }

    console.log(`Prepared ${records.length} records. Uploading to Supabase in batches of 100...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i += 100) {
        const batch = records.slice(i, i + 100);
        const { data, error } = await supabase.from('dim_hom')
            .upsert(batch, { onConflict: 'ma_hom' });

        if (error) {
            console.error(`Error in batch ${i / 100 + 1}:`, error.message);
            errorCount += batch.length;
        } else {
            successCount += batch.length;
        }
    }

    console.log(`\n\n=== UPLOAD SUMMARY ===`);
    console.log(`- Successfully upserted: ${successCount}`);
    if (errorCount > 0) {
        console.log(`- Failed: ${errorCount}`);
    }
    console.log(`======================`);
}

uploadData();
