import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWgiCode, wbReplyHasRows, wgiUrls } from '../src/utils/wgiCodes';

test('WGI codes are tried as GOV_WGI_<code> in source 3 first, then without the source, then the old code', () => {
  assert.deepEqual(wgiUrls('BRA', 'PV.EST', 'format=json&per_page=6'), [
    'https://api.worldbank.org/v2/country/BRA/indicator/GOV_WGI_PV.EST?source=3&format=json&per_page=6',
    'https://api.worldbank.org/v2/country/BRA/indicator/GOV_WGI_PV.EST?format=json&per_page=6',
    'https://api.worldbank.org/v2/country/BRA/indicator/PV.EST?format=json&per_page=6',
  ]);
  assert.ok(isWgiCode('CC.EST') && !isWgiCode('FI.RES.TOTL.MO'));
});

test('the "indicator was not found" reply recorded on 5 November has no rows', async () => {
  const { readFileSync } = await import('node:fs');
  const { gunzipSync } = await import('node:zlib');
  const body = JSON.parse(gunzipSync(readFileSync('tests/fixtures/recorded-public/bodies/3ce46446780291d0.gz')).toString('utf8'));
  assert.match(JSON.stringify(body), /The indicator was not found/);
  assert.equal(wbReplyHasRows(body), false);
  assert.equal(wbReplyHasRows([{ page: 1, pages: 1 }, [{ countryiso3code: 'BRA', date: '2024', value: -0.4 }]]), true);
});
