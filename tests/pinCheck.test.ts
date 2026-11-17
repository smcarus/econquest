import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeChart, type ChartRequest, type FetchedSeries } from '../src/utils/councilChart';
import { makePin } from '../src/utils/notebookPins';
import { checkPin, pinCheckText } from '../src/utils/pinCheck';
import { TOOLS } from '../src/i18n/messages/tools';

const req: ChartRequest = { series: [{ iso3: 'BRA', countryName: 'Brazil', id: 'cpi_imf', label: 'Inflation' }], tests: [], transform: 'level', why: 'asked', notes: [] } as unknown as ChartRequest;
const series = (points: Array<[string, number]>): FetchedSeries => ({ id: 'cpi_imf', label: 'Inflation', unit: '%', freq: 'A', source: 'IMF WEO', points: points.map(([date, value]) => ({ date, value })) });
const then = series([['2022', 9.3], ['2023', 4.6], ['2024', 4.4]]);
const pin = makePin({ ...computeChart(req, [then]), request: req }, 'a'.repeat(64), new Date('2026-11-17T00:00:00Z'), []);
const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test('Same, with newer figures after the As of day counted, not treated as a change', async () => {
  assert.equal(pin.asOf, '2024');
  const c = await checkPin(pin, reply(series([['2022', 9.3], ['2023', 4.6], ['2024', 4.4], ['2025', 5.1]])));
  assert.equal(c.state, 'same');
  assert.equal(c.newer, 1);
  assert.equal(pinCheckText(c), 'Same: every pinned figure has the same value today. 1 newer figure since the As of day.');
});

test('Revised: old and new value, and a dropped date', async () => {
  const c = await checkPin(pin, reply(series([['2023', 4.7], ['2024', 4.4]])));
  assert.equal(c.state, 'revised');
  assert.equal(c.changeCount, 2);
  assert.deepEqual(c.changes, [{ line: 'Brazil: Inflation', date: '2022', old: 9.3, now: null }, { line: 'Brazil: Inflation', date: '2023', old: 4.6, now: 4.7 }]);
  assert.match(pinCheckText(c), /^Revised: 2 figures changed \(Brazil: Inflation 2022: 9\.3 no longer in the figures; Brazil: Inflation 2023: 4\.6 now 4\.7\)\.$/);
});

test('Source no longer answers, and Cannot for a pin with no request', async () => {
  const c = await checkPin(pin, reply({ reason: 'the IMF did not answer' }, 404));
  assert.equal(c.state, 'gone');
  assert.equal(c.gone[0].line, 'Brazil: Inflation');
  assert.match(pinCheckText(c), /^Source no longer answers: Brazil: Inflation/);
  const bare = { ...pin, chart: { ...pin.chart, request: undefined } };
  assert.equal((await checkPin(bare, reply({}))).state, 'cannot');
});

test('wiring: button, command and text keys', () => {
  assert.match(readFileSync('src/components/ResearchNotebooks.tsx', 'utf8'), /data-notebook-pin-check="true"/);
  assert.match(readFileSync('package.json', 'utf8'), /"notebook:check": "tsx scripts\/notebook-check\.ts"/);
  for (const k of ['nb_check', 'nb_checking', 'nb_checkTitle', 'nb_checkSame', 'nb_checkRevised', 'nb_checkDropped', 'nb_checkGone', 'nb_checkCannot', 'nb_checkNewer']) assert.ok(k in TOOLS.en, k);
});
