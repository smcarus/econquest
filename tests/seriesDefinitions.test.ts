import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countrySeries, commoditySeries, seriesSummary, type Series } from '../src/utils/seriesHistory';
import { allTagTexts, COVERAGE, seriesTags, TAG_COLUMNS } from '../src/utils/seriesDefinitions';
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

test('the activity index follows its source; unknown, own and paid series say so honestly', () => {
  assert.equal(seriesTags({ id: 'activity_monthly', source: 'Banco Central do Brasil, IBC-Br economic activity index' }).coverage, COVERAGE.wholeEconomy);
  assert.equal(seriesTags({ id: 'activity_monthly', source: 'Eurostat industrial production index' }).coverage, COVERAGE.industry);
  assert.deepEqual(seriesTags({ id: 'something_new' }), { definition: 'Not stated yet', coverage: 'Not stated yet' });
  assert.equal(seriesTags({ id: 'own_x', own: true }).coverage, COVERAGE.own);
  assert.equal(seriesTags({ id: 'paid_macrobond_x_usa', paid: true }).coverage, COVERAGE.paid);
});

test('list entries and downloads carry the tags; the G7/G8 columns exist but stay empty', () => {
  const s: Series = { id: 'debt_gdp', label: 'Government debt', unit: '% of GDP', freq: 'annual', source: 'IMF WEO', points: [{ date: '2024', value: 80 }] };
  assert.equal(seriesSummary(s).tags.coverage, COVERAGE.generalGov);
  assert.deepEqual(SERIES_HEADER.slice(-TAG_COLUMNS.length), ['definition', 'coverage', 'seasonal_adjustment', 'measure', 'base_year', 'currency']);
  const [row] = seriesRows('USA', [s]);
  assert.equal(row.length, SERIES_HEADER.length);
  const cell = (h: string) => row[SERIES_HEADER.indexOf(h)];
  assert.match(String(cell('definition')), /General government gross debt/);
  assert.equal(cell('coverage'), COVERAGE.generalGov);
  assert.deepEqual([cell('seasonal_adjustment'), cell('measure'), cell('base_year'), cell('currency')], [null, null, null, null]);
  const [oil] = commoditySeries([{ source: 'eia', code: 'RBRTE', name: 'Brent', unit: 'USD/bbl', points: [{ period: '2026-01-02', value: 70 }] } as never], { pink_sheet: undefined, eia: undefined });
  assert.equal(seriesTags(oil!).coverage, COVERAGE.world);
});

test('every definition and coverage has Spanish and French', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  for (const lang of ['es', 'fr'] as const) assert.deepEqual(allTagTexts().filter((x) => translateText(x, lang) === x), [], lang);
});
