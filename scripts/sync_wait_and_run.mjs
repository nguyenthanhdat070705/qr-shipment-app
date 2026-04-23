// Wait and retry until tables exist, then sync
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvcXRkZ3psZGt4bWNnanNodGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgxNjIwNywiZXhwIjoyMDg5MzkyMjA3fQ.jGZlG0GWc1eZRaHd0FtFtGcYiDe18Nu_YoWkAyXiGWM';
const BASE = 'https://woqtdgzldkxmcgjshthx.supabase.co';
const ONEOFFICE_TOKEN = '84869196569c35038d0514699999665';
const OO_BASE = 'https://cloud-cloud.1office.vn';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const p = str.trim().split('/');
  if (p.length !== 3) return null;
  const iso = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  return isNaN(Date.parse(iso)) ? null : iso;
}
function n(v) { if (!v) return 0; const x = parseFloat(String(v).replace(/[^\d.-]/g,'')); return isNaN(x)?0:x; }

async function tableExists(name) {
  const r = await fetch(`${BASE}/rest/v1/${name}?limit=1`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  return r.status === 200;
}

async function waitForTables() {
  console.log('⏳ Chờ bảng được tạo trong Supabase...');
  for (let i = 0; i < 30; i++) {
    const [c, q] = await Promise.all([tableExists('sale_contracts'), tableExists('sale_quotations')]);
    if (c && q) { console.log('✅ Cả 2 bảng đã được tạo!\n'); return true; }
    process.stdout.write(`\r  Thử lần ${i+1}/30: contracts=${c?'✅':'❌'} quotations=${q?'✅':'❌'} — chờ 5s...`);
    await sleep(5000);
  }
  console.log('\n❌ Timeout — bảng chưa được tạo sau 2.5 phút');
  return false;
}

async function fetchAll(endpoint) {
  const all = [];
  let page = 1;
  while (true) {
    const url = `${OO_BASE}${endpoint}?access_token=${ONEOFFICE_TOKEN}&limit=50&page=${page}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); if (m) try { json = JSON.parse(m[0]); } catch {} }
    if (!json || json.error === true || !Array.isArray(json.data) || !json.data.length) break;
    all.push(...json.data);
    process.stdout.write(`\r  Trang ${page}: ${all.length} bản ghi...`);
    if (json.data.length < 50) break;
    page++;
    await sleep(400);
  }
  console.log();
  return all;
}

async function restUpsert(table, rows, conflictCol) {
  if (!rows.length) return { upserted: 0, errors: 0 };
  let upserted = 0, errors = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100).filter(r => r[conflictCol] != null);
    if (!batch.length) continue;
    const r = await fetch(`${BASE}/rest/v1/${table}?on_conflict=${conflictCol}`, {
      method: 'POST',
      headers: {
        apikey: KEY, Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!r.ok) { const t = await r.text(); console.error(`\n  ❌ batch ${i}: ${t.slice(0,150)}`); errors += batch.length; }
    else { upserted += batch.length; process.stdout.write(`\r  Đã upsert: ${upserted}...`); }
  }
  console.log();
  return { upserted, errors };
}

function mapContract(item) {
  return {
    oneoffice_id: Number(item.ID)||null, contract_code: item.code||`CTR-${item.ID}`,
    contract_type: item.contract_type||null, type: item.type||null,
    customer_name: item.customer_name||(typeof item.customer_id==='string'?item.customer_id:null),
    customer_code: item.customer_code||null, customer_type: item.customer_type||null,
    customer_phone: item.customer_phones||null, customer_email: item.customer_emails||null,
    sign_date: parseDate(item.date_sign), start_date: parseDate(item.date_start),
    end_date: parseDate(item.date_end)||null, status: item.status_view||null,
    approval_status: item.app_approval_status||null, total_amount: n(item.total_price),
    currency_unit: item.currency_unit||'VND', pay_type: item.pay_type||null,
    product_list: item.product_ids?String(item.product_ids).slice(0,2000):null,
    detail_text: item.details?String(item.details).slice(0,2000):null,
    note: item.desc||null, created_by: item.created_by_id?String(item.created_by_id):null,
    updated_at: new Date().toISOString(),
  };
}

function mapQuotation(item) {
  return {
    oneoffice_id: Number(item.ID)||null, quotation_code: item.code||`QT-${item.ID}`,
    title: item.title||null, customer_id: typeof item.customer_id==='number'?item.customer_id:null,
    customer_name: item.customer_name||null, customer_code: item.customer_code||null,
    customer_phone: item.customer_phone||null, customer_email: item.customer_email||null,
    quotation_date: parseDate(item.date_sign), expiry_date: parseDate(item.date_to)||null,
    total_amount: n(item.total_price||item.money_currency), currency_unit: item.currency_unit||'VND',
    approval_status: item.app_approval_status||null,
    product_list: item.product_ids?String(item.product_ids).slice(0,2000):null,
    product_detail: item.product_detail?String(item.product_detail).slice(0,2000):null,
    note: item.desc||null, created_by: item.created_by_id?String(item.created_by_id):null,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   1Office → Supabase Sync (auto-wait for tables)   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const ready = await waitForTables();
  if (!ready) {
    console.log('💡 Vui lòng tạo bảng trước:\n   Supabase → SQL Editor → chạy sql/migration_1office_sales_tables.sql');
    process.exit(1);
  }

  const startTime = Date.now();
  const results = {};

  console.log('📄 1. Hợp Đồng (sale_contracts)...');
  const rawC = await fetchAll('/api/sale/contract/gets');
  console.log(`  → ${rawC.length} bản ghi`);
  if (rawC.length) {
    const r = await restUpsert('sale_contracts', rawC.map(mapContract).filter(c=>c.oneoffice_id), 'oneoffice_id');
    results.contracts = { fetched: rawC.length, ...r };
    console.log(`  ✅ Upserted: ${r.upserted}  Lỗi: ${r.errors}`);
  } else { results.contracts = { fetched: 0, upserted: 0, errors: 0 }; }

  console.log('\n📋 2. Báo Giá (sale_quotations)...');
  const rawQ = await fetchAll('/api/sale/quotation/gets');
  console.log(`  → ${rawQ.length} bản ghi`);
  if (rawQ.length) {
    const r = await restUpsert('sale_quotations', rawQ.map(mapQuotation).filter(q=>q.oneoffice_id), 'oneoffice_id');
    results.quotations = { fetched: rawQ.length, ...r };
    console.log(`  ✅ Upserted: ${r.upserted}  Lỗi: ${r.errors}`);
  } else { results.quotations = { fetched: 0, upserted: 0, errors: 0 }; }

  const dur = ((Date.now()-startTime)/1000).toFixed(1);
  const tf = Object.values(results).reduce((s,r)=>s+r.fetched,0);
  const tu = Object.values(results).reduce((s,r)=>s+r.upserted,0);
  const te = Object.values(results).reduce((s,r)=>s+r.errors,0);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  ✅ XONG — ${dur}s | ${tf} fetched | ${tu} upserted | ${te} lỗi`);
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
