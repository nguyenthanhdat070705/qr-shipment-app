// Script set GOOGLE_SERVICE_ACCOUNT_JSON lên Vercel production
// Chạy: node scripts/set_vercel_env.mjs

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const credFile = 'google-drive-credentials.json';
const envKey = 'GOOGLE_SERVICE_ACCOUNT_JSON';

try {
  // Đọc và minify JSON (bỏ newline/space thừa) — Vercel cần single-line
  const raw = readFileSync(credFile, 'utf8');
  const minified = JSON.stringify(JSON.parse(raw));
  
  console.log(`📦 Đọc credentials từ: ${credFile}`);
  console.log(`   Service Account: ${JSON.parse(raw).client_email}`);
  console.log(`   Project ID: ${JSON.parse(raw).project_id}`);
  console.log(`   Key length: ${minified.length} chars`);
  console.log('');
  console.log(`🔼 Đang set ${envKey} lên Vercel (production)...`);
  
  // Xoá env cũ trước nếu có (ignore error)
  try {
    execSync(`echo | node node_modules/vercel/dist/index.js env rm ${envKey} production --yes 2>nul`, { 
      stdio: 'pipe' 
    });
  } catch { /* ignore nếu chưa tồn tại */ }
  
  // Set env mới bằng stdin pipe để tránh escape chars
  const result = execSync(
    `node node_modules/vercel/dist/index.js env add ${envKey} production`,
    { 
      input: minified,
      encoding: 'utf8',
      timeout: 30000,
    }
  );
  
  console.log('✅ Set thành công!');
  console.log(result);
  
  console.log('');
  console.log('🚀 Bây giờ cần redeploy để áp dụng:');
  console.log('   node node_modules/vercel/dist/index.js --prod');
  
} catch (err) {
  console.error('❌ Lỗi:', err.message);
  console.log('');
  console.log('📋 Hoặc tự set thủ công tại Vercel Dashboard:');
  console.log('   https://vercel.com/team_UaLWLE4YZzbPIw0GluupGnZo/blackstone-order-scm/settings/environment-variables');
}
