/**
 * Hidden names (console integration item 8): values are checked and normalised, the list keeps
 * fingerprints only, and addresses and query lists about a hidden country are caught.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { holdingNames, normaliseHidden, hiddenNote } from '../src/utils/exclusions';
import { ExclusionStore } from '../src/server/exclusionStore';
import { countryInPath, withoutHiddenCountries } from '../src/server/countryCodes';

test('names are checked and normalised the way positions are named', () => {
  assert.deepEqual(normaliseHidden('country', 'br'), { value: 'BRA' });
  assert.deepEqual(normaliseHidden('cik', '320193'), { value: '0000320193' });
  assert.deepEqual(normaliseHidden('isin', 'us0378331005'), { value: 'US0378331005' });
  assert.ok('error' in normaliseHidden('isin', 'US0378331006'));
  assert.ok('error' in normaliseHidden('country', 'Atlantis'));
  assert.deepEqual(normaliseHidden('entity_id', ' Desk A/1 '), { value: 'Desk A/1' });
  assert.deepEqual(holdingNames({ iso3: 'MEX', cik: '320193', entityId: 'p1' }).map((n) => n.kind), ['country', 'cik', 'entity_id']);
  assert.equal(hiddenNote(1), '1 item hidden');
  assert.equal(hiddenNote(3), '3 items hidden');
});

test('the store keeps fingerprints only; add, remove and replace are all or nothing', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'econquest-hidden-'));
  try {
    const file = ExclusionStore.fileIn(dir);
    const store = new ExclusionStore(file);
    assert.deepEqual(store.add([{ kind: 'country', value: 'MX' }, { kind: 'isin', value: 'US0378331005' }]), { added: 2, already: 0 });
    assert.deepEqual(store.add([{ kind: 'country', value: 'MEX' }]), { added: 0, already: 1 });
    const bad = store.add([{ kind: 'country', value: 'TR' }, { kind: 'isin', value: 'nope' }]);
    assert.ok('errors' in bad);
    assert.equal(store.count(), 2, 'nothing added when one name is wrong');
    assert.ok('errors' in bad && !bad.errors.join(' ').includes('nope'), 'a refused name is not echoed back');
    const text = readFileSync(file, 'utf8');
    assert.ok(!text.includes('MEX') && !text.includes('US0378331005'), 'no names on disk');
    assert.equal(store.countryHidden('MEX'), true);
    assert.equal(store.countryHidden('BRA'), false);
    assert.equal(store.holdingHidden({ iso3: 'USA', isin: 'us0378331005' }), true);
    assert.equal(store.holdingHidden({ iso3: 'BRA', isin: 'US105756CE88' }), false);
    assert.deepEqual(store.view().byKind, { country: 1, isin: 1 });
    assert.deepEqual(store.remove([{ kind: 'country', value: 'mx' }]), { removed: 1 });
    assert.deepEqual(store.replace([{ kind: 'ticker', value: 'aapl' }]), { count: 1 });
    assert.equal(store.isHidden('ticker', 'AAPL'), true);
    assert.equal(store.removeById(store.list()[0]!.id), true);
    assert.equal(store.count(), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('addresses and query lists about a country are caught', () => {
  assert.equal(countryInPath('/api/v1/countries/MEX/snapshot'), 'MEX');
  assert.equal(countryInPath('/api/series/MEX/policy_rate'), 'MEX');
  assert.equal(countryInPath('/api/export/MEX/figures.csv'), 'MEX');
  assert.equal(countryInPath('/api/v1/integration/bundle/MEX'), 'MEX');
  assert.equal(countryInPath('/api/panel'), null);
  const r = withoutHiddenCountries({ countries: 'BRA,MEX,TUR', other: 'x' }, (c) => c === 'MEX');
  assert.deepEqual(r, { query: { countries: 'BRA,TUR', other: 'x' }, removed: 1 });
  assert.equal(withoutHiddenCountries({ countries: 'BRA' }, () => false), null);
});
