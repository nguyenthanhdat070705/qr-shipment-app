const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

async function main() {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // Get kho Kinh Duong Vuong
  let res = await fetch(`${SUPABASE_URL}/rest/v1/dim_kho?ten_kho=ilike.*Kinh Dương Vương*`, { headers });
  let kho = await res.json();
  const khoId = kho[0].id;
  console.log("Kho ID:", khoId);

  // Get hom
  res = await fetch(`${SUPABASE_URL}/rest/v1/dim_hom?ma_hom=eq.2AQ0012`, { headers });
  let hom = await res.json();
  const homId = hom[0].id;
  console.log("Hom ID:", homId);

  // Get inventory
  res = await fetch(`${SUPABASE_URL}/rest/v1/fact_inventory?Tên hàng hóa=eq.${homId}&Kho=eq.${khoId}`, { headers });
  let inv = await res.json();
  console.log("Inventory before:", inv);

  if (inv.length === 0) {
    console.log("Inserting...");
    const crypto = require('crypto');
    const newInv = {
      'Mã': crypto.randomUUID(),
      'Tên hàng hóa': homId,
      'Kho': khoId,
      'Số lượng': 3,
      'Ghi chú': 3
    };
    res = await fetch(`${SUPABASE_URL}/rest/v1/fact_inventory`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newInv)
    });
    console.log("Insert result:", await res.json());
  } else {
    console.log("Updating...");
    const row = inv[0];
    const newQty = (row['Số lượng'] || 0) + 3;
    const newKhadung = (row['Ghi chú'] || 0) + 3;
    res = await fetch(`${SUPABASE_URL}/rest/v1/fact_inventory?Mã=eq.${row['Mã']}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        'Số lượng': newQty,
        'Ghi chú': newKhadung
      })
    });
    console.log("Update result status:", res.status);
    console.log("Update result text:", await res.text());
  }
}
main().catch(console.error);
