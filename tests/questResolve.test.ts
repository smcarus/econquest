import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { brokenAt, describeOutcome, firstReadValue, resolveForecast, resultState, type ResolutionDraft, type SeriesData } from '../src/utils/questResolve';
import { appendResolution, loadResolutions, sha256 } from '../src/utils/questResolveStore';
import { registerQuestRoutes, scoreFromRecord } from '../src/server/routes/quests';
import { readQuestFiles, writeManifest } from '../src/utils/questStore';
import type { ForecastQuest } from '../src/utils/quests';
import type { QuestEntry } from '../src/utils/questEntries';
import type { SeriesSet } from '../src/utils/seriesHistory';

const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));

const brent: ForecastQuest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', 'tutorial-brent-week.json'), 'utf8'));
const argDebt: ForecastQuest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', 'arg-debt-2026.json'), 'utf8'));

/** Daily points from `from` for `n` days, value = start + i * step. */
function daily(from: string, n: number, start: number, step: number) {
  const t0 = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => ({ date: new Date(t0 + i * 86_400_000).toISOString().slice(0, 10), value: Math.round((start + i * step) * 100) / 100 }));
}

test('firstReadValue undoes revisions seen after the first download on or after the date', () => {
  const points = [{ date: '2026', value: 90 }];
  // 2026 was 85 in a download before 1 May; the first download after (5 May) moved it to 87; a later one (Oct) to 90.
  const revisions = [
    { date: '2026', from: 85, to: 87, seenAt: '2027-05-05T00:00:00Z', prevPulledAt: '2027-04-20T00:00:00Z' },
    { date: '2026', from: 87, to: 90, seenAt: '2027-10-20T00:00:00Z', prevPulledAt: '2027-05-05T00:00:00Z' },
  ];
  assert.deepEqual(firstReadValue(points, revisions, '2027-10-20T00:00:00Z', '2026', '2027-05-01'), { value: 87, date: '2026' });
  // With no revision since, today's value is the first read.
  assert.deepEqual(firstReadValue(points, [], '2027-10-20T00:00:00Z', '2026', '2027-05-01'), { value: 90, date: '2026' });
  // A revision before the date stands.
  assert.deepEqual(firstReadValue(points, [{ date: '2026', from: 80, to: 90, seenAt: '2027-04-01T00:00:00Z', prevPulledAt: '2027-03-01T00:00:00Z' }], '2027-10-20T00:00:00Z', '2026', '2027-05-01'), { value: 90, date: '2026' });
  // Not downloaded since the date: wait.
  assert.match((firstReadValue(points, [], '2027-04-30T00:00:00Z', '2026', '2027-05-01') as { reason: string }).reason, /yet$/);
  // A year the source later dropped is read from the revision.
  assert.deepEqual(firstReadValue([], [{ date: '2026', from: 88, seenAt: '2027-11-01T00:00:00Z', prevPulledAt: '2027-06-01T00:00:00Z' }], '2027-11-01T00:00:00Z', '2026', '2027-05-01'), { value: 88, date: '2026' });
});

test('resolveForecast settles a daily direction Quest with its base rate, waits when the value is not out, and falls back', () => {
  const pts = daily('2026-01-01', 360, 60, 0.05);
  const data = (d: SeriesData) => () => d;
  const r = resolveForecast(brent, 'h', data({ kind: 'points', points: pts }), '2026-12-20T00:00:00Z', 'maint')!;
  assert.equal(r.kind, 'settled');
  assert.equal(r.via, 'rule');
  assert.deepEqual(r.outcome, { answer: 'probability', happened: true, baseRate: 1 });
  assert.equal(r.readings![0].date, '2026-12-11');
  assert.equal(r.readings![1].date, '2026-12-18');
  // Not published yet.
  assert.equal(resolveForecast(brent, 'h', data({ kind: 'points', points: pts.filter((p) => p.date < '2026-12-15') }), 'x', 'm'), null);
  // The feed did not answer: wait, never Unresolvable.
  assert.equal(resolveForecast(brent, 'h', data({ kind: 'missing', reason: 'The feed did not answer', retry: true }), 'x', 'm'), null);
  // Brent missing for good: WTI decides.
  const fb = resolveForecast(brent, 'h', (ref) => (ref.series === 'commodity_eia_rbrte' ? { kind: 'missing', reason: 'No EIA key set' } : { kind: 'points', points: pts.map((p) => ({ ...p, value: 200 - p.value })) }), 'x', 'm')!;
  assert.equal(fb.via, 'fallback');
  assert.equal(fb.outcome && fb.outcome.answer === 'probability' && fb.outcome.happened, false);
  // Both missing: Unresolvable with the reason.
  const un = resolveForecast(brent, 'h', () => ({ kind: 'missing', reason: 'No EIA key set' }), 'x', 'm')!;
  assert.equal(un.kind, 'unresolvable');
  assert.match(un.reason!, /No EIA key set/);
  assert.match(describeOutcome(un), /^Unresolvable/);
  assert.match(describeOutcome(r), /^Yes, it happened \(.* on 2026-12-11, then .* on 2026-12-18\)\. In past periods/);
});

