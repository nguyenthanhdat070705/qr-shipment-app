/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const users = [
  { id: 's', email: 'bophanbanhang@blackstone.com.vn', app_metadata: {} },
  { id: 'o', email: 'bophanvanhanh@blackstone.com.vn', app_metadata: {} },
  { id: 'w', email: 'kho1@blackstone.com.vn', app_metadata: {} },
  { id: 'u', email: 'kho.new@blackstone.com.vn', app_metadata: {} },
];
const records = {
  dim_hom: [{ id: 'product', ma_hom: 'SKU', ten_hom: 'Product', so_luong: 999, is_active: true }],
  dim_kho: [{ id: 'warehouse', ma_kho: 'WH', ten_kho: 'Kho Nguyễn Văn Linh (Kho 4)' }, { id: 'other', ma_kho: 'WH2', ten_kho: 'Kho Kha Vạn Cân' }],
  fact_inventory: [{ 'Tên hàng hóa': 'product', 'Kho': 'warehouse', 'Số lượng': 7, 'Ghi chú': 5 }, { 'Tên hàng hóa': 'product', 'Kho': 'other', 'Số lượng': 3, 'Ghi chú': 2 }],
};
const mock = {
  auth: { getUser: async token => ({ data: { user: users.find(user => user.id === token) || null }, error: null }) },
  from(table) {
    if (table === 'dim_account') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_active: true }, error: null }) }) }) };
    const result = { data: records[table] || [], error: null };
    return { select: () => Object.assign(Promise.resolve(result), { order: async () => result, eq: async () => result }) };
  },
};
const next = { NextResponse: { json: (data, opts = {}) => ({ status: opts.status || 200, data }) } };
const modules = {};
function load(path) {
  if (modules[path]) return modules[path].exports;
  const mod = modules[path] = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const req = name => {
    if (name === 'next/server') return next;
    if (name === '@/config/roles.config') return load('src/config/roles.config.ts');
    if (name === '@/lib/serverAuth') return load('src/lib/serverAuth.ts');
    if (name === '@/lib/inventoryWarehouse') return load('src/lib/inventoryWarehouse.ts');
    if (name === '@/lib/supabase/server') return { getSupabaseAdmin: () => mock };
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: path })(req, mod, mod.exports);
  return mod.exports;
}
const request = token => ({ headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}) });
(async () => {
  const { getEffectivePermissions } = load('src/config/roles.config.ts');
  assert.equal(getEffectivePermissions(users[0].email, {}).canViewInventory, true, 'default Sales can view stock');
  assert.equal(getEffectivePermissions(users[0].email, { canViewInventory: false }).canViewInventory, false, 'explicit revocation wins');
  const route = load('src/app/api/products/route.ts');
  const defaults = await route.GET(request('s'));
  assert.equal(defaults.data.data[0].so_luong, 10, 'default Sales receives actual stock, not stale cached number');
  users[0].app_metadata.permissions = { canViewInventory: true };
  users[1].app_metadata.permissions = { canViewInventory: true };
  const sales = await route.GET(request('s'));
  const operations = await route.GET(request('o'));
  assert.deepEqual(sales.data, operations.data, 'equal inventory permissions yield equal product data');
  users[0].app_metadata.permissions.canViewInventory = false;
  users[1].app_metadata.permissions.canViewInventory = false;
  for (const token of ['s', 'o']) {
    const denied = await route.GET(request(token));
    assert.equal(Object.hasOwn(denied.data.data[0], 'so_luong'), false, 'revoked stock must not be returned');
  }
  const anonymous = await route.GET(request());
  assert.equal(Object.hasOwn(anonymous.data.data[0], 'so_luong'), false, 'anonymous stock must not be returned');
  assert.equal((await route.GET(request('w'))).data.data[0].so_luong, 7, 'warehouse sees only the warehouse assigned to its verified identity');
  assert.equal((await route.GET(request('u'))).data.data[0].so_luong, 0, 'unassigned warehouse cannot see other stock');
  const inventoryRoute = load('src/app/api/inventory/route.ts');
  assert.equal((await inventoryRoute.GET(request())).status, 401);
  const warehouseResult = await inventoryRoute.GET(request('w'));
  assert.equal(warehouseResult.data.data[0].tonKho, '7');
  assert.deepEqual(warehouseResult.data.data[0].warehouseBreakdown.map(row => row.name), ['Kho Nguyễn Văn Linh (Kho 4)']);
  const unknownResult = await inventoryRoute.GET(request('u'));
  assert.equal(unknownResult.data.data[0].tonKho, '0');
  assert.equal(unknownResult.data.data[0].warehouseBreakdown.length, 0);
  console.log('Catalog inventory checks passed: default, assigned, revoked, and anonymous access.');
})().catch(error => { console.error(error); process.exitCode = 1; });
