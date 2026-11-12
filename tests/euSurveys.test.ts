import test from 'node:test';
import assert from 'node:assert/strict';
import { EU_SURVEY_INDICATORS, euSurveyReading, euSurveySeries, euSurveySummary, euSurveyUrl, euSurveyValue, parseEuSurvey, type EuSurveyPull } from '../src/utils/euSurveys';
import { economistBrief } from '../src/utils/countryNotes';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines';
import type { CouncilAssessmentRun, WatchlistItem } from '../src/types/council';

// A reply in the shape Eurostat sends (JSON-stat 2.0, checked 2026-11-08): one indicator, two countries, three months.
const reply = {
  id: ['freq', 'indic', 's_adj', 'geo', 'time'],
  size: [1, 1, 1, 2, 3],
  dimension: {
    freq: { category: { index: { M: 0 } } },
    indic: { category: { index: { 'BS-ESI-I': 0 } } },
    s_adj: { category: { index: { SA: 0 } } },
    geo: { category: { index: { DE: 0, PL: 1 } } },
    time: { category: { index: { '2026-08': 0, '2026-09': 1, '2026-10': 2 } } },
  },
  // Poland's October not yet published: skipped, never filled in.
  value: { '0': 95.2, '1': 94.8, '2': 94.14, '3': 101.3, '4': 100.2 },
};

test('one request per indicator, seasonally adjusted, for the countries asked, with no key', () => {
  const u = new URL(euSurveyUrl(EU_SURVEY_INDICATORS[0], ['DE', 'PL']));
  assert.equal(u.host, 'ec.europa.eu');
  assert.match(u.pathname, /ei_bssi_m_r2$/);
  assert.equal(u.searchParams.get('indic'), 'BS-ESI-I');
  assert.equal(u.searchParams.get('s_adj'), 'SA');
  assert.deepEqual(u.searchParams.getAll('geo'), ['DE', 'PL']);
  const eei = new URL(euSurveyUrl(EU_SURVEY_INDICATORS.find((i) => i.id === 'employment')!, ['FR']));
  assert.match(eei.pathname, /ei_bsee_m_r2$/);
  assert.equal(eei.searchParams.get('unit'), 'INX');
  assert.ok(!/key/i.test(u.search));
});

test('points by country, oldest first; gaps skipped; another shape gives nothing', () => {
  const got = parseEuSurvey(reply, ['DEU', 'POL', 'ITA', 'USA']);
  assert.deepEqual(Object.keys(got).sort(), ['DEU', 'POL']);
  assert.deepEqual(got.DEU.map((p) => `${p.period} ${p.value}`), ['2026-08 95.2', '2026-09 94.8', '2026-10 94.1']);
  assert.equal(got.POL.length, 2);
  assert.deepEqual(parseEuSurvey({ ...reply, size: [1, 2, 1, 2, 3] }, ['DEU']), {}, 'two indicators in one reply is ambiguous');
  assert.deepEqual(parseEuSurvey({ nope: 1 }, ['DEU']), {});
});

const pull: EuSurveyPull = {
  pulledAt: '2026-11-08T06:00:00Z',
  series: {
    DEU: {
      esi: [{ period: '2026-09', value: 94.8 }, { period: '2026-10', value: 94.1 }],
      consumer: [{ period: '2026-07', value: -23.2 }, { period: '2026-08', value: -22.5 }, { period: '2026-09', value: -24.9 }, { period: '2026-10', value: -21.9 }],
      services: [{ period: '2026-10', value: 3.7 }],
    },
  },
};

test('the latest month of each indicator, read against 100 or three months earlier', () => {
  const s = euSurveySummary('deu', pull)!;
  assert.deepEqual(s.latest.map((a) => a.id), ['esi', 'services', 'consumer']);
  const esi = s.latest[0];
  assert.equal(euSurveyValue(esi), '94.1 (long-term average = 100)');
  assert.equal(euSurveyReading(esi), 'below its long-term average');
  const consumer = s.latest.find((a) => a.id === 'consumer')!;
  assert.equal(euSurveyValue(consumer), 'balance -21.9');
  assert.equal(euSurveyReading(consumer), 'up 1.3 points on three months earlier');
  const services = s.latest.find((a) => a.id === 'services')!;
  assert.equal(euSurveyValue(services), 'balance +3.7');
  assert.equal(euSurveyReading(services), undefined, 'no month three back: no reading');
  assert.equal(euSurveySummary('FRA', pull), undefined);
  assert.equal(euSurveySummary('DEU', null), undefined);
});

