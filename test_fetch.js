const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="?([^"\r\n]+)"?/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\r\n]+)"?/)[1];

async function run() {
  const r1 = await fetch(url + '/rest/v1/delivery_orders?select=id,status,created_at&order=created_at.desc&limit=2', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  console.log("--- LATEST DELIVERY ORDERS ---");
  console.log(await r1.json());
  
  const r2 = await fetch(url + '/rest/v1/fact_xuat_hang?select=id,ma_phieu_xuat,trang_thai,created_at&order=created_at.desc&limit=2', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  });
  console.log("--- LATEST FACT_XUAT_HANG ---");
  console.log(await r2.json());
}
run();
