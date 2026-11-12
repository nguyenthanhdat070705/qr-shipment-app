/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const values = new Map();
global.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
const moduleUnderTest = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/clientSession.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInThisContext(`(function(module, exports) {${source}\n})`)(moduleUnderTest, moduleUnderTest.exports);
const { refreshSession } = moduleUnderTest.exports;

async function main() {
  let finish;
  global.fetch = () => new Promise(resolve => { finish = resolve; });
  const response = { status: 200, ok: true, json: async () => ({ token: 'late-access', refreshToken: 'late-refresh' }) };
  const jwt = (sub, exp = Math.floor(Date.now() / 1000) + 3600) =>
    `header.${Buffer.from(JSON.stringify({ sub, exp })).toString('base64url')}.signature`;
  const oldAccess = jwt('user-a', 1);
  const newerAccess = jwt('user-a');

  values.set('auth_token', oldAccess);
  values.set('auth_refresh_token', 'old-refresh');
  const pending = refreshSession();
  assert.equal(refreshSession(), pending, 'same-tab requests share a refresh');
  values.set('auth_token', newerAccess);
  values.set('auth_refresh_token', 'newer-refresh');
  finish(response);
  assert.equal(await pending, newerAccess);
  assert.equal(values.get('auth_refresh_token'), 'newer-refresh');

  values.set('auth_token', oldAccess);
  values.set('auth_refresh_token', 'old-refresh');
  const reusedRefresh = refreshSession();
  values.set('auth_token', newerAccess);
  values.set('auth_refresh_token', 'newer-refresh');
  finish({ status: 401, ok: false });
  assert.equal(await reusedRefresh, newerAccess, 'a token rotated by another tab is still usable');

  values.set('auth_token', oldAccess);
  values.set('auth_refresh_token', 'old-refresh');
  const switchedUser = refreshSession();
  values.set('auth_token', jwt('user-b'));
  values.set('auth_refresh_token', 'other-refresh');
  finish(response);
  assert.equal(await switchedUser, null, 'a pending action must not switch accounts');

  values.set('auth_token', oldAccess);
  values.set('auth_refresh_token', 'old-refresh');
  const afterLogout = refreshSession();
  values.clear();
  finish(response);
  assert.equal(await afterLogout, null);
  assert.equal(values.size, 0, 'a late refresh cannot restore a logged-out session');
  console.log('Client session race checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
