/**
 * Console integration item 1: stable identifiers. Countries by ISO alpha-2 and alpha-3 everywhere;
 * holdings by ISIN, LEI, CIK or ticker plus the caller's own entity ID, given back unchanged.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ISO3_TO_ISO2, countryCodes, iso2For, iso3FromCode } from '../src/data/iso3166Alpha2.ts';
import { ISO3_COUNTRIES } from '../src/data/iso3166.ts';
import { normaliseCountryPath, normaliseCountryQuery, normaliseCountryUrl } from '../src/server/countryCodes.ts';
import { interpolateIsoTemplate } from '../src/server/integrations.ts';
import { isCik, isIsin, isLei, isinCheckDigit, parseSecurityIds, idsLabel } from '../src/utils/securityIds.ts';
import { holdingsToCsv, parseHoldingsCsv, HOLDINGS_TEMPLATE_CSV } from '../src/utils/holdings.ts';

test('every ISO alpha-3 country the app knows has an alpha-2 code, and the codes are unique', () => {
  for (const iso3 of ISO3_COUNTRIES) assert.match(iso2For(iso3) || '', /^[A-Z]{2}$/, iso3);
  const official = Object.entries(ISO3_TO_ISO2).filter(([k]) => k !== 'UVK' && k !== 'XKX');
  assert.equal(official.length, 249);
  assert.equal(new Set(official.map(([, v]) => v)).size, 249);
});

test('alpha-2 and alpha-3 both resolve to the app code; anything else does not', () => {
  assert.equal(iso3FromCode('br'), 'BRA');
  assert.equal(iso3FromCode('BRA'), 'BRA');
  assert.equal(iso3FromCode('AT'), 'AUT');
  assert.equal(iso3FromCode('AU'), 'AUS');
  assert.equal(iso3FromCode('XK'), 'UVK');
  assert.equal(iso3FromCode('ZZ'), null);
  assert.equal(iso3FromCode('WLD'), null);
  assert.equal(iso3FromCode(''), null);
  assert.deepEqual(countryCodes('gbr'), { iso2: 'GB', iso3: 'GBR' });
  assert.deepEqual(countryCodes('WORLD'), { iso2: null, iso3: 'WORLD' });
});

test('addresses that name a country accept alpha-2; other addresses are untouched', () => {
  assert.equal(normaliseCountryPath('/api/series/BR'), '/api/series/BRA');
  assert.equal(normaliseCountryPath('/api/series/mx/policy_rate'), '/api/series/MEX/policy_rate');
  assert.equal(normaliseCountryPath('/api/export/TR/figures.csv'), '/api/export/TUR/figures.csv');
  assert.equal(normaliseCountryPath('/api/v1/integration/bundle/ZA'), '/api/v1/integration/bundle/ZAF');
  assert.equal(normaliseCountryPath('/api/series/BRA'), '/api/series/BRA');
  assert.equal(normaliseCountryPath('/api/series/world'), '/api/series/world');
  assert.equal(normaliseCountryPath('/api/series/ZZ'), '/api/series/ZZ');
  assert.equal(normaliseCountryPath('/api/settings/ab'), '/api/settings/ab');
  assert.equal(normaliseCountryUrl('/api/panel?countries=BR,MEX,tr&figures=policy_rate'), '/api/panel?countries=BRA%2CMEX%2CTUR&figures=policy_rate');
  assert.equal(normaliseCountryUrl('/api/panel?countries=BRA&figures=x'), '/api/panel?countries=BRA&figures=x');
  assert.deepEqual(normaliseCountryQuery({ iso3: 'EG', other: 'BR' }), { iso3: 'EGY', other: 'BR' });
  assert.equal(normaliseCountryQuery({ iso3: 'EGY' }), null);
});

test('webhook address templates get the real alpha-2 code (Austria is AT, not AU)', () => {
  assert.equal(interpolateIsoTemplate('https://x/{{ISO2}}/{{ISO3}}', 'AUT'), 'https://x/AT/AUT');
  assert.equal(interpolateIsoTemplate('{{ ISO2 }}', 'CHE'), 'CH');
});

test('ISIN, LEI and CIK checks follow the standards', () => {
  assert.ok(isIsin('US0378331005'));
  assert.ok(isIsin('BRSTNCNTF1Q6'));
  assert.ok(isIsin('XS2010028939'));
  assert.ok(!isIsin('US0378331006'), 'wrong check digit');
  assert.ok(!isIsin('US037833100'), 'too short');
  assert.equal(isinCheckDigit('US037833100'), 5);
  assert.ok(isLei('HWUPKR0MPOU8FGXBT394'));
  assert.ok(isLei('549300MLUDYVRQOOXS22'));
  assert.ok(!isLei('HWUPKR0MPOU8FGXBT395'));
  assert.ok(isCik('320193'));
  assert.ok(!isCik('0'));
  assert.ok(!isCik('12345678901'));
});

test('identifiers are tidied, the entity ID is kept exactly as sent, and bad ones say why', () => {
  const ok = parseSecurityIds({ isin: ' us0378331005 ', lei: 'hwupkr0mpou8fgxbt394', cik: '320193', ticker: 'aapl.o', entityId: '  Pos 17/ä ' });
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(ok.ids, { isin: 'US0378331005', lei: 'HWUPKR0MPOU8FGXBT394', cik: '0000320193', ticker: 'AAPL.O', entityId: '  Pos 17/ä ' });
  assert.equal(idsLabel(ok.ids), 'ISIN US0378331005 · LEI HWUPKR0MPOU8FGXBT394 · CIK 0000320193 · Ticker AAPL.O · ID   Pos 17/ä ');
  assert.deepEqual(parseSecurityIds({}).ids, {});
  assert.deepEqual(parseSecurityIds({ isin: '', ticker: null }).ids, {});
  const bad = parseSecurityIds({ isin: 'US0378331006', lei: 'X', cik: 'abc', ticker: '$$$', entityId: 'x'.repeat(129) }, 'Position 2');
  assert.equal(bad.errors.length, 5);
  assert.match(bad.errors[0], /^Position 2: isin "US0378331006" is not a valid ISIN/);
  assert.deepEqual(bad.ids, {});
  assert.match(parseSecurityIds({ entityId: { a: 1 } as unknown as string }).errors[0], /entityId must be text/);
});

test('holdings CSV reads identifier columns, round-trips them, and leaves a plain book as before', () => {
  const csv = 'country,instrument,type,side,notional_usd_mm,duration,isin,lei,ticker,entity_id\nBRA,BRAZIL 2034,hc_bond,long,25,6.8,US105756CA66,,,book-1/pos-9\nMEX,,lc_bond,long,10,,,,MBONO31 MM,';
  const r = parseHoldingsCsv(csv, [{ iso3: 'BRA', countryName: 'Brazil' }, { iso3: 'MEX', countryName: 'Mexico' }]);
  assert.deepEqual(r.errors, []);
  assert.equal(r.holdings[0].isin, 'US105756CA66');
  assert.equal(r.holdings[0].entityId, 'book-1/pos-9');
  assert.equal(r.holdings[1].ticker, 'MBONO31 MM');
  assert.equal(r.holdings[1].isin, undefined);
  const out = holdingsToCsv(r.holdings);
  assert.equal(out.split('\n')[0], 'country,instrument,type,side,notional_usd_mm,duration,isin,ticker,entity_id');
  const again = parseHoldingsCsv(out, [{ iso3: 'BRA', countryName: 'Brazil' }, { iso3: 'MEX', countryName: 'Mexico' }]);
  assert.deepEqual(again.holdings.map((h) => [h.isin, h.ticker, h.entityId]), r.holdings.map((h) => [h.isin, h.ticker, h.entityId]));
  // An ISIN column with no instrument column names the position by its ISIN.
  const isinOnly = parseHoldingsCsv('country,isin,notional_usd_mm\nBRA,US105756CA66,5', [{ iso3: 'BRA', countryName: 'Brazil' }]);
  assert.equal(isinOnly.holdings[0].instrument, 'US105756CA66');
  // A bad identifier stops that row, with the row number.
  const bad = parseHoldingsCsv('country,notional_usd_mm,isin\nBRA,5,US0000000000', [{ iso3: 'BRA', countryName: 'Brazil' }]);
  assert.equal(bad.holdings.length, 0);
  assert.match(bad.errors[0], /^Row 2: isin/);
  // The template has no identifier columns, and exports without them.
  const plain = parseHoldingsCsv(HOLDINGS_TEMPLATE_CSV, [{ iso3: 'BRA', countryName: 'Brazil' }, { iso3: 'MEX', countryName: 'Mexico' }, { iso3: 'TUR', countryName: 'Turkey' }, { iso3: 'ZAF', countryName: 'South Africa' }]);
  assert.equal(holdingsToCsv(plain.holdings).split('\n')[0], 'country,instrument,type,side,notional_usd_mm,duration');
});
