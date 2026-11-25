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