test('resolveForecast settles an annual Quest on the values as first read', () => {
  const data: SeriesData = {
    kind: 'annual',
    points: [{ date: '2025', value: 80 }, { date: '2026', value: 70 }],
    revisions: [{ date: '2026', from: 82, to: 70, seenAt: '2027-10-15T00:00:00Z', prevPulledAt: '2027-05-03T00:00:00Z' }],
    pulledAt: '2027-10-15T00:00:00Z',
  };
  const r = resolveForecast(argDebt, 'h', () => data, 'x', 'm')!;
  // First read after 1 May: 2025 = 80, 2026 = 82, so debt did not fall; today's revised 70 is ignored.
  assert.deepEqual(r.readings, [{ value: 80, date: '2025' }, { value: 82, date: '2026' }]);
  assert.deepEqual(r.outcome, { answer: 'probability', happened: false, baseRate: null });
  assert.equal(resolveForecast(argDebt, 'h', () => ({ ...data, pulledAt: '2027-04-01T00:00:00Z' }), 'x', 'm'), null);
});

test('the results file is a chain: appended lines link, a changed line is caught, and nothing is written after', () => {
  const file = path.join(tmp('qres-'), 'resolutions.jsonl');
  const d: ResolutionDraft = { at: '2026-12-20T00:00:00Z', kind: 'settled', questId: 'q', questVersion: 1, questHash: 'h', by: 'maint', via: 'rule', readings: [{ value: 1, date: '2026-12-18' }], outcome: { answer: 'probability', happened: true, baseRate: null } };
  const a = appendResolution(file, d);
  const b = appendResolution(file, { ...d, kind: 'note', reason: 'EIA later revised the price', outcome: undefined, readings: undefined, via: undefined });
  assert.equal(a.prev, 'GENESIS');
  assert.equal(b.prev, a.hash);
  assert.equal(b.seq, 2);
  assert.equal(loadResolutions(file).brokenAt, -1);
  assert.equal(brokenAt(loadResolutions(file).lines, sha256), -1);
  const text = fs.readFileSync(file, 'utf8').replace('"happened":true', '"happened":false');
  fs.writeFileSync(file, text);
  assert.equal(loadResolutions(file).brokenAt, 0);
  assert.throws(() => appendResolution(file, d), /broken at line 1/);
  fs.writeFileSync(file, `${text.split('\n')[1]}\n`);
  assert.equal(loadResolutions(file).brokenAt, 0, 'a removed first line breaks the chain');
});

test('resultState: the first result counts, a later decision can make it Unresolvable, a withdrawal before a result wins', () => {
  const base = { at: 'x', questId: 'q', questVersion: 1, questHash: 'h', by: 'm', prev: '', hash: '' };
  const settled = { ...base, seq: 1, kind: 'settled' as const, outcome: { answer: 'probability' as const, happened: true, baseRate: null } };
  assert.equal(resultState([settled], 'q', 1).state, 'settled');
  assert.equal(resultState([settled], 'q', 2).state, 'none');
  const decided = resultState([settled, { ...base, seq: 2, kind: 'decision', decision: 'unresolvable', reason: 'Wrong series' }], 'q', 1);
  assert.equal(decided.state, 'unresolvable');
  assert.equal(resultState([settled, { ...base, seq: 2, kind: 'decision', decision: 'stands', reason: 'Rule followed' }], 'q', 1).state, 'settled');
  assert.equal(resultState([{ ...base, seq: 1, kind: 'withdrawn', reason: 'Source stopped' }], 'q', 1).state, 'withdrawn');
});