test('chartable series for EU members, labelled not a PMI; one Missing line elsewhere', () => {
  const s = euSurveySeries('DEU', pull);
  assert.equal(s.length, 6);
  const esi = s.find((x) => x.id === 'eu_survey_esi')!;
  assert.ok('points' in esi && esi.freq === 'monthly' && /not a PMI/.test(esi.label) && /Eurostat/.test(esi.source));
  const eei = s.find((x) => x.id === 'eu_survey_employment')!;
  assert.ok('reason' in eei && /without this survey indicator/.test(eei.reason));
  assert.ok(euSurveySeries('POL', null).every((x) => 'reason' in x && /not answered/.test(x.reason)));
  const us = euSurveySeries('USA', pull);
  assert.equal(us.length, 1);
  assert.ok('reason' in us[0] && /EU members only/.test(us[0].reason));
});

test('the economist note shows the surveys for EU members only, or says they are not saved yet, in all three languages', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang.ts');
  const { ES, ES_TEXT } = await import('../src/i18n/es/index.ts');
  const { FR, FR_TEXT } = await import('../src/i18n/fr/index.ts');
  const runFor = (iso3: string) => ({ iso3, countryName: iso3, openData: buildBaselineOpenData(iso3) }) as unknown as CouncilAssessmentRun;
  const rowsOf = (iso3: string, peers: WatchlistItem[]) => economistBrief(runFor(iso3), new Date('2026-11-08T12:00:00Z'), peers).groups.find((g) => g.title === 'Growth and inflation')!.rows;
  assert.ok(!rowsOf('BRA', []).some((r) => /not a PMI/.test(r.label)), 'not for non-EU countries');
  const none = rowsOf('DEU', []).filter((r) => /not a PMI/.test(r.label));
  assert.equal(none.length, 1);
  assert.equal(none[0].value, 'Missing');
  const de = { iso3: 'DEU', countryName: 'Germany', euSurveys: euSurveySummary('DEU', pull) } as WatchlistItem;
  const rows = rowsOf('DEU', [de]).filter((r) => /not a PMI/.test(r.label));
  assert.deepEqual(rows.map((r) => `${r.label} | ${r.value}`), [
    'Economic sentiment indicator (EU business survey, not a PMI), 2026-10 | 94.1 (long-term average = 100); below its long-term average',
    'Services confidence (EU business survey, not a PMI), 2026-10 | balance +3.7',
    'Consumer confidence (EU business survey, not a PMI), 2026-10 | balance -21.9; up 1.3 points on three months earlier',
  ]);
  assert.ok(rows.every((r) => r.verified && /Business and Consumer Surveys/.test(r.source)));
  const series = euSurveySeries('DEU', pull).concat(euSurveySeries('USA', pull), euSurveySeries('FRA', null));
  const lines = [
    none[0].label, none[0].source, none[0].help!,
    ...rows.flatMap((r) => [r.label, r.value]),
    euSurveyValue({ id: 'x', label: 'Employment expectations indicator', kind: 'index', period: '2026-10', value: 100.2 }) + '; at its long-term average',
    'Industrial confidence (EU business survey, not a PMI), 2026-10',
    'balance -1.4; down 2.0 points on three months earlier',
    'balance -1.4; about unchanged on three months earlier',
    'balance -1.4; above its long-term average',
    ...series.flatMap((s) => ('reason' in s ? [s.label, s.reason] : [s.label, s.about, s.unit])),
  ];
  attachLanguage('es', ES, ES_TEXT);
  assert.deepEqual(lines.filter((l) => translateText(l, 'es') === l), [], 'no Spanish');
  assert.equal(translateText(rows[0].label, 'es'), 'Indicador de sentimiento económico (encuesta empresarial de la UE, no es un PMI), 2026-10');
  attachLanguage('fr', FR, FR_TEXT);
  assert.deepEqual(lines.filter((l) => translateText(l, 'fr') === l), [], 'no French');
  assert.equal(translateText(rows[2].value, 'fr'), 'solde -21.9; en hausse de 1.3 points par rapport à trois mois plus tôt');
});
