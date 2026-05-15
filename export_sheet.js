require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ Không tìm thấy Supabase URL hoặc Key trong .env.local');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔄 Đang lấy dữ liệu từ Supabase...');

    const { data: factData, error: factError } = await supabase
      .from('fact_dam')
      .select('*')
      .order('stt', { ascending: false });

    if (factError) throw factError;
    if (!factData || factData.length === 0) {
      console.log('⚠️ Không tìm thấy dữ liệu nào trong bảng fact_dam');
      return;
    }

    const { data: dimData } = await supabase
      .from('dim_dam')
      .select('ma_dam, created_at, updated_at');

    const dimMap = {};
    (dimData || []).forEach((d) => { dimMap[d.ma_dam] = d; });

    const merged = factData.map((f) => {
      const dim = dimMap[f.ma_dam];
      return {
        ...f,
        created_at: f.created_at || dim?.created_at,
        updated_at: f.updated_at || dim?.updated_at,
      };
    });

    console.log(`✅ Đã lấy ${merged.length} dòng. Đang chuẩn bị tạo Google Sheet...`);

    const headers = Object.keys(merged[0]);
    const rows = merged.map((row) => {
      return headers.map(h => {
        const val = row[h];
        if (typeof val === 'object' && val !== null) return JSON.stringify(val);
        return val == null ? '' : String(val);
      });
    });

    let credentials;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      const keyPath = path.join(process.cwd(), 'google-drive-credentials.json');
      if (fs.existsSync(keyPath)) {
        credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      } else {
        throw new Error('❌ Không tìm thấy GOOGLE_SERVICE_ACCOUNT_JSON trong env hoặc file google-drive-credentials.json');
      }
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetTitle = `Lịch làm đám (Đồng bộ ngày ${new Date().toLocaleDateString('vi-VN')})`;
    console.log(`📝 Đang tạo Google Sheet: "${sheetTitle}"...`);
    
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: sheetTitle
        }
      }
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    if (!spreadsheetId) throw new Error('❌ Không tạo được spreadsheet');

    console.log(`✅ Đã tạo Sheet (ID: ${spreadsheetId}). Đang ghi dữ liệu...`);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows]
      }
    });

    console.log('✅ Đã ghi dữ liệu. Đang cập nhật quyền truy cập công khai...');

    const drive = google.drive({ version: 'v3', auth });
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    console.log('🎉 Xong! Đây là link file Google Sheet của bạn:');
    console.log('👉', sheetUrl);

  } catch (err) {
    console.error('❌ Lỗi:', err.message || err);
  }
}

main();
