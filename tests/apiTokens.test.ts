/** Console integration item 2: scoped API tokens (src/utils/apiTokens.ts, apiTokenStore.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LEGACY_SCOPES, SCOPES, hashSecret, scopeFor, scopesProblem, tokenIdFrom, tokenNameProblem, tokenOnly } from '../src/utils/apiTokens.ts';
import { ApiTokenStore, apiTokensFile } from '../src/utils/apiTokenStore.ts';
import { SCOPE_LABEL } from '../src/utils/apiTokenScopes.ts';

test('the six scopes, each with a label; the legacy key has the three read scopes', () => {
  assert.deepEqual([...SCOPES], ['read:data', 'read:council', 'read:events', 'write:holdings', 'write:exclusions', 'run:scenarios']);
  for (const s of SCOPES) assert.ok(SCOPE_LABEL[s]);
  assert.deepEqual([...LEGACY_SCOPES], ['read:data', 'read:council', 'read:events']);
});

test('every address maps to one scope, and anything unlisted is closed to tokens', () => {
  assert.equal(scopeFor('GET', '/api/series/BRA'), 'read:data');
  assert.equal(scopeFor('GET', '/api/export/BRA/figures.csv?asOf=2026-01-01'), 'read:data');
  assert.equal(scopeFor('GET', '/api/v1/countries/BRA/snapshot'), 'read:data');
  assert.equal(scopeFor('GET', '/api/v1/integration/bundle/BRA'), 'read:council');
  assert.equal(scopeFor('POST', '/api/v1/integration/publish'), null);
  assert.equal(scopeFor('GET', '/api/v1/integration/stream'), 'read:events');
  assert.equal(scopeFor('POST', '/api/v1/watches'), 'read:events');
  assert.equal(scopeFor('PUT', '/api/v1/holdings'), 'write:holdings');
  assert.equal(scopeFor('GET', '/api/v1/holdings'), 'write:holdings');
  assert.equal(scopeFor('DELETE', '/api/v1/exclusions/x'), 'write:exclusions');
  assert.equal(scopeFor('POST', '/api/v1/scenarios/run'), 'run:scenarios');
  for (const p of ['/api/audit', '/api/settings/keys', '/api/settings/api-tokens', '/api/backup/download', '/api/workspace/x']) assert.equal(scopeFor('GET', p), null, p);
  assert.equal(scopeFor('POST', '/api/panel'), null);
  assert.ok(tokenOnly('/api/v1/holdings'));
  assert.ok(!tokenOnly('/api/v1/integration/bundle/BRA'));
  assert.ok(!tokenOnly('/api/series/BRA'));
});

test('names and scopes are checked with reasons', () => {
  assert.match(tokenNameProblem('') || '', /Give the token a name/);
  assert.match(tokenNameProblem('x'.repeat(61)) || '', /under 60/);
  assert.equal(tokenNameProblem('Console'), null);
  assert.match(scopesProblem([]) || '', /at least one/);
  assert.match(scopesProblem(['read:data', 'admin']) || '', /Unknown scope: admin/);
  assert.equal(scopesProblem(['read:data']), null);
  assert.equal(tokenIdFrom('eqt_0123456789ab_' + 'a'.repeat(43)), '0123456789ab');
  assert.equal(tokenIdFrom('smcr_abc'), null);
});

test('the store keeps hashes only, resolves active tokens, and refuses revoked or altered ones', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'eq-tokens-'));
  try {
    const store = new ApiTokenStore(apiTokensFile(dir));
    const made = store.create({ name: 'Console', scopes: ['read:data', 'read:data', 'run:scenarios'], createdBy: 'this computer' });
    assert.ok(!('error' in made));
    if ('error' in made) return;
    assert.deepEqual(made.token.scopes, ['read:data', 'run:scenarios']);
    const file = readFileSync(apiTokensFile(dir), 'utf8');
    assert.ok(file.includes(hashSecret(made.secret)));
    assert.ok(!file.includes(made.secret.slice(17)));
    if (process.platform !== 'win32') assert.equal(statSync(apiTokensFile(dir)).mode & 0o777, 0o600);
    assert.equal(store.resolve(made.secret)?.id, made.token.id);
    const altered = made.secret.slice(0, -1) + (made.secret.endsWith('A') ? 'B' : 'A');
    assert.equal(store.resolve(altered), null);
    // A fresh store (a restart) reads the same file.
    assert.equal(new ApiTokenStore(apiTokensFile(dir)).resolve(made.secret)?.name, 'Console');
    assert.ok('error' in store.create({ name: 'console', scopes: ['read:data'], createdBy: 'x' }), 'unique names, any case');
    store.revoke(made.token.id, 'Sam (sam)');
    assert.equal(store.resolve(made.secret), null);
    assert.equal(store.list()[0].revokedBy, 'Sam (sam)');
    assert.ok(!('error' in store.create({ name: 'Console', scopes: ['read:data'], createdBy: 'x' })), 'a revoked name can be reused');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
