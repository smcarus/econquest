import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPITALS, monthlyNormals, nasaPowerUrl, parseNasaPower, weatherSeries, type WeatherPull } from '../src/utils/weatherPower.ts';
import { ISO_NUMERIC_TO_ISO3 } from '../src/data/worldCountries.ts';
import { seriesTags } from '../src/utils/seriesDefinitions.ts';

test('every country on the map has a capital with coordinates in range', () => {
  for (const { iso3 } of Object.values(ISO_NUMERIC_TO_ISO3)) {
    const c = CAPITALS[iso3];
    assert.ok(c, `no capital for ${iso3}`);
    assert.ok(Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180, iso3);
  }
  assert.equal(nasaPowerUrl(CAPITALS.KEN, 1981, 2026), 'https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR&community=AG&latitude=-1.29&longitude=36.82&start=1981&end=2026&format=JSON');
});

test('parseNasaPower: month 13 and -999 are skipped; rainfall in mm/day becomes the month total', () => {
  const got = parseNasaPower({
    header: { api: { version: 'v2.5.22' } },
    parameters: { T2M: { units: 'C' }, PRECTOTCORR: { units: 'mm/day' } },
    properties: { parameter: { T2M: { '202402': 20.5, '202403': -999, '202413': 21 }, PRECTOTCORR: { '202402': 2, '202404': 1.5 } } },
  })!;
  assert.deepEqual(got.temp, { '2024-02': 20.5 });
  assert.deepEqual(got.rain, { '2024-02': 58, '2024-04': 45 }, '2 mm/day x 29 days (leap year); 1.5 x 30');
  assert.equal(got.version, 'v2.5.22');
  assert.deepEqual(parseNasaPower({ properties: { parameter: { PRECTOTCORR: { '202401': 31 } } }, parameters: { PRECTOTCORR: { units: 'mm' } } })!.rain, { '2024-01': 31 }, 'a month total is kept as it is');
  assert.equal(parseNasaPower({ messages: ['bad request'] }), null);
});

test('monthlyNormals needs 25 of the 30 years 1991-2020 for a calendar month', () => {
  const v: Record<string, number> = {};
  for (let y = 1991; y <= 2020; y++) v[`${y}-01`] = y % 2 ? 10 : 12;
  for (let y = 1991; y <= 2014; y++) v[`${y}-02`] = 5; // 24 years only
  v['1990-01'] = 99; // outside the period
  const n = monthlyNormals(v);
  assert.equal(n['01'], 11);
  assert.equal(n['02'], undefined);
});

test('weatherSeries: four series with the anomaly and % of normal; Missing with the reason otherwise', () => {
  const temp: Record<string, number> = {};
  const rain: Record<string, number> = {};
  for (let y = 1991; y <= 2020; y++) {
    temp[`${y}-07`] = 25;
    rain[`${y}-07`] = 100;
  }
  temp['2025-07'] = 26.5;
  rain['2025-07'] = 40;
  rain['2025-08'] = 10; // no August normal
  const pull: WeatherPull = { iso3: 'KEN', pulledAt: '2026-11-14T00:00:00Z', capital: CAPITALS.KEN, temp, rain, version: 'v2.5.22' };
  const set = weatherSeries('KEN', pull);
  const by = Object.fromEntries(set.map((s) => [s.id, s]));
  const pts = (id: string) => (by[id] as { points: Array<{ date: string; value: number }> }).points;
  assert.equal(pts('weather_temp').at(-1)!.value, 26.5);
  assert.deepEqual(pts('weather_temp_anom').at(-1), { date: '2025-07', value: 1.5 });
  assert.deepEqual(pts('weather_rain_pct').at(-1), { date: '2025-07', value: 40 });
  assert.equal(pts('weather_rain').at(-1)!.date, '2025-08');
  assert.match((by.weather_temp as { source: string }).source, /NASA POWER.*v2\.5\.22; Nairobi -1\.29, 36\.82/);

  const none = weatherSeries('KEN', null);
  assert.equal(none.length, 4);
  assert.ok(none.every((s) => 'reason' in s && s.reason === 'NASA POWER has not answered yet'));
  assert.match((weatherSeries('XXX', null)[0] as { reason: string }).reason, /No capital city on file/);
  const short = weatherSeries('KEN', { ...pull, temp: { '2025-07': 26 }, rain: {} });
  const sb = Object.fromEntries(short.map((s) => [s.id, s]));
  assert.match((sb.weather_temp_anom as { reason: string }).reason, /Fewer than 25 of the 30 years/);
  assert.equal((sb.weather_rain as { reason: string }).reason, 'NASA POWER gave no rainfall for this point');
});

test('the weather series carry their definitions and units', () => {
  for (const id of ['weather_temp', 'weather_temp_anom', 'weather_rain', 'weather_rain_pct']) {
    const t = seriesTags({ id });
    assert.notEqual(t.definition, 'Not stated yet', id);
  }
});
