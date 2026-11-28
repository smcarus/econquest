import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { replayBaseRate, replayItemProblems, replayPackProblems, replayQuestion, replaySummary, scoreReplay, type ReplayItem } from '../src/utils/questReplays';
import { checkReplayPacks, loadReplayPacks, loadReplayResults } from '../src/utils/questStore';
import { registerQuestRoutes } from '../src/server/routes/quests';
import { requiredRole } from '../src/utils/permissions';
import type { SeriesSet } from '../src/utils/seriesHistory';
import type { Point } from '../src/utils/questScoring';

const T = (en: string) => ({ en, es: en, fr: en, pt: en });
const brent = (over: Partial<ReplayItem> = {}): ReplayItem => ({ id: 'brent', title: T('Brent'), country: 'WLD', series: 'commodity_eia_rbrte', kind: 'direction', op: 'higher', days: 7, level: 'intro', ...over });

/** A daily series rising by 1 a day from 2024-01-01 for `n` days. */
const rising = (n: number, start = 100): Point[] => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2024, 0, 1) + i * 86_400_000).toISOString().slice(0, 10), value: start + i }));

test('the four replay packs on file pass, in every language, with no series figures', () => {
  const dir = path.join(process.cwd(), 'quests');
  assert.deepEqual(checkReplayPacks(dir), {});
  const packs = loadReplayPacks(dir);
  assert.deepEqual(packs.map((p) => p.id).sort(), ['replay-central-banks', 'replay-currencies', 'replay-markets-intro', 'replay-positioning']);
  for (const p of packs) {
    assert.equal(p.weeks.length, 4, `${p.id}: four weeks for the start of a term`);
    assert.doesNotMatch(JSON.stringify([p.title, p.summary, p.weeks.map((w) => [w.title, w.items.map((i) => i.title)])]), /\d/, `${p.id}: no figures in the text`);
  }
  const kinds = new Set(packs.flatMap((p) => p.weeks.flatMap((w) => w.items.map((i) => i.kind))));
  assert.deepEqual([...kinds].sort(), ['between', 'direction', 'level', 'threshold'], 'every rule type is replayed');
});

test('a replay item is checked: a daily or weekly series, a fitting step, a level', () => {
  assert.deepEqual(replayItemProblems(brent()), []);
  assert.match(replayItemProblems(brent({ series: 'gdp_growth', country: 'BRA' })).join(), /daily or weekly series/);
  assert.match(replayItemProblems(brent({ kind: 'threshold', op: 'above' })).join(), /delta/);
  assert.match(replayItemProblems(brent({ kind: 'between', op: undefined, band: 0 })).join(), /band/);
  assert.match(replayItemProblems(brent({ days: 3 })).join(), /days/);
  assert.match(replayItemProblems(brent({ country: 'BRA' })).join(), /world series/);
  assert.match(replayItemProblems(brent({ title: { en: 'x' } as never })).join(), /title.es: missing/);
  assert.match(replayPackProblems({ id: 'p', title: T('P'), summary: T('S'), level: 'intro', weeks: [{ week: 2, title: T('W'), items: [brent()] }] }, 'p.json').join(), /weeks\[0\].week: 1/);
});

