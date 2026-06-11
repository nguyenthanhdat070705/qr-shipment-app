require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-supabase-auth-override': 'service_role' } }
});

const BASE_URL = 'https://cloud-cloud.1office.vn';
const ACCESS_TOKEN = '84869196569c35038d0514699999665';
const PAGE_SIZE = 20;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAll(endpoint) {
  const allData = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      access_token: ACCESS_TOKEN,
      limit: String(PAGE_SIZE),
      page: String(page)
    });
    const url = `${BASE_URL}${endpoint}?${params}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) { try { json = JSON.parse(match[0]); } catch {} }
      }
      if (!json || json.error === true || !json.data || !Array.isArray(json.data) || json.data.length === 0) break;
      allData.push(...json.data);
      if (json.data.length < PAGE_SIZE) break;
      page++;
      await sleep(800);
    } catch { break; }
  }
  return allData;
}

function parseNum(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

function mapProduct(item) {
  return {
    oneoffice_id:   Number(item.ID) || null,
    code:           item.code || String(item.ID),
    name:           item.title || `SP #${item.ID}`,
    barcode:        item.barcode || null,
    unit:           item.unit_id || null,
    cost_price:     parseNum(item.price_buy),
    selling_price:  parseNum(item.price),
    category:       item.product_category || null,
    product_type:   item.product_type || null,
    manage_type:    item.manage_type || null,
    supplier_list:  item.supplier_list || null,
    description:    item.desc || null,
    is_active:      item.status === 'Hoạt động' || item.status === 'active' || item.status === 1,
    updated_at:     new Date().toISOString(),
  };
}

async function run() {
  console.log('Fetching products from 1Office...');
  const rawProducts = await fetchAll('/api/warehouse/product/gets');
  console.log(`Fetched ${rawProducts.length} from 1Office.`);
  
  if (rawProducts.length === 0) return process.exit(0);
  
  const mapped = rawProducts.map(mapProduct).filter(t => t.oneoffice_id !== null);
  console.log(`Upserting ${mapped.length} products to Supabase...`);
  
  const BATCH = 50;
  let upserted = 0, errors = 0;
  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH);
    const { error } = await supabase.from('oneoffice_crm_products').upsert(batch, { onConflict: 'oneoffice_id' });
    if (error) {
      console.error(`Batch Error:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }
  console.log(`Done! Upserted: ${upserted}, Errors: ${errors}`);
}

run();
