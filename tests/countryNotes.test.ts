import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEconomistSections, economistBrief, sourceTag, ECONOMIST_SECTIONS } from '../src/utils/countryNotes.ts';
import { getSnapshotDataStatus } from '../src/utils/dataStatus.ts';
import { buildBaselineOpenData } from '../src/data/presetsAndBaselines.ts';
import type { CouncilAssessmentRun, OpenDataSnapshot } from '../src/types/council.ts';

const NOW = new Date('2026-11-04T12:00:00Z');

function runFor(iso3: string, sources: string[], tweak: (s: OpenDataSnapshot) => void = () => {}): CouncilAssessmentRun {
  const openData = buildBaselineOpenData(iso3);
  openData.dataStatus = { verifiedLiveSources: sources, checkedAt: '2026-11-04T12:00:00Z' };
  tweak(openData);
  return { iso3, countryName: openData.countryName, openData } as unknown as CouncilAssessmentRun;
}

test('source tags: sample unless the feed answered; official yield names its date', () => {
  const sample = getSnapshotDataStatus(runFor('MEX', []).openData);
  assert.deepEqual(sourceTag(sample, 'imf'), { source: 'sample', verified: false });
  const live = runFor('MEX', ['IMF DataMapper WEO', 'World Bank Open Data v2', 'FRED / OECD 10Y government yield (monthly average)'], (s) => {
    s.official10YYield = { valuePct: 9.35, period: '2026-09', source: 'OECD via FRED', seriesId: 'S', url: 'u', frequency: 'monthly' };
  }).openData;
  const st = getSnapshotDataStatus(live);
  assert.deepEqual(sourceTag(st, 'imf'), { source: 'IMF WEO', verified: true });
  assert.deepEqual(sourceTag(st, 'yield'), { source: 'official, Sep 2026 avg', verified: true });
  assert.equal(sourceTag(st, 'market').verified, false);
});

test('the brief warns when figures are sample values and every row has a source', () => {
  const b = economistBrief(runFor('BRA', []), NOW);
  assert.match(b.sampleWarning || '', /sample values/);
  for (const g of b.groups) for (const r of g.rows) assert.ok(r.source.length > 0, `${r.label} has no source`);
  assert.equal(economistBrief(runFor('BRA', ['IMF DataMapper WEO', 'World Bank Open Data v2']), NOW).sampleWarning, undefined);
});

test('judgements follow the stated rules', () => {
  const tight = economistBrief(
    runFor('BRA', [], (s) => {
      s.imfIndicators.cpiInflationPct = 4;
      s.monetaryAndMarket.policyRatePct = 15;
      s.imfIndicators.realGdpGrowthPct = 1.2;
      s.worldBankIndicators.fxReservesMonthsImport = 2.1;
    }),
    NOW
  );
  assert.ok(tight.judgements.some((j) => j.startsWith('Growth is weak at 1.2%')));
  assert.ok(tight.judgements.some((j) => j.startsWith('Monetary policy is tight: the policy rate is 11.0% above inflation')));
  assert.ok(tight.judgements.some((j) => j.includes('reserves below the usual three-month import floor')));
  const loose = economistBrief(runFor('TUR', [], (s) => { s.imfIndicators.cpiInflationPct = 40; s.monetaryAndMarket.policyRatePct = 30; }), NOW);
  assert.ok(loose.judgements.some((j) => j.startsWith('Real interest rates are negative (-10.0%)')));
});

test('the next official rate decision comes from the calendar', () => {
  const policy = economistBrief(runFor('BRA', []), NOW).groups.find((g) => g.title === 'Monetary policy')!;
  const next = policy.rows.find((r) => r.label === 'Next rate decision')!;
  assert.match(next.value, /^\d{1,2} [A-Z][a-z]{2} 2026, (today|tomorrow|in \d+ days)$/);
  assert.equal(next.verified, true);
});

test('country note: all sections by default, switched-off sections left out', () => {
  const run = runFor('ZAF', []);
  const all = buildEconomistSections(run, () => true, NOW);
  assert.deepEqual(all.map((s) => s.id), Object.keys(ECONOMIST_SECTIONS));
  assert.ok(all[0].lines.some((l) => l.startsWith('**Note:**')), 'sample warning is in the summary');
  const some = buildEconomistSections(run, (id) => id !== 'external' && id !== 'risks', NOW);
  assert.ok(!some.some((s) => s.id === 'external' || s.id === 'risks'));
  const fiscal = all.find((s) => s.id === 'fiscal')!;
  assert.ok(fiscal.lines.every((l, i) => i >= 6 || /\((IMF WEO|sample|model, from figures above|AI estimate|official, .+)\)$/.test(l)));
});
