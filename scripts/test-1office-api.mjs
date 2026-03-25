/**
 * Script: Test 1Office API & Match với Supabase
 * 
 * Thử nhiều base URL phổ biến của 1Office để tìm API endpoint đúng,
 * sau đó so sánh dữ liệu với bảng user_profiles trên Supabase.
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ─────────────────────────────────────────────────────
const ONEOFFICE_TOKEN = '84869196569c35038d0514699999665';

const SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';

// ── Candidate base URLs for 1Office API ────────────────────────
const BASE_URLS = [
  'https://api.1office.vn',
  'https://app.1office.vn',
  'https://1office.vn',
  'https://open.1office.vn',
  'https://openapi.1office.vn',
  'https://gateway.1office.vn',
  'https://cloudapi.1office.vn',
  'https://connect.1office.vn',
  'https://api-v2.1office.vn',
  'https://v2.1office.vn',
];

const API_PATH = '/api/admin/user/gets';

// ── Step 1: Test 1Office API URLs ─────────────────────────────
console.log('═══════════════════════════════════════════════════');
console.log('  STEP 1: Tìm Base URL đúng của 1Office API');
console.log('═══════════════════════════════════════════════════\n');

let workingUrl = null;
let oneofficeData = null;

for (const baseUrl of BASE_URLS) {
  const url = `${baseUrl}${API_PATH}?access_token=${ONEOFFICE_TOKEN}&limit=5&hl=vn`;
  process.stdout.write(`  Testing ${baseUrl}... `);
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);
    
    const contentType = res.headers.get('content-type') || '';
    
    if (res.ok && contentType.includes('json')) {
      const data = await res.json();
      console.log(`✅ Status ${res.status} — JSON response!`);
      console.log(`     Response keys: ${Object.keys(data).join(', ')}`);
      
      // Check if it looks like valid API data
      if (data.data || data.items || data.results || data.users || Array.isArray(data)) {
        workingUrl = baseUrl;
        oneofficeData = data;
        console.log(`     🎯 This looks like valid API data!\n`);
        break;
      } else {
        // Even if structure is different, save first JSON response
        if (!workingUrl) {
          workingUrl = baseUrl;
          oneofficeData = data;
        }
        console.log(`     ⚠️  JSON but unknown structure`);
      }
    } else {
      const text = await res.text();
      console.log(`❌ Status ${res.status} — ${contentType || 'no content-type'}`);
      if (text.length < 200) console.log(`     Body: ${text.substring(0, 200)}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('⏱️  Timeout (8s)');
    } else {
      console.log(`❌ ${err.message?.substring(0, 80)}`);
    }
  }
}

if (workingUrl) {
  console.log(`\n✅ Working Base URL: ${workingUrl}`);
  console.log('\n── 1Office API Response (first 5 users) ──────────');
  console.log(JSON.stringify(oneofficeData, null, 2).substring(0, 3000));
} else {
  console.log('\n❌ Không tìm được base URL nào hoạt động.');
  console.log('   Đề xuất: Kiểm tra lại token hoặc liên hệ 1Office để lấy đúng base URL.\n');
  
  // Try with just the domain directly
  console.log('── Thử thêm các URL variant khác ──────────────');
  const extraUrls = [
    `https://1office.vn/api/admin/user/gets`,
    `https://app.1office.vn/openapi/admin/user/gets`,
    `https://api.1office.vn/v1/admin/user/gets`,
    `https://api.1office.vn/v2/admin/user/gets`,
  ];
  
  for (const url of extraUrls) {
    const fullUrl = `${url}?access_token=${ONEOFFICE_TOKEN}&limit=2`;
    process.stdout.write(`  Testing ${url}... `);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(fullUrl, { signal: controller.signal });
      clearTimeout(timeout);
      console.log(`Status ${res.status}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`     Body preview: ${text.substring(0, 300)}\n`);
      }
    } catch (err) {
      console.log(`Error: ${err.message?.substring(0, 60)}`);
    }
  }
}

// ── Step 2: Query Supabase ────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════');
console.log('  STEP 2: Query Supabase hiện tại');
console.log('═══════════════════════════════════════════════════\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 2a. user_profiles table
console.log('── Bảng user_profiles ──────────────────────────');
const { data: profiles, error: profileError } = await supabase
  .from('user_profiles')
  .select('*')
  .limit(20);

if (profileError) {
  console.log(`  ❌ Error: ${profileError.message}`);
  if (profileError.message.includes('does not exist')) {
    console.log('  → Bảng user_profiles chưa tồn tại trên Supabase');
  }
} else {
  console.log(`  ✅ Found ${profiles.length} profiles`);
  if (profiles.length > 0) {
    console.log(`  Columns: ${Object.keys(profiles[0]).join(', ')}`);
    console.table(profiles.map(p => ({
      id: p.id,
      email: p.email,
      ho_ten: p.ho_ten,
      chuc_vu: p.chuc_vu,
      phong_ban: p.phong_ban,
    })));
  }
}

// 2b. products table
console.log('\n── Bảng products ──────────────────────────────');
const { data: products, error: productError } = await supabase
  .from('products')
  .select('*')
  .limit(5);

if (productError) {
  console.log(`  ❌ Error: ${productError.message}`);
} else {
  console.log(`  ✅ Found ${products.length} products (showing first 5)`);
  if (products.length > 0) {
    console.log(`  Columns: ${Object.keys(products[0]).join(', ')}`);
  }
}

// 2c. List all tables available
console.log('\n── Liệt kê tất cả bảng Supabase ──────────────');
try {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  
  if (res.ok) {
    const data = await res.json();
    // The /rest/v1/ endpoint returns an OpenAPI spec with paths
    if (data.paths) {
      const tables = Object.keys(data.paths)
        .filter(p => p.startsWith('/'))
        .map(p => p.replace('/', ''))
        .filter(t => !t.startsWith('rpc/'));
      console.log(`  Các bảng: ${tables.join(', ')}`);
    } else if (data.definitions) {
      console.log(`  Definitions: ${Object.keys(data.definitions).join(', ')}`);
    } else {
      console.log(`  Response keys: ${Object.keys(data).join(', ')}`);
    }
  }
} catch (err) {
  console.log(`  Error listing tables: ${err.message}`);
}

// ── Step 3: Matching ──────────────────────────────────────────
if (oneofficeData && profiles && profiles.length > 0) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  STEP 3: Match 1Office ↔ Supabase');
  console.log('═══════════════════════════════════════════════════\n');
  
  // Try to extract user list from 1Office response
  const users = oneofficeData.data || oneofficeData.items || oneofficeData.results || 
                (Array.isArray(oneofficeData) ? oneofficeData : []);
  
  if (Array.isArray(users) && users.length > 0) {
    console.log(`  1Office users: ${users.length}`);
    console.log(`  Supabase profiles: ${profiles.length}\n`);
    
    // Match by email
    const matched = [];
    const unmatchedOffice = [];
    const unmatchedSupabase = [...profiles];
    
    for (const officeUser of users) {
      const email = officeUser.email || officeUser.username;
      const profileIdx = unmatchedSupabase.findIndex(p => 
        p.email === email || 
        p.email === officeUser.email
      );
      
      if (profileIdx >= 0) {
        matched.push({
          email,
          '1Office Name': officeUser.fullname || officeUser.name || '-',
          'Supabase Name': unmatchedSupabase[profileIdx].ho_ten || '-',
          '1Office Dept': officeUser.department_id || '-',
          'Supabase Dept': unmatchedSupabase[profileIdx].phong_ban || '-',
        });
        unmatchedSupabase.splice(profileIdx, 1);
      } else {
        unmatchedOffice.push({
          email,
          name: officeUser.fullname || officeUser.name || '-',
          dept: officeUser.department_id || '-',
        });
      }
    }
    
    if (matched.length > 0) {
      console.log('  ✅ Matched records:');
      console.table(matched);
    }
    
    if (unmatchedOffice.length > 0) {
      console.log('\n  ⚠️  1Office users NOT in Supabase:');
      console.table(unmatchedOffice);
    }
    
    if (unmatchedSupabase.length > 0) {
      console.log('\n  ⚠️  Supabase profiles NOT in 1Office:');
      console.table(unmatchedSupabase.map(p => ({
        email: p.email,
        ho_ten: p.ho_ten,
        phong_ban: p.phong_ban,
      })));
    }
  } else {
    console.log('  ⚠️  Could not extract user array from 1Office response.');
    console.log('  Response structure:', JSON.stringify(Object.keys(oneofficeData)));
  }
} else {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  STEP 3: Không thể match — thiếu dữ liệu');
  console.log('═══════════════════════════════════════════════════');
  if (!oneofficeData) console.log('  → Chưa có dữ liệu từ 1Office API');
  if (!profiles || profiles.length === 0) console.log('  → Chưa có dữ liệu user_profiles trên Supabase');
}

console.log('\n══════════════════════════════════════════════════');
console.log('  DONE');
console.log('══════════════════════════════════════════════════\n');
