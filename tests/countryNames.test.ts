import { test } from 'node:test';
import assert from 'node:assert/strict';
import { englishCountryName, NOT_PICKABLE, pickableCountries } from '../src/utils/countryNames.ts';
import { ISO_NUMERIC_TO_ISO3 } from '../src/data/worldCountries.ts';
import { DSA_LIST } from '../src/utils/lowIncomeDebt.ts';

test('Add a country: small countries left off the world map can be picked', () => {
  const iso = new Set(pickableCountries('en').map((c) => c.iso3));
  for (const c of ['MWI', 'SLE', 'HTI', 'RWA', 'BDI', 'LBR', 'FJI', 'MDV', 'JAM', 'TUV', 'STP', 'COM']) assert.ok(iso.has(c), `${c} can be picked`);
  for (const c of Object.values(ISO_NUMERIC_TO_ISO3)) assert.ok(iso.has(c.iso3) || NOT_PICKABLE.has(c.iso3), `${c.iso3} from the map is still listed`);
  for (const row of DSA_LIST) assert.ok(iso.has(row.iso3), `${row.iso3} on the IMF low-income debt list can be picked`);
  assert.ok(!iso.has('ATA') && !iso.has('XKX'));
  assert.ok(iso.has('UVK'), 'Kosovo under the code the feeds use');
});

test('Add a country: English names saved, the page language shown, map names kept', () => {
  assert.equal(englishCountryName('COD'), 'DR Congo');
  assert.equal(englishCountryName('MWI'), 'Malawi');
  const es = pickableCountries('es').find((c) => c.iso3 === 'MWI')!;
  assert.equal(es.englishName, 'Malawi');
  assert.notEqual(es.name, 'MWI');
  const names = pickableCountries('en').map((c) => c.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, 'en')));
  assert.equal(new Set(names).size, names.length, 'no name twice');
});

test('Built-in countries: every country on the IMF low-income debt list is built in once, with a currency', async () => {
  const { SOVEREIGN_CATALOG } = await import('../src/data/presetsAndBaselines.ts');
  const iso = SOVEREIGN_CATALOG.map((c) => c.iso3);
  assert.equal(new Set(iso).size, iso.length, 'no country twice');
  for (const row of DSA_LIST) assert.ok(iso.includes(row.iso3), `${row.iso3} is built in`);
  assert.equal(iso.length, 94);
  for (const c of SOVEREIGN_CATALOG) {
    assert.match(c.currencyCode, /^[A-Z]{3}$/, `${c.iso3} currency`);
    assert.ok(Number.isNaN(c.debtToGdpPct) && Number.isNaN(c.yield10YPct), `${c.iso3} has no built-in figure`);
  }
});

test('Daily download: a low-income list country is saved only once it is on a watchlist or added', async () => {
  const { watchedCountries } = await import('../src/utils/addedCountries.ts');
  const { LOW_INCOME_DEBT_ADDED_ISO3 } = await import('../src/data/lowIncomeCatalog.ts');
  const { catalogEntry } = await import('../src/data/presetsAndBaselines.ts');
  const follow = new Set(LOW_INCOME_DEBT_ADDED_ISO3);
  assert.equal(watchedCountries([], follow).size, 0, 'a fresh install follows none of them');
  const values = [
    { sovereign_council_watchlists_v1: JSON.stringify([{ id: 'a', items: [{ iso3: 'MWI' }, { iso3: 'BRA' }] }, { id: 'b', items: [{ iso3: 'hti' }] }]) },
    { econquest_custom_sovereigns_v1: JSON.stringify([{ iso3: 'SLE', countryName: 'Sierra Leone' }]), sovereign_council_watchlists_v1: 'not json' },
  ];
  assert.deepEqual([...watchedCountries(values, follow)].sort(), ['HTI', 'MWI', 'SLE']);
  assert.equal(catalogEntry('MWI')?.countryName, 'Malawi');
  assert.equal(catalogEntry('MWI')?.currencyCode, 'MWK');
});
