import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWbLatest, parseWitsShare, rankScenario, scenarioImpact, wbIndicatorUrl, witsUrl } from '../src/utils/scenarioExposure.ts';

test('URLs: one World Bank call per indicator for all countries; WITS per partner and year', () => {
  assert.equal(wbIndicatorUrl(['BRA', 'TUR'], 'TM.VAL.FUEL.ZS.UN'), 'https://api.worldbank.org/v2/country/BRA;TUR/indicator/TM.VAL.FUEL.ZS.UN?format=json&mrnev=1&per_page=100');
  assert.equal(
    witsUrl('BRA', 'CHN', 'XPRT-PRTNR-SHR', 2023),
    'https://wits.worldbank.org/API/V1/SDMX/V21/datasource/tradestats-trade/reporter/bra/year/2023/partner/chn/product/all/indicator/XPRT-PRTNR-SHR'
  );
});

test('parsers: World Bank rows keyed by ISO3; WITS Obs value and year', () => {
  const m = parseWbLatest([{ page: 1 }, [{ countryiso3code: 'BRA', date: '2025', value: 11.09 }, { countryiso3code: 'EGY', date: '2025', value: null }]]);
  assert.deepEqual(m.get('BRA'), { value: 11.09, year: '2025' });
  assert.equal(m.has('EGY'), false);
  assert.deepEqual(parseWitsShare('<Series><Obs TIME_PERIOD="2023" OBS_VALUE="30.7112" DATASOURCE="WITS-CMT" /></Series>'), { pct: 30.7112, year: '2023' });
  assert.equal(parseWitsShare('<html>error</html>'), null);
});

test('scenarios: stated shocks on trade shares; exporters gain from Hormuz', () => {
  const importer = { fuelImportsPctMerch: 20, fuelExportsPctMerch: 5, importsPctGdp: 35, exportsPctGdp: 30, wbYear: '2025', chinaExportSharePct: 30, russiaExportSharePct: 4, russiaImportSharePct: 12.5, witsYear: '2023' };
  assert.equal(scenarioImpact('hormuz', importer)!.pctGdp, -2.75); // 0.5 x (7 - 1.5)
  assert.equal(scenarioImpact('taiwan', importer)!.pctGdp, -1.8); // 0.2 x 9
  assert.equal(scenarioImpact('russia', importer)!.pctGdp, -2.79); // 0.5 x (1.2 + 4.375)
  const exporter = { fuelImportsPctMerch: 5, fuelExportsPctMerch: 60, importsPctGdp: 20, exportsPctGdp: 40, wbYear: '2025' };
  assert.ok(scenarioImpact('hormuz', exporter)!.pctGdp > 0);
  assert.equal(scenarioImpact('taiwan', exporter), null); // no China share: says so, no guess
  const ranked = rankScenario('hormuz', [
    { iso3: 'X', countryName: 'Exporter', trade: exporter },
    { iso3: 'I', countryName: 'Importer', trade: importer },
    { iso3: 'N', countryName: 'No data' },
  ]);
  assert.deepEqual(ranked.map((r) => r.iso3), ['I', 'X']);
});
