import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import { registerQuestRoutes } from '../src/server/routes/quests';
import { questsEnabled, QUESTS_OFF_REASON } from '../src/utils/quests';
import type { SeriesSet } from '../src/utils/seriesHistory';

async function serve(enabled: boolean, seriesFor: (iso3: string) => Promise<SeriesSet>) {
  const app = express();
  registerQuestRoutes(app, { seriesFor, enabled: () => enabled, dir: path.join(process.cwd(), 'quests') });
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
