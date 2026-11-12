const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const users = [
  { id: 'a', email: 'admin@blackstone.com.vn', app_metadata: {} },
  { id: 's', email: 'sales@blackstone.com.vn', app_metadata: {} },
  { id: 'x', email: 'admin@example.com', app_metadata: {} },
];
const mock = {
  auth: {
    getUser: async token => ({ data: { user: users.find(u => u.id === token) || null }, error: null }),
    admin: {
      listUsers: async () => ({ data: { users }, error: null }),
      updateUserById: async (id, update) => { Object.assign(users.find(u => u.id === id).app_metadata, update.app_metadata); return { error: null }; },
    },
  },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { is_active: true }, error: null }) }) }) }),
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
  assert.equal((await proxy.proxy(api('/api/membership/lookup-sheet', null))).status, 200);
  assert.equal((await proxy.proxy(api('/api/operations', 's', 'POST'))).status, 403);
  console.log('Permission API mock checks passed: authentication, admin-only access, validation, save and reload.');
})().catch(error => { console.error(error); process.exitCode = 1; });
