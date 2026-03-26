import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envPath = path.join(process.cwd(), '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error(".env.local not found!");
}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value;
  }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env.local (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

const BASE = 'https://cloud-cloud.1office.vn';
const TOKEN = '84869196569c35038d0514699999665';
const DEFAULT_PASSWORD = 'BlackStones@2026';

async function fetchSafe() {
  const allData = [];
  let page = 1;
  const limit = 50; 
  
  console.log(`\nBắt đầu rút danh sách người dùng từ 1Office...`);
  
  while (true) {
    try {
      const url = `${BASE}/api/admin/user/gets?access_token=${TOKEN}&limit=${limit}&page=${page}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const text = await res.text();
      
      let json = null;
      try { 
        json = JSON.parse(text); 
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { json = JSON.parse(jsonMatch[0]); } catch(e2) {
             console.warn(`[Trang ${page}] Lỗi JSON.`); break;
          }
        } else { break; }
      }
      
      if (json.error === true) { 
        console.warn(`[Trang ${page}] 1Office error: ${json.message}`);
        break; 
      }
      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) { break; }
      
      allData.push(...json.data);
      console.log(`  -> Lấy trang ${page} (${json.data.length} users).`);
      if (json.data.length < limit) break;
      
      page++;
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`Lỗi kết nối trang ${page}: ${e.message}`);
      break;
    }
  }
  return allData;
}

async function main() {
  const users = await fetchSafe();
  console.log(`\nTìm thấy ${users.length} tài khoản từ 1Office. Bắt đầu đồng bộ vào Supabase...`);
  
  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const u of users) {
    if (!u.email) {
      console.log(`[SKIP] Bỏ qua user không có email: ${u.username || u.fullname}`);
      skippedCount++;
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        fullname: u.fullname || '',
        username: u.username || '',
        group_id: u.group_id || '',
        job_title: u.job_title || '',
        department_id: u.department_id || '',
        admin_user_role: u.admin_user_role || ''
      }
    });

    if (error) {
      if (error.message.includes("User already registered") || error.code === 'user_already_exists') {
        // Option to update user metadata if needed. For now skipping existing.
        console.log(`[SKIP] Đã tồn tại: ${u.email}`);
        skippedCount++;
      } else {
        console.error(`[LỖI] Tạo user ${u.email} thất bại: ${error.message}`);
        errorCount++;
      }
    } else {
      console.log(`[OK] Đã tạo thành công: ${u.email}`);
      createdCount++;
    }
    // Small delay to prevent hitting API limits
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n=== KẾT QUẢ ĐỒNG BỘ ===`);
  console.log(`Tổng số nhận từ 1Office: ${users.length}`);
  console.log(`Đã tạo mới: ${createdCount}`);
  console.log(`Đã bỏ qua (tồn tại/thiếu email): ${skippedCount}`);
  console.log(`Lỗi: ${errorCount}`);
}

main().catch(console.error);
