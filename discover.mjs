const TOKEN = '84869196569c35038d0514699999665';
const BASE = 'https://cloud-cloud.1office.vn';

const guesses = [
  '/api/warehouse/inventory/gets',
  '/api/warehouse/export/gets',
  '/api/warehouse/issue/gets',
  '/api/sale/order/gets',
  '/api/buy/order/gets',
  '/api/purchase/order/gets',
  '/api/buy/contract/gets',
  '/api/purchase/contract/gets',
  '/api/customer/gets',
  '/api/supplier/gets',
  '/api/contact/gets',
  '/api/material/gets',
];

async function checkUrl(url) {
  try {
    const res = await fetch(BASE + url + '?access_token=' + TOKEN + '&limit=1&page=1', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const txt = await res.text();
    let json = null;
    try { json = JSON.parse(txt); } catch(e) { 
      const m = txt.match(/\{[\s\S]*\}/);
      if(m) try { json = JSON.parse(m[0]); } catch(e2) {}
    }
    
    if (json) {
      if (json.error !== true) {
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
           console.log('✅ FOUND:', url, '->', Object.keys(json.data[0]).slice(0, 5).join(', '));
        } else {
           console.log('⚠️ EMPTY OR STRANGE:', url, '->', Object.keys(json).join(', '));
        }
      } else {
        console.log('❌ Lỗi 1Office:', url, '->', json.message);
      }
      return;
    }
    console.log('❌ Failed parsing JSON:', url, txt.slice(0, 50));
  } catch(e) {
    console.log('❌ Exception:', url, e.message);
  }
}

async function discover() {
  console.log('Starting discovery...');
  for (const path of guesses) {
    await checkUrl(path);
  }
}
discover();
