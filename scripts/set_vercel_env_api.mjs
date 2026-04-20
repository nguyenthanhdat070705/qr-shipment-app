// Set GOOGLE_SERVICE_ACCOUNT_JSON lên Vercel qua REST API
// node scripts/set_vercel_env_api.mjs <VERCEL_TOKEN>
// Lấy token tại: https://vercel.com/account/tokens

import { readFileSync } from 'fs';

const PROJECT_ID = 'prj_4AmiNZEiKqIA1rogTfYx1IRx7AG3';
const TEAM_ID    = 'team_UaLWLE4YZzbPIw0GluupGnZo';
const ENV_KEY    = 'GOOGLE_SERVICE_ACCOUNT_JSON';

// Đọc token từ args
const token = process.argv[2];
if (!token) {
  console.log('Usage: node scripts/set_vercel_env_api.mjs <VERCEL_TOKEN>');
  console.log('');
  console.log('Lấy token tại: https://vercel.com/account/tokens');
  console.log('  → New Token → Name: "BlackStones Script" → Expiration: No expiry');
  process.exit(1);
}

const cred = JSON.parse(readFileSync('google-drive-credentials.json', 'utf8'));
const value = JSON.stringify(cred); // minified single-line

console.log(`📦 Service Account: ${cred.client_email}`);
console.log(`   JSON length: ${value.length} chars`);

// Xoá env cũ nếu có
console.log('\n🗑️  Xoá env cũ (nếu có)...');
await fetch(
  `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
  { headers: { Authorization: `Bearer ${token}` } }
)
.then(r => r.json())
.then(async (d) => {
  const existing = (d.envs || []).filter(e => e.key === ENV_KEY);
  for (const env of existing) {
    await fetch(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${env.id}?teamId=${TEAM_ID}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`   Đã xoá env id: ${env.id}`);
  }
});

// Tạo mới
console.log(`\n🔼 Set ${ENV_KEY} cho production + preview + development...`);
const res = await fetch(
  `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: ENV_KEY,
      value: value,
      type: 'encrypted',
      target: ['production', 'preview', 'development'],
    }),
  }
);

const result = await res.json();
if (res.ok) {
  console.log(`✅ Set thành công! ENV ID: ${result.created?.id || result.id || JSON.stringify(result)}`);
  
  // Trigger redeploy
  console.log('\n🚀 Triggering redeploy...');
  const deployRes = await fetch(
    `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'blackstone-order-scm',
        gitSource: {
          type: 'github',
          repoId: 'nguyenthanhdat070705/qr-shipment-app',
          ref: 'main',
        },
        projectSettings: { framework: 'nextjs' },
      }),
    }
  );
  const deploy = await deployRes.json();
  if (deployRes.ok) {
    console.log(`✅ Redeploy triggered: ${deploy.url || deploy.id}`);
  } else {
    console.log('⚠️  Env set xong! Vui lòng redeploy thủ công tại Vercel Dashboard.');
    console.log('   https://vercel.com/team_UaLWLE4YZzbPIw0GluupGnZo/blackstone-order-scm');
  }
} else {
  console.error('❌ Lỗi set env:', JSON.stringify(result, null, 2));
}
