// Debug script: Kiểm tra toàn bộ field names trong raw_data từ Getfly
// Chạy: npx tsx scripts/debug_getfly_fields.ts

const GETFLY_API_KEY = process.env.GETFLY_API_KEY || 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

async function debugGetflyAPI() {
  console.log('=== DEBUG GETFLY API ===\n');

  // 1. Check Orders endpoint (order_type=2)
  console.log('--- 1. Orders endpoint (order_type=2) ---');
  try {
    const url1 = `${GETFLY_BASE}/orders?order_type=2&per_page=2`;
    const res1 = await fetch(url1, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const data1 = await res1.json();
    console.log('Status:', res1.status);
    console.log('Total records:', data1.pagination?.total_record || data1.total_record || 'unknown');
    if (data1.records?.length > 0) {
      console.log('First record ALL FIELDS:', JSON.stringify(Object.keys(data1.records[0]), null, 2));
      console.log('First record sample:', JSON.stringify(data1.records[0], null, 2).substring(0, 2000));
    }
  } catch (e) { console.error('Error:', e); }

  // 2. Check Contracts endpoint (if exists)
  console.log('\n--- 2. Contracts endpoint ---');
  try {
    const url2 = `${GETFLY_BASE}/contracts?per_page=2`;
    const res2 = await fetch(url2, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const data2 = await res2.json();
    console.log('Status:', res2.status);
    if (data2.records?.length > 0) {
      console.log('Total:', data2.pagination?.total_record || data2.total_record);
      console.log('First record ALL FIELDS:', JSON.stringify(Object.keys(data2.records[0]), null, 2));
      console.log('First record sample:', JSON.stringify(data2.records[0], null, 2).substring(0, 2000));
    } else {
      console.log('Response:', JSON.stringify(data2).substring(0, 500));
    }
  } catch (e) { console.error('Error:', e); }

  // 3. Check Accounts/Customers endpoint
  console.log('\n--- 3. Accounts endpoint ---');
  try {
    const url3 = `${GETFLY_BASE}/accounts?per_page=2`;
    const res3 = await fetch(url3, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const data3 = await res3.json();
    console.log('Status:', res3.status);
    if (data3.records?.length > 0 || data3.data?.length > 0) {
      const records = data3.records || data3.data;
      console.log('Total:', data3.pagination?.total_record || data3.total_record);
      console.log('First record ALL FIELDS:', JSON.stringify(Object.keys(records[0]), null, 2));
      
      // Find image/attachment fields
      const allFields = Object.keys(records[0]);
      const imageFields = allFields.filter(f => 
        f.includes('image') || f.includes('anh') || f.includes('hinh') || 
        f.includes('photo') || f.includes('file') || f.includes('url') || 
        f.includes('attach') || f.includes('vneid') || f.includes('scan') ||
        f.includes('front') || f.includes('back') || f.includes('mat_truoc') || 
        f.includes('mat_sau') || f.includes('avatar') || f.includes('custom')
      );
      console.log('Image/file related fields:', imageFields);
      
      // Print full first record
      console.log('\nFirst record FULL:', JSON.stringify(records[0], null, 2).substring(0, 3000));
    } else {
      console.log('Response:', JSON.stringify(data3).substring(0, 500));
    }
  } catch (e) { console.error('Error:', e); }

  // 4. Check Order Detail (single order with full data)
  console.log('\n--- 4. Single Order Detail ---');
  try {
    const url4 = `${GETFLY_BASE}/orders/332`;
    const res4 = await fetch(url4, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const data4 = await res4.json();
    console.log('Status:', res4.status);
    console.log('Full response:', JSON.stringify(data4, null, 2).substring(0, 3000));
  } catch (e) { console.error('Error:', e); }

  // 5. Check Custom Fields
  console.log('\n--- 5. Custom Fields ---');
  try {
    const url5 = `${GETFLY_BASE}/custom_fields?per_page=50`;
    const res5 = await fetch(url5, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    const data5 = await res5.json();
    console.log('Status:', res5.status);
    console.log('Custom fields:', JSON.stringify(data5, null, 2).substring(0, 3000));
  } catch (e) { console.error('Error:', e); }
}

debugGetflyAPI().catch(console.error);
