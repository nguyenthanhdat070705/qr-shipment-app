

const BASE_URL = 'https://cloud-cloud.1office.vn';
const ACCESS_TOKEN = '84869196569c35038d0514699999665';
const PAGE_SIZE = 20;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAll(endpoint, extraParams = {}, specificToken) {
  const allData = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      access_token: specificToken || ACCESS_TOKEN,
      limit: String(PAGE_SIZE),
      page: String(page),
      ...extraParams,
    });
    const url = `${BASE_URL}${endpoint}?${params}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) { try { json = JSON.parse(match[0]); } catch {} }
      }
      if (!json) break;
      if (json.error === true) break;
      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) break;
      allData.push(...json.data);
      if (json.data.length < PAGE_SIZE) break;
      page++;
      await sleep(800);
    } catch (err) {
      break;
    }
  }
  return allData;
}

async function test() {
  const prods = await fetchAll('/api/warehouse/product/gets');
  console.log('Products:', prods.length);

  const leads = await fetchAll('/api/crm/lead/gets');
  console.log('Leads:', leads.length);
}
test();
