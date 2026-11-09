import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countrySeries, commoditySeries, seriesSummary, type Series } from '../src/utils/seriesHistory';
import { allTagTexts, COVERAGE, CURRENCY, MEASURE, SEASONAL, seriesTags, TAG_COLUMNS } from '../src/utils/seriesDefinitions';
import { SERIES_HEADER, seriesRows } from '../src/utils/csvExport';
import { spfWorldSeries } from '../src/utils/inflationSurveys';
import { chokepointWorldSeries } from '../src/utils/portWatch';
import { stressWorldSeries } from '../src/utils/stressIndices';

/** Every id the country and world series can carry, found or missing. */
function everyId(): string[] {
  const ids = new Set<string>();
  // Countries that switch on the country-only series: US (auctions, expectations), Brazil (Focus),
  // Germany (EU surveys, SPF area), Peru (bond spread), Kenya (World Bank IDS).
  for (const iso3 of ['USA', 'BRA', 'DEU', 'PER', 'KEN', 'JPN']) {
    const set = countrySeries(iso3, { currency: iso3 === 'USA' ? 'USD' : 'EUR' });
    for (const x of [...set.series, ...set.missing]) ids.add(x.id);
  }
  for (const x of [...spfWorldSeries(null), ...chokepointWorldSeries(null), ...stressWorldSeries(null)]) ids.add(x.id);
  return [...ids];
}

test('every series the app builds says what it measures and whose figure it is', () => {
  const ids = everyId();
  assert.ok(ids.length > 80, `only ${ids.length} ids found`);
  const untagged = ids.filter((id) => seriesTags({ id }).definition === COVERAGE.notStated);
  assert.deepEqual(untagged, []);
  // A few that matter most: general government is not central government.
  assert.equal(seriesTags({ id: 'debt_gdp' }).coverage, COVERAGE.generalGov);
  assert.match(seriesTags({ id: 'debt_gdp' }).definition, /General government gross debt/);
  assert.equal(seriesTags({ id: 'ppg_external_usd' }).coverage, COVERAGE.ppg);
  assert.equal(seriesTags({ id: 'external_debt' }).coverage, COVERAGE.allSectors);
  assert.equal(seriesTags({ id: 'yield_10y' }).coverage, COVERAGE.centralGov);
  assert.equal(seriesTags({ id: 'ust_auction_btc_10y' }).coverage, COVERAGE.centralGov);
});

test('the activity index follows its source; unknown, own and paid series say so', () => {
  assert.equal(seriesTags({ id: 'activity_monthly', source: 'Banco Central do Brasil, IBC-Br economic activity index' }).coverage, COVERAGE.wholeEconomy);
  assert.equal(seriesTags({ id: 'activity_monthly', source: 'Eurostat industrial production index' }).coverage, COVERAGE.industry);
  assert.deepEqual(seriesTags({ id: 'something_new' }), { definition: 'Not stated yet', coverage: 'Not stated yet', seasonalAdjustment: 'Not stated by the source', measure: 'Not stated yet' });
  assert.equal(seriesTags({ id: 'own_x', own: true }).coverage, COVERAGE.own);
  assert.equal(seriesTags({ id: 'paid_macrobond_x_usa', paid: true }).coverage, COVERAGE.paid);
});

test('list entries and downloads carry every tag', () => {
  const s: Series = { id: 'debt_gdp', label: 'Government debt', unit: '% of GDP', freq: 'annual', source: 'IMF WEO', points: [{ date: '2024', value: 80 }] };
  assert.equal(seriesSummary(s).tags.coverage, COVERAGE.generalGov);
  assert.deepEqual(SERIES_HEADER.slice(-TAG_COLUMNS.length), ['definition', 'coverage', 'seasonal_adjustment', 'measure', 'base_year', 'currency']);
  const [row] = seriesRows('USA', [s]);
  assert.equal(row.length, SERIES_HEADER.length);
  const cell = (h: string) => row[SERIES_HEADER.indexOf(h)];
  assert.match(String(cell('definition')), /General government gross debt/);
  assert.equal(cell('coverage'), COVERAGE.generalGov);
  assert.equal(cell('seasonal_adjustment'), SEASONAL.yearly);
  assert.deepEqual([cell('measure'), cell('base_year'), cell('currency')], [MEASURE.shareGdp, null, null]);
  const [oil] = commoditySeries([{ source: 'eia', code: 'RBRTE', name: 'Brent', unit: 'USD/bbl', points: [{ period: '2026-01-02', value: 70 }] } as never], { pink_sheet: undefined, eia: undefined });
  assert.equal(seriesTags(oil!).coverage, COVERAGE.world);
});

