import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { PolicyReview, ReviewFrame } from '../src/utils/policyReview';
import type { OptionsStep, PolicyOption } from '../src/utils/reviewOptions';
import type { EvidenceStep } from '../src/utils/reviewEvidence';
import type { Diagnosis } from '../src/utils/reviewDiagnosis';
import { PEOPLE_TEXT, buildPeopleExtras, peopleSummary, perPerson, type PeopleExtras } from '../src/utils/peopleSummary';
import { briefLines, plainBrief } from '../src/utils/plainBrief';
import { regionalProfile, type DoseFile } from '../src/utils/regional';
import { REPORTS } from '../src/i18n/messages/reports';
import { PANEL_TEXT_ES } from '../src/i18n/es/panelText';

const opt = (rank: number, title: string): PolicyOption => ({ rank, title, lever: 'fiscal', how: 'h', effect: 'Lower the subsidy bill.', timeToEffect: 'a year', tradeoffs: 't', whoBears: 'w', mustBeTrue: 'x', risks: 'r', refs: [], views: {}, fromUser: false });
const o: OptionsStep = { templateVersion: 'v', model: 'm', temperature: 0, promptHash: 'p', options: [opt(1, 'Keep the subsidy'), opt(2, 'Phase out the diesel subsidy')], ranking: '', gaps: [], userOptions: [], removed: [] };
const rec = (content: unknown) => ({ content, savedAt: '2026-11-01T00:00:00Z', hash: 'h'.repeat(64) });
const d = { iso3: 'BRA', asOf: '2026-11-01', pullDate: '', pulledAt: '', incomplete: false, figures: [], readings: [], coverage: '' } as Diagnosis;
const inputs = { recommended: 2, rationale: 'r', watch: [], reviewDate: '2027-05-01' };
const extras: PeopleExtras = {
  population: { value: 200, year: 2025 },
  gdpUsd: { value: 2000, year: 2025 },
  regions: { rows: [{ name: 'Maranhão', gapPct: -55.2 }, { name: 'Piauí', gapPct: -50 }], year: 2018, source: 'DOSE' },
  peers: { rows: [{ name: 'Mexico', year: 2014, growthAvg: 2.04, debtChange: 4.5 }, { name: 'Colombia', year: 2015, growthAvg: 1.5, debtChange: null }, { name: 'Peru', year: 2013, growthAvg: null, debtChange: null }] },
};

async function councilReview(unit = 'lcu_bn') {
  const { saveCouncilPart, newReview } = await import('../src/utils/policyReviewStore');
  const { parseFrame } = await import('../src/utils/policyReview');
  const cf = (parseFrame({ iso3: 'BRA', problem: 'Fuel subsidies cost a large share of the budget.', goal: { indicator: 'Primary balance', direction: 'higher' }, asOf: '2026-11-01', council: { measure: 'Phase out the diesel subsidy' } }, new Date('2026-11-05T12:00:00Z')) as { frame: ReviewFrame }).frame;
  let r = newReview(cf, []);
  const add = (part: Parameters<typeof saveCouncilPart>[1], content: unknown) => (r = (saveCouncilPart(r, part, content) as { review: typeof r }).review);
  add('costBenefit', { unit, firstYear: 2027, lines: [{ kind: 'cost', label: 'Transfers', values: [10, 0, 0], source: 'Budget' }, { kind: 'benefit', label: 'Saved', values: [0, 6, 6], source: 'Outturn' }], rateIds: ['us_a4_7'] });
  add('groups', { rows: [{ group: 'Poorer households', effect: 'loses', why: 'Fares rise.', size: -1.2, sizeUnit: '% of income', source: 'HBS' }, { group: 'Government budget', effect: 'gains', why: 'Bill falls.' }] });
  const review: Pick<PolicyReview, 'title' | 'steps' | 'councilParts'> = { title: 'T', steps: { frame: r.steps.frame!, diagnose: rec(d), options: rec(o), evidence: rec({ researchOnly: true } as EvidenceStep) }, councilParts: r.councilParts };
  return review;
}

test('per person: billions over people, % of GDP through GDP in dollars, reasons when a figure is missing', () => {
  assert.equal(perPerson(10, 'lcu_bn', extras), 50);
  assert.equal(perPerson(1, 'pct_gdp', extras), 100);
  assert.equal(perPerson(1, 'usd_bn', {}), 'noPop');
  assert.equal(perPerson(1, 'pct_gdp', { population: extras.population }), 'noGdp');
});

test('the summary: what changes, cost per person, who gains and who pays, regions behind, precedents', async () => {
  const s = peopleSummary(await councilReview(), inputs, extras, 'en');
  assert.equal(s.heading, 'What this means for people');
  assert.deepEqual(s.lines, [
    'What changes: Phase out the diesel subsidy.',
    'What it should do: Lower the subsidy bill.',
    'Cost: about 50 in local currency per person in the first year (2027), and 50 in local currency per person over the whole period counted at US OMB Circular A-4, 7%.',
    'Population 200 million (2025).',
    'Who gains: Government budget.',
    'Who pays: Poorer households (-1.2 % of income).',
    'Regions furthest behind (2018, DOSE): Maranhão, -55.2% against the national figure; Piauí, -50.0% against the national figure.',
    'Countries in a similar position before: Mexico in 2014: growth then averaged 2.0% a year, government debt moved +4.5 points of GDP; Colombia in 2015: growth then averaged 1.5% a year; Peru in 2013. This is what happened there, not what will happen here.',
  ]);
  const pct = peopleSummary(await councilReview('pct_gdp'), inputs, extras, 'en');
  assert.match(pct.lines[2], /^Cost: about US\$1,000 per person in the first year \(2027\)/);
});

