import test from 'node:test';
import assert from 'node:assert/strict';
import { cckpUrl, countryWeatherSeries, CRU_VERSIONS, parseCckp, type CountryWeatherPull } from '../src/utils/weatherCountry.ts';
import { seriesTags } from '../src/utils/seriesDefinitions.ts';

test('cckpUrl asks for temperature and rainfall together, newest CRU TS version first', () => {
  assert.equal(CRU_VERSIONS[0].version, '4.10');
  assert.equal(cckpUrl('ken', CRU_VERSIONS[0]), 'https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_tas,pr_timeseries_monthly_1901-2025_mean_historical_cru_ts4.10_mean/KEN?_format=json');
});

test('parseCckp: data -> variable -> country -> YYYY-MM; fills and bad keys skipped; empty data means no series', () => {
  const got = parseCckp({ metadata: { status: 'success' }, data: { tas: { KEN: { '1901-01': 19.234, '1901-02': 1e20, '1901-13': 5, annual: 3 } }, pr: { KEN: { '1901-01': 45.6 } } } }, 'ken')!;
  assert.deepEqual(got.temp, { '1901-01': 19.23 });
  assert.deepEqual(got.rain, { '1901-01': 45.6 });
  assert.deepEqual(parseCckp({ metadata: { status: 'success' }, data: [] }, 'KEN'), { temp: {}, rain: {} });
  assert.deepEqual(parseCckp({ metadata: { status: 'success' }, data: { KEN: { '2000-05': 20 } } }, 'KEN')!.temp, { '2000-05': 20 }, 'one variable: data -> country');
  assert.equal(parseCckp({ metadata: { status: 'error' }, data: {} }, 'KEN'), null);
  assert.equal(parseCckp({ message: 'not found' }, 'KEN'), null);
});

test('countryWeatherSeries: four series against 1991-2020, with the CRU version in the source; Missing otherwise', () => {
  const temp: Record<string, number> = {};
  const rain: Record<string, number> = {};
  for (let y = 1991; y <= 2020; y++) {
    temp[`${y}-03`] = 20;
    rain[`${y}-03`] = 80;
  }
  temp['2025-03'] = 19;
  rain['2025-03'] = 120;
  const pull: CountryWeatherPull = { iso3: 'KEN', pulledAt: '2026-11-14T00:00:00Z', version: '4.10', temp, rain };
  const by = Object.fromEntries(countryWeatherSeries(pull).map((s) => [s.id, s]));
  const last = (id: string) => (by[id] as { points: Array<{ date: string; value: number }> }).points.at(-1);
  assert.deepEqual(last('country_temp_anom'), { date: '2025-03', value: -1 });
  assert.deepEqual(last('country_rain_pct'), { date: '2025-03', value: 150 });
  assert.match((by.country_temp as { source: string }).source, /Climate Change Knowledge Portal.*CRU TS 4\.10/);

  const none = countryWeatherSeries(null);
  assert.equal(none.length, 4);
  assert.ok(none.every((s) => 'reason' in s && s.reason === 'The World Bank climate portal has not answered yet'));
  const short = Object.fromEntries(countryWeatherSeries({ ...pull, temp: { '2025-03': 19 }, rain: {} }).map((s) => [s.id, s]));
  assert.match((short.country_temp_anom as { reason: string }).reason, /Fewer than 25 of the 30 years 1991-2020 in the World Bank series/);
  assert.equal((short.country_rain as { reason: string }).reason, 'The World Bank climate portal has no rainfall series for this country');
});

test('the country weather series carry their definitions', () => {
  for (const id of ['country_temp', 'country_temp_anom', 'country_rain', 'country_rain_pct']) assert.notEqual(seriesTags({ id }).definition, 'Not stated yet', id);
});
