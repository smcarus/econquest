/**
 * docs/openapi.json: the description outside systems read. It must parse, every documented data
 * address must be in it, and every country in it is described by both ISO codes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DATA_API } from '../src/server/dataApi.ts';

const root = path.resolve(import.meta.dirname, '..');
const spec = JSON.parse(readFileSync(path.join(root, 'docs/openapi.json'), 'utf-8'));
const toOpenApi = (p: string) => p.replace(/:([A-Za-z0-9]+)/g, '{$1}').replace('.csv', '.csv');

test('the OpenAPI file parses and is version 3.1', () => {
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.info.title && spec.info.version);
});

test('the main data addresses and every integration address are described', () => {
  const paths = Object.keys(spec.paths);
  for (const p of ['/api/series/:iso3', '/api/series/:iso3/:id', '/api/panel', '/api/export/:iso3/figures.csv']) {
    assert.ok(DATA_API.some((a) => a.path === p), `${p} is a data address`);
    assert.ok(paths.includes(toOpenApi(p)), `${p} in openapi.json`);
  }
  for (const p of ['/api/v1/integration/desks/{iso3}', '/api/v1/integration/bundle/{iso3}', '/api/v1/integration/publish', '/api/v1/integration/stream']) {
    assert.ok(paths.includes(p), p);
  }
});

test('countries are described by both codes, and holdings by their identifiers', () => {
  assert.deepEqual(spec.components.schemas.CountryCodes.required, ['iso2', 'iso3']);
  assert.match(spec.components.parameters.Country.description, /alpha-2/);
  const ids = spec.components.schemas.SecurityIds.properties;
  for (const k of ['isin', 'lei', 'cik', 'ticker', 'entityId']) assert.ok(ids[k], k);
  assert.equal(ids.entityId.maxLength, 128);
});

test('the file has no AI-provider or build-tool branding', () => {
  const text = readFileSync(path.join(root, 'docs/openapi.json'), 'utf-8');
  assert.doesNotMatch(text, /claude|anthropic|ai studio/i);
});

test('each address open to tokens names its scope, matching the server table', async () => {
  const { scopeFor } = await import('../src/utils/apiTokens.ts');
  assert.ok(spec.components.securitySchemes.ApiToken);
  for (const [p, item] of Object.entries(spec.paths as Record<string, Record<string, { 'x-scope'?: string }>>)) {
    for (const [method, op] of Object.entries(item)) {
      const sample = p.replace('{iso3}', 'BRA').replace('{id}', 'policy_rate');
      assert.equal(op['x-scope'] ?? null, scopeFor(method, sample), `${method} ${p}`);
    }
  }
});
