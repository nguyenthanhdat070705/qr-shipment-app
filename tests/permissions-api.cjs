/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const users = [
  { id: 'a', email: 'admin@blackstone.com.vn', app_metadata: {} },
  { id: 's', email: 'sales@blackstone.com.vn', app_metadata: {} },
  { id: 'x', email: 'admin@example.com', app_metadata: {} },
  { id: 'o', email: 'bophanvanhanh@blackstone.com.vn', app_metadata: {} },
];
const mock = {
  auth: {
    getUser: async token => ({ data: { user: users.find(u => u.id === token) || null }, error: null }),
    admin: {
      listUsers: async () => ({ data: { users }, error: null }),
      updateUserById: async (id, update) => { Object.assign(users.find(u => u.id === id).app_metadata, update.app_metadata); return { error: null }; },
    },
  },
  from: table => table === 'dim_ncc'
    ? { select: () => ({ order: async () => ({ data: [{ id: 'supplier' }], error: null }) }) }
    : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_active: true }, error: null }) }) }) },
};
const next = { NextResponse: {
  json: (data, opts = {}) => ({ status: opts.status || 200, data }),
  next: options => ({ status: 200, options }),
} };
const modules = {};
function load(path) {
  if (modules[path]) return modules[path].exports;
  const mod = modules[path] = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const req = name => {
    if (name === 'next/server') return next;
    if (name === '@/config/roles.config') return load('src/config/roles.config.ts');
    if (name === '@/lib/serverAuth') return load('src/lib/serverAuth.ts');
    if (name === '@/lib/supplierAuth') return load('src/lib/supplierAuth.ts');
    if (name === '@/lib/reorder/access') return load('src/lib/reorder/access.ts');
    if (name === '@/lib/supabase/server') return { getSupabaseAdmin: () => mock };
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename: path })(req, mod, mod.exports);
  return mod.exports;
}
function request(token, body) { return { headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}), json: async () => body }; }
(async () => {
  const route = load('src/app/api/accounts/permissions/route.ts');
  assert.equal((await route.GET(request())).status, 401);
  assert.equal((await route.GET(request('forged'))).status, 401);
  assert.equal((await route.GET(request('s'))).status, 403);
  assert.equal((await route.GET(request('x'))).status, 403);
  const list = await route.GET(request('a'));
  assert.equal(list.status, 200);
  assert.equal(list.data.permissionsByEmail['sales@blackstone.com.vn'].canCreatePO, false);
  assert.equal(list.data.permissionsByEmail['admin@example.com'].canAdmin, false);
  const assigned = { ...list.data.permissionsByEmail['sales@blackstone.com.vn'], canCreatePO: true };
  assert.equal((await route.PUT(request('s', { email: users[1].email, permissions: assigned }))).status, 403);
  assert.equal((await route.PUT(request('a', { email: users[1].email, permissions: { ...assigned, canAdmin: true } }))).status, 400);
  assert.equal((await route.PUT(request('a', { email: users[0].email, permissions: assigned }))).status, 403);
  assert.equal((await route.PUT(request('a', { email: users[1].email, permissions: assigned }))).status, 200);
  const { publicUser } = load('src/lib/serverAuth.ts');
  assert.equal(publicUser(users[1]).permissions.canCreatePO, true);
  assert.equal((await route.GET(request('a'))).data.permissionsByEmail[users[1].email].canCreatePO, true);
  const proxy = load('src/proxy.ts');
  function api(path, token, method = 'GET', headers = {}) {
    return { nextUrl: { pathname: path }, method, headers: new Headers({ ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }) };
  }
  assert.equal((await proxy.proxy(api('/api/purchase-orders', null))).status, 401);
  assert.equal((await proxy.proxy(api('/api/goods-issue', 's', 'POST'))).status, 403);
  const allowed = await proxy.proxy(api('/api/purchase-orders', 's', 'POST', { 'x-authenticated-email': 'admin@blackstone.com.vn' }));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.options.request.headers.get('x-authenticated-email'), users[1].email);
  assert.equal((await proxy.proxy(api('/api/suppliers', 's', 'POST'))).status, 403);
  const suppliers = load('src/app/api/suppliers/route.ts');
  const suppliersImport = load('src/app/api/suppliers/import/route.ts');
  assert.equal((await suppliers.GET(request())).status, 401);
  assert.equal((await suppliers.GET(request('s'))).status, 403);
  users[1].app_metadata.permissions.canViewSuppliers = true;
  users[1].app_metadata.permissions.canCreatePO = false;
  assert.equal((await suppliers.GET(request('s'))).status, 200);
  assert.equal((await suppliers.POST(request('s', { created_by: users[0].email }))).status, 403);
  assert.equal((await suppliersImport.POST(request('s', { email: users[0].email, rows: [] }))).status, 403);
  users[1].app_metadata.permissions.canCreatePO = true;
  assert.equal((await suppliers.POST(request('s', {}))).status, 400);
  assert.equal((await suppliersImport.POST(request('s', { rows: [] }))).status, 400);
  assert.equal((await proxy.proxy(api('/api/membership/lookup-sheet', null))).status, 200);
  assert.equal((await proxy.proxy(api('/api/operations', 's', 'POST'))).status, 403);
  // Equal explicit permissions must behave equally across job roles.
  const shared = { ...users[1].app_metadata.permissions, canViewInventory: true, canMembership: true, canCreatePO: true, canViewSuppliers: true };
  users[1].app_metadata.permissions = { ...shared };
  users[3].app_metadata.permissions = { ...shared };
  for (const path of ['/api/inventory', '/api/membership/list', '/api/reorder-points', '/api/suppliers']) {
    const salesResult = await proxy.proxy(api(path, 's'));
    const operationsResult = await proxy.proxy(api(path, 'o'));
    assert.equal(salesResult.status, 200, `sales denied ${path}`);
    assert.equal(operationsResult.status, salesResult.status, `unequal access to ${path}`);
    assert.equal(operationsResult.options.request.headers.get('x-can-view-suppliers'), salesResult.options.request.headers.get('x-can-view-suppliers'));
  }
  const { authorizeReorder } = load('src/lib/reorder/access.ts');
  assert.equal((await authorizeReorder(request('s'))).email, users[1].email);
  assert.equal((await authorizeReorder(request('o'))).email, users[3].email);
  users[1].app_metadata.permissions.canCreatePO = false;
  users[3].app_metadata.permissions.canCreatePO = false;
  assert.equal((await authorizeReorder(request('s'))).error.status, 403);
  assert.equal((await authorizeReorder(request('o'))).error.status, 403);
  assert.equal((await authorizeReorder(request(null, { email: users[0].email }))).error.status, 401);
  const warehouses = load('src/app/api/warehouses/route.ts');
  assert.equal((await warehouses.POST(request('s', { created_by: users[0].email }))).status, 403);
  assert.equal((await warehouses.PUT(request('s', { updated_by: users[0].email }))).status, 403);
  assert.equal((await warehouses.DELETE(request('s', { email: users[0].email }))).status, 403);
  console.log('Permission API mock checks passed: authentication, admin-only access, validation, save and reload.');
})().catch(error => { console.error(error); process.exitCode = 1; });