test('an entry is scored from the recorded result when there is one', () => {
  const entry = { id: 'e', questId: 'q', questVersion: 1, questHash: 'h', author: 'a', loggedAt: '2026-12-01T00:00:00Z', answer: { probability: 0.8 }, hash: 'x' } as QuestEntry;
  const base = { at: 'x', questId: 'q', questVersion: 1, questHash: 'h', by: 'm', prev: '', hash: '' };
  assert.equal(scoreFromRecord(entry, []), null);
  const s = scoreFromRecord(entry, [{ ...base, seq: 1, kind: 'settled', via: 'rule', readings: [{ value: 2, date: '2026-12-18' }], outcome: { answer: 'probability', happened: true, baseRate: 0.5 } }]);
  assert.equal(s?.status, 'settled');
  assert.ok(s && s.status === 'settled' && s.answer === 'probability' && Math.abs(s.brier - 0.04) < 1e-9 && Math.abs((s.skill ?? 0) - 0.21) < 1e-9);
  assert.match((scoreFromRecord(entry, [{ ...base, seq: 1, kind: 'withdrawn', reason: 'Source stopped' }]) as { note: string }).note, /^Withdrawn: Source stopped/);
});

test('routes: results and due are off with the switch; due lists approved Quests past their date and previews drafts only on request', async () => {
  const dir = tmp('qdir-');
  fs.mkdirSync(path.join(dir, 'drafts'));
  const approved = { ...brent, registeredOn: '2026-11-01', opensOn: '2026-11-02', closesOn: '2026-12-11', approvedBy: 'smcarus' };
  fs.writeFileSync(path.join(dir, 'tutorial-brent-week.json'), `${JSON.stringify(approved, null, 2)}\n`);
  fs.copyFileSync(path.join(process.cwd(), 'quests', 'drafts', 'usa-policy-2027h1.json'), path.join(dir, 'drafts', 'usa-policy-2027h1.json'));
  writeManifest(dir, Object.fromEntries(readQuestFiles(dir).filter((f) => f.approved).map((f) => [f.name, f.hash])));
  const pts = daily('2026-01-01', 360, 60, 0.05);
  const seriesFor = async (iso3: string): Promise<SeriesSet> => ({ iso3, series: [{ id: 'commodity_eia_rbrte', label: 'Brent', unit: '$/bbl', freq: 'daily', source: 'EIA', points: pts }], missing: [] });
  let on = false;
  let today = '2026-12-20';
  const app = express();
  app.use(express.json());
  registerQuestRoutes(app, { seriesFor, enabled: () => on, dir, entryFile: path.join(dir, 'e.jsonl'), today: () => today });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await (await fetch(`${base}/api/quests/due`)).json()).enabled, false);
    assert.equal((await (await fetch(`${base}/api/quests/results`)).json()).enabled, false);
    on = true;
    const due = await (await fetch(`${base}/api/quests/due`)).json();
    assert.equal(due.due.length, 1);
    assert.equal(due.due[0].questId, 'tutorial-brent-week');
    assert.equal(due.due[0].result.kind, 'settled');
    assert.equal(due.due[0].result.questHash, readQuestFiles(dir).find((f) => f.approved)!.hash);
    today = '2026-12-12';
    assert.equal((await (await fetch(`${base}/api/quests/due`)).json()).due.length, 0, 'not before the settle date');
    today = '2027-08-01';
    const withDrafts = await (await fetch(`${base}/api/quests/due?drafts=1`)).json();
    assert.ok(withDrafts.due.some((d: { questId: string; approved: boolean }) => d.questId === 'usa-policy-2027h1' && !d.approved));
    // Once recorded, it is no longer due and shows on the Quest and in the results.
    appendResolution(path.join(dir, 'resolutions.jsonl'), { ...due.due[0].result, by: 'smcarus' });
    assert.equal((await (await fetch(`${base}/api/quests/due`)).json()).due.length, 0);
    const res = await (await fetch(`${base}/api/quests/results`)).json();
    assert.equal(res.chain, 'holds');
    assert.equal(res.quests[0].state, 'settled');
    const q = await (await fetch(`${base}/api/quests/tutorial-brent-week`)).json();
    assert.equal(q.result.state, 'settled');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
