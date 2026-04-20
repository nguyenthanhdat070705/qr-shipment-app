// Trigger Vercel redeploy bằng cách tạo deployment mới từ Git
const TOKEN = process.env.VERCEL_TOKEN || 'YOUR_VERCEL_TOKEN';
const TEAM_ID = 'team_UaLWLE4YZzbPIw0GluupGnZo';
const PROJECT_ID = 'prj_4AmiNZEiKqIA1rogTfYx1IRx7AG3';

// Lấy deployment mới nhất để redeploy
const listRes = await fetch(
  `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&limit=1`,
  { headers: { Authorization: `Bearer ${TOKEN}` } }
);
const list = await listRes.json();
const latest = list.deployments?.[0];

if (!latest) {
  console.error('Không tìm thấy deployment để redeploy');
  process.exit(1);
}

console.log(`📦 Latest deployment: ${latest.uid} (${latest.url})`);
console.log('🚀 Triggering redeploy...');

// Tạo deployment mới từ cùng Git source
const res = await fetch(
  `https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}&forceNew=1`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'blackstone-order-scm',
      deploymentId: latest.uid,
      target: 'production',
    }),
  }
);

const data = await res.json();
if (res.ok) {
  console.log(`✅ Redeploy thành công!`);
  console.log(`   URL: https://${data.url || data.alias?.[0] || 'blackstone-order-scm.vercel.app'}`);
} else {
  console.log('⚠️ Redeploy API error:', JSON.stringify(data));
  console.log('\n👉 Vào Vercel Dashboard → Deployments → Redeploy thủ công:');
  console.log('   https://vercel.com/team_UaLWLE4YZzbPIw0GluupGnZo/blackstone-order-scm');
}
