const TOKEN = '84869196569c35038d0514699999665';
const BASE = 'https://cloud-cloud.1office.vn';
const paths = [
  '/api/sale/customer/gets',
  '/api/crm/contact/gets',
  '/api/supplier/gets',
  '/api/warehouse/inventory/gets',
  '/api/warehouse/export/gets',
  '/api/sale/order/gets',
  '/api/buy/order/gets',
  '/api/purchase/order/gets',
  '/api/purchase/contract/gets'
];

async function check() {
  for (const p of paths) {
    try {
      const r = await fetch(BASE + p + '?access_token=' + TOKEN + '&limit=1', { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const txt = await r.text();
      let matchJson = null;
      try { matchJson = JSON.parse(txt); } catch(e) {
        const m = txt.match(/\{[\s\S]*\}/);
        if(m) try { matchJson = JSON.parse(m[0]); } catch(e2){}
      }
      
      if (matchJson && !matchJson.error && matchJson.data) {
        console.log('✅ FOUND API:', p);
      } else {
        console.log('❌ Failed API:', p, matchJson ? matchJson.message : 'Dính block/html');
      }
    } catch(e) {}
  }
}
check();
