/**
 * Script: Thăm dò API 1Office để tìm đúng endpoint CRM và Customers
 * Run: node scripts/probe_1office_api.mjs
 */

const TOKEN_MAIN  = '84869196569c35038d0514699999665';
const TOKEN_INV   = '201770191369c4adde97a6d512470927';
const TOKEN_WH    = '21629249469c4ae9a40117149012318';
const BASE_URL    = 'https://cloud-cloud.1office.vn';

async function probe(endpoint, token = TOKEN_MAIN) {
  const url = `${BASE_URL}${endpoint}?access_token=${token}&limit=5&page=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) try { json = JSON.parse(m[0]); } catch { /* */ }
    }
    if (!json) return { status: 'parse_error', raw: text.slice(0, 100) };
    if (json.error) return { status: 'error', message: json.message };
    const count = Array.isArray(json.data) ? json.data.length : (json.data ? 1 : 0);
    const total = json.total || json.total_record || '?';
    const sampleKeys = count > 0 ? Object.keys(json.data[0]).slice(0, 8).join(', ') : '';
    return { status: 'ok', count, total, sampleKeys };
  } catch (e) {
    return { status: 'network_error', error: e.message };
  }
}

async function main() {
  console.log('\n=== 1Office API Endpoint Probe ===\n');

  const endpoints = [
    // CRM - trang khách hàng
    ['/api/crm/customer/gets',          TOKEN_MAIN, 'CRM Customers (main token)'],
    ['/api/crm/customer/gets',          TOKEN_INV,  'CRM Customers (inv token)'],
    ['/api/crm/customer/gets',          TOKEN_WH,   'CRM Customers (wh token)'],

    // CRM - contacts  
    ['/api/crm/contact/gets',           TOKEN_MAIN, 'CRM Contacts'],
    ['/api/contact/gets',               TOKEN_MAIN, 'Contacts v2'],

    // CRM - leads / cơ hội
    ['/api/crm/lead/gets',              TOKEN_MAIN, 'CRM Leads'],
    ['/api/crm/opportunity/gets',       TOKEN_MAIN, 'CRM Opportunities'],
    ['/api/sale/lead/gets',             TOKEN_MAIN, 'Sale Leads'],
    
    // Tasks
    ['/api/task/gets',                  TOKEN_MAIN, 'Tasks (main)'],
    ['/api/crm/task/gets',              TOKEN_MAIN, 'CRM Tasks'],
    ['/api/work/task/gets',             TOKEN_MAIN, 'Work Tasks'],
    
    // Sale
    ['/api/sale/order/gets',            TOKEN_MAIN, 'Sale Orders'],
    ['/api/sale/quotation/gets',        TOKEN_MAIN, 'Quotations'],
    ['/api/sale/contract/gets',         TOKEN_MAIN, 'Contracts'],
    
    // Warehouse
    ['/api/warehouse/product/gets',     TOKEN_MAIN, 'Products'],
    ['/api/warehouse/receipt/gets',     TOKEN_MAIN, 'Receipts'],
    ['/api/warehouse/gets',             TOKEN_WH,   'Warehouses'],
    ['/api/warehouse/inventory/gets',   TOKEN_INV,  'Inventory'],
    
    // Nhân viên
    ['/api/admin/user/gets',            TOKEN_MAIN, 'Users'],
    ['/api/hr/staff/gets',              TOKEN_MAIN, 'HR Staff'],
  ];

  for (const [endpoint, token, label] of endpoints) {
    const result = await probe(endpoint, token);
    const icon = result.status === 'ok' ? '✅' : result.status === 'error' ? '⚠️ ' : '❌';
    const info = result.status === 'ok'
      ? `COUNT=${result.count} TOTAL=${result.total} FIELDS=[${result.sampleKeys}]`
      : `${result.message || result.error || result.raw || ''}`;
    console.log(`${icon} ${label.padEnd(35)} ${info}`);
    await new Promise(r => setTimeout(r, 300));
  }
  console.log('\n=== Done ===\n');
}

main().catch(console.error);
