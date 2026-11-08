import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSections, SECTION_LABEL, CLIENT_SECTION_LABEL, type SectionId } from '../src/components/IcMemoBuilder.tsx';
import { buildDefaultAssessmentRun } from '../src/data/presetsAndBaselines.ts';
import type { Holding } from '../src/utils/holdings.ts';
import type { WatchlistItem } from '../src/types/council.ts';

const run = buildDefaultAssessmentRun('BRA');
const all = Object.fromEntries((Object.keys(SECTION_LABEL) as SectionId[]).map((k) => [k, true])) as Record<SectionId, boolean>;
const holdings: Holding[] = [
  { id: '1', iso3: 'BRA', instrument: 'BRAZIL 2034', assetClass: 'HC_BOND', side: 'LONG', notionalUsdMm: 25, durationYears: 6.8 },
  { id: '2', iso3: 'MEX', instrument: 'MBONO', assetClass: 'LC_BOND', side: 'LONG', notionalUsdMm: 25, durationYears: 4 },
];
const lookup = [
  { iso3: 'BRA', countryName: 'Brazil', compositeRisk: 0.5 },
  { iso3: 'MEX', countryName: 'Mexico', compositeRisk: 0.5 },
] as unknown as WatchlistItem[];
const props = { run, holdings, riskLookup: lookup };
const text = (s: ReturnType<typeof buildSections>) => s.flatMap((x) => [x.heading, ...x.lines]).join('\n');

test('IC memo has every section, and no trade tickets or kill switches', () => {
  const s = buildSections(props, all);
  assert.deepEqual(s.map((x) => x.id), Object.keys(SECTION_LABEL));
  const t = text(s);
  assert.doesNotMatch(t, /trade ticket|Kill switch|conviction/i);
  assert.match(t, /DV01/);
  assert.doesNotMatch(t, /\(Ref:/);
});

test('no built-in figures: without live feeds the memo names each missing figure and drops the council score', () => {
  const t = text(buildSections(props, all));
  assert.match(t, /Debt \/ GDP: Missing \(/);
  assert.match(t, /5Y CDS: Missing \(Needs setup\)/);
  assert.doesNotMatch(t, /Composite risk score/);
  const client = text(buildSections(props, all, 'client'));
  assert.match(client, /do not yet have up-to-date figures for government debt/);
  assert.doesNotMatch(client, /Government debt is \d/);
});

test('client note leaves out trade levels, scores and desk terms', () => {
  const s = buildSections(props, all, 'client');
  assert.deepEqual(s.map((x) => x.heading), Object.values(CLIENT_SECTION_LABEL));
  const t = text(s);
  for (const banned of ['Kill switch', 'DV01', 'conviction', 'bps', 'CDS', 'Composite risk']) {
    assert.ok(!t.includes(banned), `client note contains "${banned}"`);
  }
  assert.match(t, /not a personal recommendation/);
  assert.match(t, /About 50% of your emerging market holdings are linked to Brazil/);
});

test('client note keeps decimals whole when it shortens the summary', () => {
  const t = text(buildSections(props, all, 'client'));
  assert.doesNotMatch(t, /\d\. \d/);
});

test('sections can be switched off', () => {
  const only = { ...Object.fromEntries(Object.keys(all).map((k) => [k, false])), recommendation: true } as Record<SectionId, boolean>;
  assert.deepEqual(buildSections(props, only).map((x) => x.id), ['recommendation']);
  assert.deepEqual(buildSections(props, only, 'client').map((x) => x.id), ['recommendation']);
});
