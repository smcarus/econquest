import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { checkProfileChange, profileFileText, profilePath, profileProblems, stancesProblems, stanceWords, STANCE_AXES, type StanceProfile } from '../src/utils/questStances';
import { loadProfiles } from '../src/utils/questStanceStore';
import { questProblems } from '../src/utils/quests';
import { registerQuestRoutes } from '../src/server/routes/quests';

const alice: StanceProfile = { login: 'alice', axes: { fx_regime: -2, fiscal: 1 }, shownSince: '2027-01-05' };

test('the axes are about economics, each with two plain positions and topics that exist', () => {
  assert.equal(STANCE_AXES.length, 8);
  const topics = new Set(['monetary', 'fiscal', 'fx', 'external', 'debt', 'growth', 'inflation', 'commodities', 'positioning', 'geopolitics']);
  for (const a of STANCE_AXES) {
    assert.ok(a.first && a.second && a.explain.length > 30, a.id);
    assert.ok(a.topics.every((t) => topics.has(t)), a.id);
    assert.doesNotMatch(`${a.question} ${a.first} ${a.second}`, /\b(left|right|liberal|conservative|socialist|party)\b/i, `${a.id}: no party-political words`);
  }
  assert.equal(stanceWords(STANCE_AXES[2], -2), 'Leans strongly towards: Allowed to float with the market');
  assert.equal(stanceWords(STANCE_AXES[2], 0), 'No lean either way');
  assert.equal(stanceWords(STANCE_AXES[2], undefined), 'Not set');
});

test('a profile names its own login, sets -2 to 2 on known axes, and says when it was first shown', () => {
  assert.deepEqual(profileProblems(JSON.parse(profileFileText(alice)), profilePath('alice')), []);
  assert.deepEqual(Object.keys(JSON.parse(profileFileText(alice)).axes), ['fiscal', 'fx_regime'], 'axes in a fixed order');
  assert.match(profileProblems(alice, profilePath('bob')).join(), /login: must be bob/);
  assert.match(profileProblems({ ...alice, axes: { fx_regime: 3 } }, profilePath('alice')).join(), /whole number from -2 to 2/);
  assert.match(profileProblems({ ...alice, axes: { party: 1 } }, profilePath('alice')).join(), /not one of the axes/);
  assert.match(profileProblems({ ...alice, axes: {} }, profilePath('alice')).join(), /at least one/);
  assert.match(profileProblems({ ...alice, email: 'a@b.c' }, profilePath('alice')).join(), /email: not part of a profile/);
  assert.match(profileProblems(alice, 'quests/profiles/~alice.json').join(), /goes in quests\/profiles/);
  assert.deepEqual(stancesProblems({ trade: 0 }), []);
  assert.match(questProblems({ id: 'profiles' }, { approved: false }).join(), /name of a file or folder/);
});

test('only the person adds or changes their profile; they or a maintainer may remove it; nothing else rides along', () => {
  const read = (p: string) => (p.endsWith('alice.json') ? profileFileText(alice) : '{"login":"bob","axes":{"trade":1},"shownSince":"2027-01-05"}');
  const base = { read, maintainers: ['smcarus'] };
  assert.deepEqual(checkProfileChange({ ...base, files: [{ status: 'A', path: profilePath('alice') }], author: 'alice' }), {});
  assert.deepEqual(checkProfileChange({ ...base, files: [{ status: 'M', path: profilePath('alice') }], author: 'alice' }), {});
  assert.match(checkProfileChange({ ...base, files: [{ status: 'A', path: profilePath('alice') }], author: 'mallory' })[profilePath('alice')].join(), /only show your own stances/);
  assert.match(checkProfileChange({ ...base, files: [{ status: 'A', path: profilePath('alice') }], author: 'smcarus' })[profilePath('alice')].join(), /only show your own/, 'not even a maintainer adds one for someone');
  assert.deepEqual(checkProfileChange({ ...base, files: [{ status: 'D', path: profilePath('alice') }], author: 'smcarus' }), {}, 'a maintainer removes one on request');
  assert.match(checkProfileChange({ ...base, files: [{ status: 'D', path: profilePath('alice') }], author: 'mallory' })[profilePath('alice')].join(), /Only alice or a maintainer/);
  assert.match(checkProfileChange({ ...base, files: [{ status: 'A', path: profilePath('alice') }, { status: 'M', path: 'src/App.tsx' }], author: 'alice' }).change.join(), /holds only profiles/);
  assert.deepEqual(checkProfileChange({ ...base, files: [{ status: 'A', path: 'quests/entries/x/alice.1.json' }], author: 'alice' }), {});
});

test('route: the axes and every valid profile; a broken file is left out', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qst-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  fs.mkdirSync(path.join(dir, 'profiles'));
  fs.writeFileSync(path.join(dir, 'profiles', 'alice.json'), profileFileText(alice));
  fs.writeFileSync(path.join(dir, 'profiles', 'bob.json'), '{"login":"carol","axes":{"trade":1},"shownSince":"2027-01-05"}');
  assert.deepEqual(loadProfiles(dir).map((p) => p.login), ['alice']);
  const app = express();
  registerQuestRoutes(app, { seriesFor: async (iso3) => ({ iso3, series: [], missing: [] }), enabled: () => true, dir, repo: () => 'e-conquest/econquest' });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  try {
    const j = await (await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/quests/stances`)).json();
    assert.equal(j.axes.length, 8);
    assert.deepEqual(j.profiles, [alice]);
    assert.equal(j.repo, 'e-conquest/econquest');
    assert.equal(j.groups, undefined, 'no group tables');
  } finally {
    await new Promise((r) => server.close(r));
  }
});
