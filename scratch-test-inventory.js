require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://cloud-cloud.1office.vn';
const TOKEN = process.env.ONEOFFICE_INVENTORY_TOKEN || '201770191369c4adde97a6d512470927';

const objects = [
  'receipt', 'issue', 'transfer', 'stocktake', 'stock', 'balance', 'item', 'inventory', 'material', 'goods', 
  'product_balance', 'quantity', 'reports', 'storage', 'asset', 'product_stock', 'inventory_detail'
];

async function tryFetch() {
  for (const obj of objects) {
    const url = `${BASE_URL}/api/warehouse/${obj}/gets?access_token=${TOKEN}&limit=1`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log(`Object: ${obj}`, json.message || 'success');
      } catch {
         // html
      }
    } catch {}
  }
}
tryFetch();