test('Missing with the reason: no cost table, no population, no regions or precedents; reasons translated when asked', async () => {
  const plain = { title: 'T', steps: { frame: rec({ iso3: 'BRA', problem: 'p', goal: { indicator: 'Inflation', direction: 'lower' }, constraints: [], asOf: '2026-11-01' }), options: rec(o) } } as Pick<PolicyReview, 'steps'>;
  const s = peopleSummary(plain, inputs, { regions: { missing: 'no regional figures' }, peers: { missing: 'too few figures to compare' } }, 'es', (x) => PANEL_TEXT_ES[x] ?? x);
  assert.ok(s.lines.includes('Costo por persona: Falta (la revisión no tiene tabla de costos (consejo de políticas, costos y beneficios)).'));
  assert.ok(s.lines.includes('Quién gana y quién paga: Falta (no hay grupos en el consejo de políticas).'));
  assert.ok(s.lines.includes('Regiones más rezagadas: Falta (no hay cifras regionales).'));
  assert.ok(s.lines.includes('Países en una situación parecida antes: Falta (muy pocas cifras para comparar).'));
  const noPop = peopleSummary(await councilReview(), inputs, {}, 'en');
  assert.ok(noPop.lines.includes('Cost per person: Missing (no population figure is saved for this country).'));
});

test('every language has every fixed text with the same placeholders', () => {
  const keys = Object.keys(PEOPLE_TEXT.en).sort();
  const ph = (s: unknown) => JSON.stringify(s).match(/\{\w+\}/g)?.sort().join() ?? '';
  for (const l of ['es', 'fr', 'pt'] as const) {
    assert.deepEqual(Object.keys(PEOPLE_TEXT[l]).sort(), keys, l);
    for (const k of keys) assert.equal(ph((PEOPLE_TEXT[l] as Record<string, unknown>)[k]), ph((PEOPLE_TEXT.en as Record<string, unknown>)[k]), `${l}.${k}`);
  }
});

test('the brief carries the section after what to watch and before the council parts', async () => {
  const review = await councilReview();
  const pp = peopleSummary(review, inputs, extras, 'en');
  const text = briefLines(plainBrief(review, inputs, 'en', pp)).map((l) => l.text);
  const at = text.indexOf('What this means for people');
  assert.ok(at > text.indexOf('Look again on 2027-05-01.'));
  assert.ok(at < text.indexOf('The measure weighed (policy council)'));
  assert.equal(plainBrief(review, inputs, 'en').people, undefined);
});

test('server figures: population and GDP before the As of year, poorest regions, three closest precedents or the reason', () => {
  const series = (pts: [string, number][]) => ({ points: pts.map(([date, value]) => ({ date, value })) });
  const histories = [{ iso3: 'KEN', name: 'Kenya', series: { population: series([['2024', 52], ['2025', 53], ['2026', 54]]), gdp_usd: series([['2025', 110]]) } }];
  const dose = { record: '1', file: 'f', basis: 'usd_2015', pulledAt: '', countries: { KEN: { regions: [{ id: 'a', name: 'Nairobi' }, { id: 'b', name: 'Turkana' }, { id: 'c', name: 'Mandera' }], rows: [[0, 2018, 4000, 5], [1, 2018, 1000, 1], [2, 2018, 800, 1]] } } } as DoseFile;
  const x = buildPeopleExtras('KEN', '2026-11-01', histories, regionalProfile({ iso3: 'KEN', iso2: 'KE', dose, euro: null, gdl: null }));
  assert.deepEqual(x.population, { value: 53, year: 2025 });
  assert.deepEqual(x.gdpUsd, { value: 110, year: 2025 });
  assert.deepEqual(x.regions && 'rows' in x.regions && x.regions.rows.map((r) => r.name), ['Mandera', 'Turkana']);
  assert.ok(x.peers && 'missing' in x.peers);
  const none = buildPeopleExtras('KEN', '2026-11-01', [], regionalProfile({ iso3: 'KEN', iso2: 'KE', dose: null, euro: null, gdl: null }));
  assert.match((none.regions as { missing: string }).missing, /not been downloaded/);
  assert.equal(none.population, undefined);
});

test('wiring: route, buttons and text keys', () => {
  assert.match(readFileSync('src/server/routes/reviews.ts', 'utf8'), /app\.get\('\/api\/reviews\/:id\/people'/);
  const page = readFileSync('src/components/PolicyReviews.tsx', 'utf8');
  assert.match(page, /data-review-people="true"/);
  for (const k of ['pr_people', 'pr_peopleTitle', 'pr_peopleNote']) assert.ok(k in REPORTS.en, k);
});
