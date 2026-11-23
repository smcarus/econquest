import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchEntries, parseDbnomicsSearch, parseEurostatToc, parseImfIndicators, parseWbIndicators, queryWords } from '../src/utils/catalogueSearch.ts';

test('DBnomics search reply: provider/dataset codes, series counts and links', () => {
  const r = parseDbnomicsSearch({ results: { docs: [{ provider_code: 'IMF', provider_name: 'International Monetary Fund', code: 'CPI', name: 'Consumer Price Index', nb_series: 1200 }, { code: 'x' }] } });
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], { source: 'dbnomics', code: 'IMF/CPI', title: 'Consumer Price Index', group: 'International Monetary Fund', series: 1200, url: 'https://db.nomics.world/IMF/CPI' });
  assert.deepEqual(parseDbnomicsSearch(null), []);
});

test('IMF, World Bank and Eurostat lists', () => {
  const imf = parseImfIndicators({ indicators: { NGDP_RPCH: { label: 'Real GDP growth', dataset: 'WEO' }, '': { label: 'x' }, BAD: { label: ' ' } } });
  assert.deepEqual(imf.map((e) => e.code), ['NGDP_RPCH']);
  const wb = parseWbIndicators([{ page: 1 }, [{ id: 'BX.TRF.PWKR.DT.GD.ZS', name: 'Personal remittances, received (% of GDP)', source: { value: 'World Development Indicators' } }]]);
  assert.equal(wb[0].url, 'https://data.worldbank.org/indicator/BX.TRF.PWKR.DT.GD.ZS');
  const toc = '"title"\t"code"\t"type"\t"last update of data"\n"Database by themes"\t"data"\t"folder"\t""\n"    House price index (2015 = 100) - quarterly data"\t"prc_hpi_q"\t"dataset"\t"01.10.2026"\n"    House price index (2015 = 100) - quarterly data"\t"prc_hpi_q"\t"dataset"\t"01.10.2026"\n"   HICP - monthly data"\t"teicp000"\t"table"\t""';
  const eu = parseEurostatToc(toc);
  assert.deepEqual(eu.map((e) => e.code), ['prc_hpi_q', 'teicp000']);
  assert.equal(eu[0].title, 'House price index (2015 = 100) - quarterly data');
});

test('word match: every word must appear; exact codes first; short words ignored', () => {
  const list = parseWbIndicators([{}, [
    { id: 'BX.TRF.PWKR.DT.GD.ZS', name: 'Personal remittances, received (% of GDP)' },
    { id: 'BX.TRF.PWKR.CD.DT', name: 'Personal remittances, received (current US$)' },
    { id: 'NY.GDP.MKTP.KD.ZG', name: 'GDP growth (annual %)' },
  ]]);
  assert.deepEqual(matchEntries(list, 'remittances gdp').map((e) => e.code), ['BX.TRF.PWKR.DT.GD.ZS']);
  assert.equal(matchEntries(list, 'ny.gdp.mktp.kd.zg')[0].code, 'NY.GDP.MKTP.KD.ZG');
  assert.deepEqual(queryWords('a GDP of Kenya'), ['gdp', 'of', 'kenya']);
  assert.deepEqual(matchEntries(list, 'x'), []);
});
