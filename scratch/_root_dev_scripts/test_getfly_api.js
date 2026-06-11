const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

async function run() {
  try {
    const url = new URL(`${GETFLY_BASE}/orders`);
    url.searchParams.set('order_type', '2');
    url.searchParams.set('page', '1');
    url.searchParams.set('per_page', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'X-API-KEY': GETFLY_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error('API Error:', await res.text());
      return;
    }

    const data = await res.json();
    const records = data.records || data.data || [];
    if (records.length > 0) {
      console.log('Record structure:', JSON.stringify(records[0], null, 2));
      
      // Also try to fetch specific order details to see if attachments are there
      const orderId = records[0].order_id || records[0].id;
      if (orderId) {
        console.log(`\nFetching details for order ${orderId}...`);
        const detailRes = await fetch(`${GETFLY_BASE}/orders/${orderId}`, {
          headers: {
            'X-API-KEY': GETFLY_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          console.log('Detailed Record:', JSON.stringify(detailData, null, 2));
        }
      }
    } else {
      console.log('No records found');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