test('replays of every rule type are scored at once, with a base rate known on the start day', () => {
  const pts = rising(400);
  const today = '2025-12-31';
  const q = replayQuestion(brent(), pts, today, () => 0.5);
  assert.ok(!('reason' in q));
  if ('reason' in q) return;
  assert.ok(q.start.date >= '2024-07-01', 'leaves 30 weeks of history before the start');
  const s = scoreReplay(q, { probability: 0.9 }, pts);
  assert.ok(!('reason' in s));
  if (!('reason' in s) && s.score.answer === 'probability') {
    assert.equal(s.score.happened, true);
    assert.equal(s.score.baseRate, 1, 'it always rose before the start');
  }
  // threshold: start + 10 within 7 days cannot happen on a series rising 1 a day.
  const th = replayQuestion(brent({ kind: 'threshold', op: 'above', delta: 10 }), pts, today, () => 0.5);
  if ('reason' in th) throw new Error(th.reason);
  assert.equal(th.threshold, th.start.value + 10);
  const ts = scoreReplay(th, { probability: 0.2 }, pts);
  if (!('reason' in ts) && ts.score.answer === 'probability') {
    assert.equal(ts.score.happened, false);
    assert.equal(ts.score.baseRate, 0);
  }
  // between, as a share of the start: within 10% after 7 days always happens here.
  const bw = replayQuestion(brent({ kind: 'between', op: undefined, band: 10, relative: true }), pts, today, () => 0.5);
  if ('reason' in bw) throw new Error(bw.reason);
  assert.ok(Math.abs((bw.high ?? 0) - bw.start.value * 1.1) < 1e-6);
  assert.equal(replayBaseRate(bw, pts, bw.start.date), 1);
  // level: scored against "no change".
  const lv = replayQuestion(brent({ kind: 'level', op: undefined }), pts, today, () => 0.5);
  if ('reason' in lv) throw new Error(lv.reason);
  const ls = scoreReplay(lv, { level: lv.start.value + 7 }, pts);
  if (!('reason' in ls) && ls.score.answer === 'level') {
    assert.equal(ls.score.error, 0);
    assert.equal(ls.score.noChangeError, 7);
  }
  assert.deepEqual(replayQuestion(brent(), rising(100), today, () => 0.5), { reason: 'Not enough history for this replay yet' });
  assert.deepEqual(replaySummary([]), { n: 0, meanSkill: null, beatBase: 0 });
});

test('a student (Viewer) may answer a replay', () => {
  assert.equal(requiredRole('POST', '/api/quests/replays/answer/abc'), 'viewer');
});

test('routes: list the packs, ask a replay, score it once and save it', async () => {
  const pts = rising(800, 60).map((p) => ({ ...p, date: p.date }));
  const seriesFor = async (iso3: string): Promise<SeriesSet> => ({ iso3, series: [{ id: 'commodity_eia_rbrte', label: 'Brent crude', unit: '$/bbl', freq: 'daily', source: 'EIA', points: pts }], missing: [] });
  const replayFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'replays-')), 'local', 'quest-replays.jsonl');
  const app = express();
  app.use(express.json());
  registerQuestRoutes(app, { seriesFor, enabled: () => true, dir: path.join(process.cwd(), 'quests'), replayFile, random: () => 0.5, today: () => '2026-03-01' });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const list = await (await fetch(`${base}/api/quests/replays`)).json();
    assert.equal(list.packs.length, 4);
    assert.equal(list.summary.n, 0);
    const q = await (await fetch(`${base}/api/quests/replays/replay-markets-intro/brent-week-up/new`)).json();
    assert.ok(q.token, JSON.stringify(q));
    assert.equal(q.question.kind, 'direction');
    assert.equal(q.question.end, undefined, 'the answer is not sent with the question');
    const bad = await fetch(`${base}/api/quests/replays/answer/${q.token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: { probability: 2 } }) });
    assert.equal(bad.status, 400);
    const ok = await (await fetch(`${base}/api/quests/replays/answer/${q.token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: { probability: 0.8 } }) })).json();
    assert.equal(ok.score.happened, true);
    const again = await fetch(`${base}/api/quests/replays/answer/${q.token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: { probability: 0.8 } }) });
    assert.equal(again.status, 404, 'scored once');
    const saved = loadReplayResults(replayFile);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].accountId, 'local');
    assert.equal(fs.statSync(replayFile).mode & 0o777, 0o600);
    assert.equal((await (await fetch(`${base}/api/quests/replays`)).json()).summary.n, 1);
    assert.equal((await fetch(`${base}/api/quests/replays/nope/x/new`)).status, 404);
  } finally {
    server.close();
  }
});
