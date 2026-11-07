import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { bootstrapMean, calibrationBins, computeStats, MIN } from '../src/utils/questStats';
import type { PublicEntry } from '../src/utils/questPublicEntries';
import type { ResolutionLine } from '../src/utils/questResolve';
import type { ForecastQuest } from '../src/utils/quests';
import { questProblems } from '../src/utils/quests';
import { readQuestFiles } from '../src/utils/questStore';
import { registerQuestRoutes } from '../src/server/routes/quests';

const brent: ForecastQuest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', 'tutorial-brent-week.json'), 'utf8'));

/** n approved Quests, closing a week apart from 2027-01-10, each settled with "happened" alternating and base rate 0.5. */
function world(n: number, topicsFor = (i: number) => (i % 2 ? ['fx'] : ['commodities'])) {
  const quests = Array.from({ length: n }, (_, i) => {
    const close = new Date(Date.parse('2027-01-10T00:00:00Z') + i * 7 * 86_400_000).toISOString().slice(0, 10);
    const to = new Date(Date.parse(`${close}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
    return { quest: { ...brent, id: `q${i + 1}`, author: i === 0 ? 'alice' : 'smcarus', topics: topicsFor(i), opensOn: '2026-12-01', closesOn: close, rule: { ...brent.rule, to: { on: to } }, fallback: 'unresolvable', approvedBy: 'smcarus' } as ForecastQuest, approved: true };
  });
  const lines: ResolutionLine[] = quests.map((q, i) => ({ seq: i + 1, at: `2027-0${1 + Math.floor(i / 10)}-01T00:00:00Z`, kind: 'settled', questId: q.quest.id, questVersion: 1, questHash: 'h', via: 'rule', readings: [], outcome: { answer: 'probability', happened: i % 2 === 0, baseRate: 0.5 }, by: 'smcarus', prev: '', hash: '' }));
  return { quests, lines };
}
const entry = (login: string, q: string, p: number, n = 1): PublicEntry => ({ questId: q, questVersion: 1, questHash: 'h', login, n, answer: { probability: p }, via: login.startsWith('~') ? 'email' : 'pull-request' });

test('every figure needs its minimum, and says how many more', () => {
  const { quests, lines } = world(5);
  const s = computeStats({ quests, entries: quests.map((q, i) => entry('carol', q.quest.id, i % 2 === 0 ? 0.8 : 0.2)), lines, accounts: { carol: '2020-01-01T00:00:00Z' } });
  const c = s.contributors[0];
  assert.equal(c.entered, 5);
  assert.equal(c.settled, 5);
  assert.deepEqual(c.skill, { n: 5, needs: MIN.skill - 5 });
  assert.deepEqual(c.calibration, { n: 5, needs: 25 });
  assert.deepEqual(c.streak, { n: 5, value: 5 });
  assert.match(c.unranked!, /Ranked after 12 settled forecasts/);
  assert.deepEqual(s.board.allTime, []);
  assert.deepEqual(c.proposed, []);
});

test('the scoreboard ranks by skill with a 90% range, needs 12 settled and a 90-day-old account; emailed entries count', () => {
  const { quests, lines } = world(14);
  const entries: PublicEntry[] = [];
  quests.forEach((q, i) => {
    const happened = i % 2 === 0;
    entries.push(entry('alice', q.quest.id, happened ? 0.8 : 0.2)); // good
    entries.push(entry('bob', q.quest.id, happened ? 0.3 : 0.7)); // poor
    entries.push(entry('~amira', q.quest.id, happened ? 0.6 : 0.4)); // a little better than 50%
    entries.push(entry('dan', q.quest.id, happened ? 0.9 : 0.1)); // best, but a new account
  });
  // alice replaced her first entry: the highest number counts.
  entries.push(entry('alice', 'q1', 0.9, 2));
  const s = computeStats({ quests, entries, lines, accounts: { alice: '2015-01-01T00:00:00Z', bob: '2016-01-01T00:00:00Z', dan: '2026-12-20T00:00:00Z' } });
  assert.deepEqual(s.board.allTime.map((r) => r.login), ['alice', '~amira', 'bob']);
  const a = s.board.allTime[0];
  assert.equal(a.n, 14);
  assert.ok(a.low <= a.score && a.score <= a.high);
  assert.ok(a.score > 0 && s.board.allTime[2].score < 0);
  assert.match(s.contributors.find((c) => c.login === 'dan')!.unranked!, /less than 90 days old/);
  const alice = s.contributors.find((c) => c.login === 'alice')!;
  assert.equal(alice.entries.find((e) => e.questId === 'q1')!.p, 0.9);
  assert.deepEqual(alice.proposed, [{ questId: 'q1', entries: 4 }]);
  // bob called the opposite of the crowd's middle answer every time.
  assert.equal(s.contributors.find((c) => c.login === 'bob')!.contrarian.n, 14);
  assert.ok('value' in alice.sharpness && Math.abs(alice.sharpness.value - 0.6143) < 1e-3);
  // Seasons by settle year; fields with 8 or more in the field (7 fx, 7 commodities: none).
  assert.deepEqual(Object.keys(s.board.seasons), ['2027']);
  assert.deepEqual(Object.keys(s.board.fields), ['Global']);
  assert.equal(s.crowd.n, 14);
  // Same files, same intervals.
  assert.deepEqual(computeStats({ quests, entries, lines, accounts: { alice: '2015-01-01T00:00:00Z', bob: '2016-01-01T00:00:00Z', dan: '2026-12-20T00:00:00Z' } }).board, s.board);
});

test('calibration bins and the bootstrap range', () => {
  const rows = [...Array(10).fill({ p: 0.7, happened: true }), ...Array(10).fill({ p: 0.7, happened: false }), { p: 1, happened: true }];
  const c = calibrationBins(rows);
  assert.deepEqual(c.bins.map((b) => [b.from, b.n, b.said, b.happened]), [[0.7, 20, 0.7, 0.5], [0.9, 1, 1, 1]]);
  assert.equal(c.gap, 0.1905);
  const r = bootstrapMean([1, 1, 1, 1], 'x');
  assert.deepEqual(r, { low: 1, high: 1 });
  const w = bootstrapMean([-1, 1, -1, 1, -1, 1], 'x');
  assert.ok(w.low < 0 && w.high > 0);
});

test('stats.json and accounts.json in quests/ are not read as Quests; reserved ids are refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qst-'));
  fs.writeFileSync(path.join(dir, 'stats.json'), '{}');
  fs.writeFileSync(path.join(dir, 'accounts.json'), '{}');
  assert.deepEqual(readQuestFiles(dir), []);
  assert.ok(questProblems({ ...brent, id: 'stats' }, { approved: false }).some((p) => /name of a file or folder/.test(p)));
});

test('GET /api/quests/stats is off with the switch and on works from the files', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qst-'));
  let on = false;
  const app = express();
  registerQuestRoutes(app, { seriesFor: async (iso3) => ({ iso3, series: [], missing: [] }), enabled: () => on, dir, entryFile: path.join(dir, 'e.jsonl') });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await (await fetch(`${base}/api/quests/stats`)).json()).enabled, false);
    on = true;
    const j = await (await fetch(`${base}/api/quests/stats`)).json();
    assert.deepEqual(j.contributors, []);
    assert.deepEqual(j.board.allTime, []);
    fs.writeFileSync(path.join(dir, 'resolutions.jsonl'), 'not json\n');
    assert.match((await (await fetch(`${base}/api/quests/stats`)).json()).error, /broken at line 1/);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
