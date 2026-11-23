import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dueChecks, eventKey, MAX_CHECKS, recordCheck, releaseWatchView, releasesInWindow, watchSources, pruneState } from '../src/utils/releaseWatch.ts';
import { latestMonth, releaseWatchTick } from '../src/server/releaseWatch.ts';
import type { OfficialCalendarEvent } from '../src/data/officialCalendar.ts';

const ev = (iso3: string, category: OfficialCalendarEvent['category'], date: string): OfficialCalendarEvent => ({ iso3, category, title: `${iso3} ${category}`, date, sourceName: 'x', sourceUrl: 'https://example.org', primarySource: true, retrieved: '2026-11-01' });
const EVENTS = [ev('USA', 'CPI_RELEASE', '2026-11-23'), ev('GBR', 'GDP_RELEASE', '2026-11-23'), ev('CAN', 'CPI_RELEASE', '2026-11-22'), ev('MEX', 'ACTIVITY_RELEASE', '2026-11-26'), ev('JPN', 'CPI_RELEASE', '2026-11-20'), ev('USA', 'MPC_DECISION', '2026-11-23')];
const at = (iso: string) => new Date(iso);

test('the watch covers CPI and activity releases on the day and the day after; GDP has no same-day source', () => {
  assert.deepEqual(watchSources('USA', 'CPI_RELEASE'), ['us_cpi', 'imf_cpi']);
  assert.deepEqual(watchSources('CAN', 'CPI_RELEASE'), ['imf_cpi']);
  assert.deepEqual(watchSources('MEX', 'ACTIVITY_RELEASE'), ['activity']);
  assert.deepEqual(watchSources('GBR', 'GDP_RELEASE'), []);
  const now = at('2026-11-23T15:00:00Z');
  assert.deepEqual(releasesInWindow(EVENTS, now).map(eventKey), ['USA:CPI_RELEASE:2026-11-23', 'GBR:GDP_RELEASE:2026-11-23', 'CAN:CPI_RELEASE:2026-11-22']);
  assert.deepEqual(dueChecks(EVENTS, {}, now).map((e) => e.iso3), ['USA', 'CAN'], 'GDP is not re-read; a decision is not a release');
});

test('a check an hour apart, up to 12, until a newer month arrives', () => {
  const now = at('2026-11-23T15:00:00Z');
  const first = recordCheck(undefined, { us_cpi: '2026-09', imf_cpi: '2026-08' }, { us_cpi: '2026-09', imf_cpi: '2026-08' }, now);
  assert.equal(first.checks, 1);
  assert.equal(first.arrived, undefined);
  let state = { 'USA:CPI_RELEASE:2026-11-23': first };
  assert.equal(dueChecks(EVENTS, state, at('2026-11-23T15:30:00Z')).some((e) => e.iso3 === 'USA'), false, 'not twice within the hour');
  assert.equal(dueChecks(EVENTS, state, at('2026-11-23T16:00:00Z')).some((e) => e.iso3 === 'USA'), true);
  const second = recordCheck(first, {}, { us_cpi: '2026-10', imf_cpi: '2026-08' }, at('2026-11-23T16:00:00Z'));
  assert.deepEqual(second.arrived, { at: '2026-11-23T16:00:00.000Z', source: 'us_cpi', period: '2026-10' });
  state = { 'USA:CPI_RELEASE:2026-11-23': second };
  assert.equal(dueChecks(EVENTS, state, at('2026-11-23T18:00:00Z')).some((e) => e.iso3 === 'USA'), false, 'stops once it arrived');
  // A month already in before the first check (the release came out before the app looked) counts too.
  const early = recordCheck(undefined, { imf_cpi: '2026-09' }, { imf_cpi: '2026-10' }, now);
  assert.equal(early.arrived?.period, '2026-10');
  // An unknown starting point never counts as new.
  assert.equal(recordCheck(undefined, { imf_cpi: null }, { imf_cpi: '2026-10' }, now).arrived, undefined);
  const capped = { 'CAN:CPI_RELEASE:2026-11-22': { before: {}, checks: MAX_CHECKS, lastCheck: '2026-11-23T01:00:00Z' } };
  assert.equal(dueChecks(EVENTS, capped, now).some((e) => e.iso3 === 'CAN'), false);
});

test('the view: arrived, waiting, no newer month, coming and not re-read', () => {
  const now = at('2026-11-23T15:00:00Z');
  const state = {
    'USA:CPI_RELEASE:2026-11-23': { before: {}, checks: 2, lastCheck: '2026-11-23T14:00:00Z', arrived: { at: '2026-11-23T14:00:00Z', source: 'us_cpi' as const, period: '2026-10' } },
    'CAN:CPI_RELEASE:2026-11-22': { before: {}, checks: MAX_CHECKS, lastCheck: '2026-11-23T10:00:00Z' },
  };
  const rows = releaseWatchView(EVENTS, state, now);
  assert.deepEqual(rows.map((r) => [r.iso3, r.status]), [['CAN', 'no_new_month'], ['GBR', 'not_rechecked'], ['USA', 'arrived'], ['MEX', 'coming']]);
  assert.ok(!rows.some((r) => r.iso3 === 'JPN'), 'older than yesterday is left out');
  assert.deepEqual(Object.keys(pruneState({ 'X:CPI_RELEASE:2026-11-01': state['CAN:CPI_RELEASE:2026-11-22'], ...state }, now)), Object.keys(state));
});

test('one pass re-reads each source once, saves the state and finds the new month', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'econquest-release-watch-'));
  try {
    const calls: string[] = [];
    const saved = () => ({ surprises: { usCpi: [{ period: '2026-09', value: 0.3 }] } as never, imf: { pulledAt: 'x', series: { USA: { points: [{ period: '2026-08', value: 1 }], short: '', long: '' }, CAN: { points: [{ period: '2026-09', value: 1 }], short: '', long: '' } } } });
    let round = 0;
    const fetch = async (src: string) => {
      calls.push(src);
      if (src === 'us_cpi') return { surprises: { usCpi: [{ period: round ? '2026-10' : '2026-09', value: 0.2 }] } as never };
      return null; // the IMF did not answer
    };
    const lines1 = await releaseWatchTick({ events: EVENTS, dataDir: dir, now: () => at('2026-11-23T13:00:00Z'), saved, fetch });
    assert.deepEqual(calls.sort(), ['imf_cpi', 'us_cpi'], 'once per source, though two releases need the IMF');
    assert.match(lines1.join('\n'), /USA USA CPI_RELEASE: check 1, no newer month yet \(imf_cpi did not answer\)/);
    round = 1;
    const lines2 = await releaseWatchTick({ events: EVENTS, dataDir: dir, now: () => at('2026-11-23T14:00:00Z'), saved, fetch });
    assert.match(lines2.join('\n'), /USA USA CPI_RELEASE: new month 2026-10 \(us_cpi\)/);
    const state = JSON.parse(readFileSync(path.join(dir, 'local', 'release-watch.json'), 'utf8'));
    assert.equal(state['USA:CPI_RELEASE:2026-11-23'].arrived.period, '2026-10');
    assert.equal(state['CAN:CPI_RELEASE:2026-11-22'].checks, 2);
    assert.equal(latestMonth('activity', 'MEX', { activity: { pulledAt: 'x', countries: { MEX: { ip: { points: [{ period: '2026-08', value: 1 }] }, unemp: { points: [{ period: '2026-09', value: 3 }] } } } } as never }), '2026-09');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