test('seasonal adjustment follows how the app asks each source; frequency notes say how points are formed', () => {
  const sa = (id: string, freq?: string, source?: string) => seriesTags({ id, freq, source }).seasonalAdjustment;
  assert.equal(sa('gdp_qoq', 'quarterly'), SEASONAL.sca);
  assert.equal(sa('eu_survey_industry', 'monthly'), SEASONAL.sa);
  assert.equal(sa('activity_monthly', 'monthly', 'Banco Central do Brasil, IBC-Br'), SEASONAL.sa);
  assert.equal(sa('activity_monthly', 'monthly', 'Eurostat industrial production index'), SEASONAL.sca);
  assert.equal(sa('cpi_monthly', 'monthly'), SEASONAL.yoy);
  assert.equal(sa('policy_rate', 'daily'), SEASONAL.market);
  assert.equal(sa('debt_gdp', 'annual'), SEASONAL.yearly);
  assert.equal(sa('debt_gdp', 'per pull'), SEASONAL.yearly);
  assert.equal(sa('spf_hicp_1y', 'quarterly'), SEASONAL.forecast);
  assert.equal(sa('credit_gap', 'quarterly'), SEASONAL.notStated);
  // Every monthly, weekly or quarterly series the app knows has a stated adjustment or says the source does not.
  for (const id of everyId()) assert.ok(sa(id, 'monthly'), id);
  assert.match(seriesTags({ id: 'cli', freq: 'monthly' }).frequencyNote!, /averages the three months of each quarter; a month not yet published is forecast/);
  assert.match(seriesTags({ id: 'debt_gdp', freq: 'per pull' }).frequencyNote!, /One point per saved download/);
  assert.equal(seriesTags({ id: 'debt_gdp', freq: 'annual' }).frequencyNote, undefined);
  assert.match(seriesTags({ id: 'portwatch_suez_ships', freq: 'monthly' }).frequencyNote!, /averaged over each month/);
});

test('units: real or nominal, base year, and market rate or purchasing power parity', () => {
  const u = (id: string, source?: string) => {
    const t = seriesTags({ id, source });
    return [t.measure, t.baseYear ?? null, t.currency ?? null];
  };
  assert.deepEqual(u('gdp_usd'), [MEASURE.nominal, null, CURRENCY.usdMarket]);
  assert.deepEqual(u('gdp_pc_ppp'), [MEASURE.real, '2021', CURRENCY.intlPpp]);
  assert.deepEqual(u('gdp_qoq'), [MEASURE.realGrowth, null, null]);
  assert.deepEqual(u('cpi_index'), [MEASURE.index, '2010', null]);
  assert.deepEqual(u('terms_of_trade'), [MEASURE.index, '2015', null]);
  assert.deepEqual(u('ppp_factor'), [MEASURE.fx, null, CURRENCY.localPerIntl]);
  assert.deepEqual(u('fx_per_usd'), [MEASURE.fx, null, CURRENCY.localPerUsd]);
  assert.deepEqual(u('yield_10y'), [MEASURE.rate, null, CURRENCY.local]);
  assert.deepEqual(u('activity_monthly', 'Banco Central do Brasil, IBC-Br'), [MEASURE.index, '2002', null]);
  assert.deepEqual(u('activity_monthly', 'Eurostat industrial production index'), [MEASURE.index, '2021', null]);
  assert.deepEqual(u('default_paris_club_usd'), [MEASURE.nominal, null, CURRENCY.usdMarket]);
  // Every series the app builds has a measure.
  assert.deepEqual(everyId().filter((id) => seriesTags({ id }).measure === COVERAGE.notStated), []);
});

test('every definition and coverage has Spanish and French', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  for (const lang of ['es', 'fr'] as const) assert.deepEqual(allTagTexts().filter((x) => translateText(x, lang) === x), [], lang);
});
