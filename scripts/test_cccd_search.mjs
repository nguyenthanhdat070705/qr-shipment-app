// Test script: kiểm tra CCCD search API hoạt động
// node scripts/test_cccd_search.mjs

const BASE = 'http://localhost:3000';

async function testSearch(q, label) {
  const res = await fetch(`${BASE}/api/membership/lookup?q=${encodeURIComponent(q)}`);
  const data = await res.json();
  console.log(`\n🔍 Search "${label}" (${q}):`);
  if (data.found) {
    console.log(`   ✅ Tìm thấy ${data.total} kết quả | Loại: ${data.search_type}`);
    for (const r of data.results) {
      console.log(`   → ${r.full_name} | ${r.member_code} | Khớp: ${r.matched_field}`);
    }
  } else {
    console.log(`   ❌ Không tìm thấy: ${data.message || data.error}`);
  }
}

async function run() {
  console.log('=== Test Tra Cứu Hội Viên ===\n');
  await testSearch('079111222333', 'CCCD');
  await testSearch('0911000999',   'SĐT');
  await testSearch('Test CCCD',    'Tên (một phần)');
  await testSearch('Admin Demo',   'NV Tư Vấn');
  console.log('\n✅ Xong!');
}

run().catch(console.error);
