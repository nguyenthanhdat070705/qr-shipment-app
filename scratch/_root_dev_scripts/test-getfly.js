const GETFLY_API_KEY = 'UyNhqLj3Opw0ZSup9dA2uq1A8qFvT1';
const GETFLY_BASE = 'https://blackstonesdvtl.getflycrm.com/api/v3';

async function test(endpoint) {
  const res = await fetch(`${GETFLY_BASE}${endpoint}`, {
    headers: { 'X-API-KEY': GETFLY_API_KEY, 'Content-Type': 'application/json' }
  });
  console.log(endpoint, res.status);
  if (res.ok) {
    const data = await res.json();
    console.log(data);
  } else {
    console.log(await res.text().catch(()=>''));
  }
}

test('/contracts').then(() => test('/orders?order_type=2'));
