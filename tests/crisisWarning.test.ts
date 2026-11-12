import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crisisSentence, crisisRows, crisisWarning, gapSpells, gapZone, spellsText, CRISIS_NOT_RUN, type CrisisWarning } from '../src/utils/crisisWarning.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';

/** Quarter keys as the BIS parser writes them ("2006Q1"). */
const qs = (from: string, values: number[]) => {
  const y0 = Number(from.slice(0, 4));
  const q0 = Number(from.slice(5, 6)) - 1;
  return Object.fromEntries(values.map((v, i) => [`${y0 + Math.floor((q0 + i) / 4)}Q${((q0 + i) % 4) + 1}`, v]));
};

test('zones follow the Basel III lines of 2 and 10 points', () => {
  assert.equal(gapZone(10.1), 'above_warning');
  assert.equal(gapZone(10), 'buffer');
  assert.equal(gapZone(2.1), 'buffer');
  assert.equal(gapZone(2), 'below_buffer');
  assert.equal(gapZone(-5), 'below_buffer');
});

test('spells above 10 points: start, end and peak; a gap in the published quarters ends a spell', () => {
  const gap = { ...qs('2005Q1', [8, 11, 14, 12, 9, 4]), ...qs('2024Q1', [10.5, 13]) };
  const s = gapSpells(gap);
  assert.deepEqual(s, [
    { from: '2005Q2', to: '2005Q4', peak: 14, peakQuarter: '2005Q3' },
    { from: '2024Q1', peak: 13, peakQuarter: '2024Q2' },
  ]);
  assert.equal(spellsText(s), 'Spells above 10 points: 2005-Q2 to 2005-Q4 (peak +14.0 in 2005-Q3); since 2024-Q1 (peak so far +13.0 in 2024-Q2).');
  assert.match(spellsText([]), /has not been above 10 points/);
});

test('the reading: gap, a year earlier, three-year credit change, debt service and house prices against their own average', () => {
  const cycle = {
    fetchedAt: '2026-11-12T00:00:00Z',
    creditGap: qs('2022Q1', [1, 2, 3, 4, 6, 8, 10, 12, 11, 12, 12.4, 12.3]),
    creditToGdp: qs('2022Q1', [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 115.5]),
    dsr: qs('2023Q1', [10, 10, 10, 10, 12, 12, 12, 14]),
    realHousePricesYoy: qs('2023Q1', [1, 1, 1, 1, 1, 1, 1, 9]),
  };
  const r = crisisWarning(cycle, true) as CrisisWarning;
  assert.equal(r.ok, true);
  assert.deepEqual(r.gap, { quarter: '2024Q4', value: 12.3, zone: 'above_warning', yearAgo: { quarter: '2023Q4', value: 12 } });
  assert.deepEqual(r.creditChange, { from: '2022Q1', to: '2025Q1', fromValue: 100, toValue: 115.5, pts: 15.5 });
  assert.deepEqual(r.dsr, { quarter: '2024Q4', value: 14, average: 11.3, since: '2023Q1', quarters: 8, deviation: 2.8 });
  assert.equal(r.realHousePrices!.deviation, 7);
  assert.deepEqual(r.missing, []);
  assert.equal(
    crisisSentence(r, 'Testland'),
    'Testland: the credit-to-GDP gap was +12.3 points in 2024-Q4, above 10, the level at which Basel III calls for the full countercyclical capital buffer and the line the crisis_warning test uses. A year earlier it was +12.0.'
  );
  assert.deepEqual(crisisRows(r).map((x) => x.id), ['gap', 'credit', 'dsr', 'houses']);
  assert.ok(!/probab|\d+% chance|will (?:have|face) a crisis/i.test(JSON.stringify(r) + crisisSentence(r, 'x')));
});

test('Missing with the reason: not a BIS country, no answer, no gap; missing parts are listed, never filled', () => {
  assert.deepEqual(crisisWarning(null, false), { ok: false, reason: 'The BIS does not publish a credit-to-GDP gap for this country' });
  assert.deepEqual(crisisWarning(null, true), { ok: false, reason: 'The BIS has not answered yet' });
  assert.equal((crisisWarning({ fetchedAt: 'x', dsr: qs('2020Q1', [1, 2]) }, true) as { reason: string }).reason, 'The BIS answered without a credit-to-GDP gap for this country');
  const r = crisisWarning({ fetchedAt: 'x', creditGap: qs('2025Q1', [1.5]), creditToGdp: qs('2025Q1', [80]) }, true) as CrisisWarning;
  assert.equal(r.gap.zone, 'below_buffer');
  assert.equal(r.creditChange, undefined);
  assert.equal(r.dsr, undefined);
  assert.equal(r.missing.length, 3);
  assert.match(r.missing[0], /fewer than three years/);
});

test('not validated until the pre-registered test runs; the test file is still pending and unchanged in meaning', () => {
  const e = registerEntry('crisis_warning')!;
  assert.equal(e.status, 'not_validated');
  assert.match(e.testPlan, /Pre-registered on 11 November 2026/);
  const spec = JSON.parse(fs.readFileSync('docs/validation/pending/crisis_warning.json', 'utf8'));
  assert.equal(spec.params.gapThresholdPts, 10);
  assert.match(CRISIS_NOT_RUN, /Laeven and Valencia/);
  assert.ok(!fs.existsSync('docs/validation/preregistered/crisis_warning.json'), 'the runner waits for the licence');
});

test('wired: tool in the catalogue, panel on History & data, route on the server', () => {
  assert.equal(READY_BY_ID.crisis_warning.target.anchor, 'tool-crisis-warning');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-crisis-warning"/);
  assert.match(page, /CrisisWarningPanel/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/crisis-warning\/:iso3/);
});
