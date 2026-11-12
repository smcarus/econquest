import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { registerQuestRoutes } from '../src/server/routes/quests';
import { questsEnabled, QUESTS_OFF_REASON } from '../src/utils/quests';
import type { SeriesSet } from '../src/utils/seriesHistory';

async function serve(enabled: boolean, seriesFor: (iso3: string) => Promise<SeriesSet>, entryFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qr-')), 'e.jsonl')) {
  const app = express();
  app.use(express.json());
  registerQuestRoutes(app, { seriesFor, enabled: () => enabled, dir: path.join(process.cwd(), 'quests'), entryFile, random: () => 0.5 });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => new Promise((r) => server.close(r)) };
}

const set = (iso3: string): SeriesSet => ({
  iso3,
  series: [{ id: 'policy_rate', label: 'Policy rate', unit: '%', freq: 'daily', source: 'BIS central bank policy rates', points: [{ date: '2026-11-06', value: 10.5 }] }],
  missing: [{ id: 'commodity_eia_rbrte', label: 'Brent', reason: 'No EIA key set' }],
});

test('Quests are off unless QUESTS_ENABLED says on', () => {
  for (const v of [undefined, '', 'off', 'false', '0', 'maybe']) assert.equal(questsEnabled(v), false, String(v));
  for (const v of ['on', 'ON', 'true', '1', 'yes', ' on ']) assert.equal(questsEnabled(v), true, v);
});

test('while off, every Quests route answers only that they are off', async () => {
  const s = await serve(false, async (i) => set(i));
  try {
    for (const p of ['/api/quests', '/api/quests/tur-policy-2027h1']) {
      const j = await (await fetch(s.base + p)).json();
      assert.deepEqual(j, { enabled: false, reason: QUESTS_OFF_REASON });
    }
  } finally {
    await s.close();
  }
});

test('when on, the list and a Quest come back with live figures or Missing with a reason', async () => {
  const s = await serve(true, async (i) => set(i));
  try {
    const list = await (await fetch(`${s.base}/api/quests`)).json();
    assert.equal(list.enabled, true);
    assert.ok(list.quests.length >= 10);
    assert.ok(list.quests.every((q: { approved: boolean; status: string }) => q.approved || q.status === 'draft'));
    const tur = await (await fetch(`${s.base}/api/quests/tur-policy-2027h1`)).json();
    assert.match(tur.rule, /^Yes if Central bank policy rate \(TUR\)/);
    assert.deepEqual(tur.figures[0], { country: 'TUR', series: 'policy_rate', label: 'Central bank policy rate (TUR)', value: 10.5, date: '2026-11-06', unit: '%', source: 'BIS central bank policy rates', freq: 'daily' });
    const brent = await (await fetch(`${s.base}/api/quests/tutorial-brent-week`)).json();
    assert.equal(brent.figures[0].missing, 'No EIA key set');
    const debate = await (await fetch(`${s.base}/api/quests/egy-reserves-debate`)).json();
    assert.deepEqual(debate.figures, []);
    assert.equal((await fetch(`${s.base}/api/quests/nope`)).status, 404);
  } finally {
    await s.close();
  }
});

test('a feed that throws shows as Missing, not as a number', async () => {
  const s = await serve(true, async () => {
    throw new Error('down');
  });
  try {
    const j = await (await fetch(`${s.base}/api/quests/tur-policy-2027h1`)).json();
    assert.equal(j.figures[0].missing, 'The feed did not answer');
    assert.equal('value' in j.figures[0], false);
  } finally {
    await s.close();
  }
});

const longSet = (iso3: string): SeriesSet => {
  const points = [];
  for (let d = Date.parse('2018-01-01T00:00:00Z'); d <= Date.parse('2026-11-01T00:00:00Z'); d += 86_400_000) points.push({ date: new Date(d).toISOString().slice(0, 10), value: 10 + Math.sin(d / 5e9) * 3 });
  return { iso3, series: [{ id: 'policy_rate', label: 'Policy rate', unit: '%', freq: 'daily', source: 'BIS', points }], missing: [] };
};

test('private entries: logged, hashed, listed as counted, and refused when the answer is wrong', async () => {
  const s = await serve(true, async (i) => longSet(i));
  try {
    const post = (body: unknown) => fetch(`${s.base}/api/quests/tur-policy-2027h1/private`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post({ answer: { probability: 2 } })).status, 400);
    assert.equal((await post({ answer: { level: 30 } })).status, 400);
    const ok = await (await post({ answer: { probability: 0.6 }, rationale: 'disinflation', group: 'econ101' })).json();
    assert.equal(ok.entry.author, 'local user');
    assert.match(ok.entry.hash, /^[0-9a-f]{64}$/);
    await post({ answer: { probability: 0.7 }, group: 'econ101' });
    const mine = await (await fetch(`${s.base}/api/quests/private`)).json();
    assert.equal(mine.entries.length, 2);
    assert.deepEqual(mine.entries.map((e: { counted: boolean }) => e.counted), [true, false]);
    assert.equal(mine.entries[0].score.status, 'open');
    const cls = await (await fetch(`${s.base}/api/quests/class/econ101`)).json();
    assert.deepEqual(cls.rows.map((r: { author: string; entries: number }) => [r.author, r.entries]), [['local user', 1]]);
    assert.equal((await fetch(`${s.base}/api/quests/class/bad%20code`)).status, 400);
    // A Debate Quest takes entries from step 9: a position and an argument (tests/questDebate.test.ts).
    const debateReply = await fetch(`${s.base}/api/quests/egy-reserves-debate/private`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(debateReply.status, 400);
    assert.match((await debateReply.json()).error, /pick a position/);
    // A Signal Quest test is entered in public only, so it is fixed in the open (tests/questSignal.test.ts).
    const signalReply = await fetch(`${s.base}/api/quests/credit-gap-crisis-signal/private`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(signalReply.status, 400);
    assert.match((await signalReply.json()).error, /entered in public/);
    assert.equal((await fetch(`${s.base}/api/quests/no-such-quest/private`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 404);
  } finally {
    await s.close();
  }
});

test('practice: a past question with the answer hidden, scored once, then gone', async () => {
  const s = await serve(true, async (i) => longSet(i));
  try {
    const q = await (await fetch(`${s.base}/api/quests/tur-policy-2027h1/practice`)).json();
    assert.ok(q.token, JSON.stringify(q));
    assert.ok(q.endDate < new Date().toISOString().slice(0, 10));
    assert.equal('end' in q, false);
    const ans = (p: number) => fetch(`${s.base}/api/quests/practice/${q.token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ probability: p }) });
    const r = await (await ans(0.5)).json();
    assert.equal(typeof r.happened, 'boolean');
    assert.equal(r.brier, 0.25);
    assert.equal((await ans(0.5)).status, 404);
    const lvl = await (await fetch(`${s.base}/api/quests/mex-policy-level-2027-03/practice`)).json();
    assert.match(lvl.error, /higher or lower/);
  } finally {
    await s.close();
  }
});

test('while off, the private and practice routes say only that Quests are off', async () => {
  const s = await serve(false, async (i) => longSet(i));
  try {
    for (const [m, p] of [['GET', '/api/quests/private'], ['GET', '/api/quests/class/x'], ['GET', '/api/quests/tur-policy-2027h1/practice'], ['POST', '/api/quests/tur-policy-2027h1/private'], ['POST', '/api/quests/practice/abc']]) {
      const j = await (await fetch(s.base + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: m === 'POST' ? '{}' : undefined })).json();
      assert.equal(j.enabled, false, p);
    }
  } finally {
    await s.close();
  }
});
