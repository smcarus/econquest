import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRED_10Y_SERIES,
  fredApiUrl,
  fredCsvUrl,
  formatPeriod,
  parseFredApiLatest,
  parseFredCsvLatest,
} from '../src/utils/officialYields.ts';

test('CSV: latest numeric row, skipping "." gaps, both header styles', () => {
  const csv = 'observation_date,S\n2026-07-01,9.42\n2026-08-01,9.28\n2026-09-01,.\n';
  assert.deepEqual(parseFredCsvLatest(csv, 'S'), {
    valuePct: 9.28,
    period: '2026-08',
    source: 'OECD via FRED',
    seriesId: 'S',
    url: 'https://fred.stlouisfed.org/series/S',
  });
  assert.equal(parseFredCsvLatest('DATE,S\r\n2026-09-01,8.94714\r\n', 'S')?.valuePct, 8.95);
});

test('CSV: block pages and implausible values are rejected', () => {
  assert.equal(parseFredCsvLatest('<html>Access denied</html>', 'S'), null);
  assert.equal(parseFredCsvLatest('observation_date,S\n2026-09-01,999\n', 'S'), null);
  assert.equal(parseFredCsvLatest('observation_date,S\n', 'S'), null);
});

test('API: newest numeric observation, whatever the order', () => {
  const r = parseFredApiLatest(
    { observations: [{ date: '2026-07-01', value: '9.42' }, { date: '2026-09-01', value: '.' }, { date: '2026-08-01', value: '9.28' }] },
    'S'
  );
  assert.equal(r?.valuePct, 9.28);
  assert.equal(r?.period, '2026-08');
  assert.equal(r?.source, 'OECD via FRED API');
});

test('API: error replies are rejected', () => {
  assert.equal(parseFredApiLatest({ error_code: 400, error_message: 'Bad Request' }, 'S'), null);
  assert.equal(parseFredApiLatest(null, 'S'), null);
  assert.equal(parseFredApiLatest({ observations: [{ date: '2026-09-01', value: '-50' }] }, 'S'), null);
});

test('URLs and labels', () => {
  assert.equal(fredCsvUrl('S', new Date(2026, 10, 4)), 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=S&cosd=2024-11-01');
  const api = new URL(fredApiUrl('S', 'k&y'));
  assert.equal(api.searchParams.get('api_key'), 'k&y');
  assert.equal(api.searchParams.get('file_type'), 'json');
  assert.equal(formatPeriod('2026-09'), 'Sep 2026');
});

test('series map covers only verified OECD members', () => {
  assert.deepEqual(Object.keys(FRED_10Y_SERIES).sort(), ['CHL', 'GBR', 'JPN', 'MEX', 'POL', 'ZAF']);
  for (const id of Object.values(FRED_10Y_SERIES)) assert.match(id, /^IRLTLT01[A-Z]{2}M156N$/);
});
