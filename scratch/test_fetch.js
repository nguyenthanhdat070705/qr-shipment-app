import fetch from 'node-fetch';

const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

async function searchContract() {
  // Let's get the first few pages of orders without order_type=2 to see if MBS2602 is there
  for (let page = 1; page <= 5; page++) {
    const url = `${GETFLY_BASE}/orders?page=${page}&per_page=50`;
    const res = await fetch(url, {
      headers: { 'X-API-KEY': GETFLY_API_KEY, 'Accept': 'application/json' },
    });
    
    const data = await res.json();
    const records = data.records || data.data || [];
    
    for (const r of records) {
      const code = String(r.order_code || r.code || r.name || '');
      if (code.includes('MBS2602') || code.includes('0868578777')) {
        console.log('FOUND MBS2602:', JSON.stringify({
          id: r.order_id || r.id,
          code: r.order_code || r.code,
          name: r.order_name || r.name,
          type: r.order_type || r.type,
          status: r.order_status || r.status_name,
        }, null, 2));
        return;
      }
    }
  }
  console.log('Not found in first 5 pages.');
}

searchContract();
