import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { classQuestFrom, classQuestId, shiftClassQuest } from '../src/utils/classQuests';
import { levelsFileProblems, questLevel, questsWithoutLevel } from '../src/utils/questLevels';
import { checkLevels, loadLevels } from '../src/utils/questStore';
import { questProblems, type ForecastQuest } from '../src/utils/quests';
import { registerClassRoutes } from '../src/server/routes/classes';
import { requiredRole } from '../src/utils/permissions';
import type { Account, Role } from '../src/utils/auth';
import { repoQuest } from './repoQuest';

test('levels: a Quest’s own level wins over the map; the repo map names only Quests on file', () => {
  assert.equal(questLevel({ id: 'a', level: 'advanced' }, { a: 'intro' }), 'advanced');
  assert.equal(questLevel({ id: 'a' }, { a: 'intro' }), 'intro');
  assert.equal(questLevel({ id: 'constructor' }, {}), undefined);
  assert.deepEqual(questsWithoutLevel([{ id: 'a' }, { id: 'b', level: 'intro' }], {}), ['a']);
  assert.deepEqual(levelsFileProblems({ levels: { a: 'intro', zz: 'expert' } }, new Set(['a'])), ['levels.zz: no Quest with that id', 'levels.zz: one of intro, intermediate, advanced']);
  assert.match(questProblems({ level: 'expert' }, { approved: false }).join(), /level: one of intro, intermediate, advanced/);
  const repo = path.join(process.cwd(), 'quests');
  assert.deepEqual(checkLevels(repo), {});
  assert.equal(loadLevels(repo)['tutorial-brent-week'], 'intro');
});

test('checkLevels lists a Quest with no level and reads quests/levels.json', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'levels-'));
  fs.mkdirSync(path.join(dir, 'drafts'));
  const brent = repoQuest('tutorial-brent-week.json');
  fs.writeFileSync(path.join(dir, 'drafts', 'tutorial-brent-week.json'), JSON.stringify(brent));
  assert.match(checkLevels(dir).levels[0], /^tutorial-brent-week: no level/);
  fs.writeFileSync(path.join(dir, 'levels.json'), JSON.stringify({ levels: { 'tutorial-brent-week': 'intro' } }));
  assert.deepEqual(checkLevels(dir), {});
  fs.writeFileSync(path.join(dir, 'levels.json'), '{broken');
  assert.match(checkLevels(dir)['quests/levels.json'][0], /not valid JSON/);
});

const form = {
  type: 'forecast',
  title: 'Will Brazil’s policy rate be lower at the end of the term?',
  summary: 'The central bank meets twice before the end of term.',
  level: 'intermediate',
  topic: 'monetary',
  region: 'Americas',
  country: 'bra',
  opensOn: '2026-12-01',
  closesOn: '2026-12-20',
  series: 'policy_rate',
  kind: 'direction',
  op: 'lower',
  on: '2027-01-29',
};

test('a class Quest from the form uses a fixed rule type, an account username and a level', () => {
  assert.equal(classQuestId('Will Brazil’s rate fall?', 'a1b2c3'), 'class-will-brazil-s-rate-fall-a1b2c3');
  assert.equal(classQuestId('¿¿??', 'x9'), 'class-x9');
  const ctx = { id: 'class-brazil-rate-a1', author: 'prof.lee', today: '2026-12-01' };
  const { quest, problems } = classQuestFrom(form, ctx);
  assert.deepEqual(problems, []);
  const q = quest as ForecastQuest;
  assert.deepEqual(q.rule, { kind: 'direction', ref: { country: 'BRA', series: 'policy_rate' }, from: 'closesOn', to: { on: '2027-01-29' }, op: 'lower' });
  assert.equal(q.approvedBy, 'prof.lee');
  assert.equal(q.level, 'intermediate');
  assert.equal(q.fallback, 'unresolvable');
  // Brent is a world series: the country is set to WLD whatever was typed.
  const brent = classQuestFrom({ ...form, series: 'commodity_eia_rbrte', kind: 'threshold', op: 'above', value: '80', country: 'BRA' }, ctx).quest as ForecastQuest;
  assert.deepEqual(brent.rule, { kind: 'threshold', ref: { country: 'WLD', series: 'commodity_eia_rbrte' }, at: { on: '2027-01-29' }, op: 'above', value: 80 });
  // An annual series needs the year it reads.
  assert.match(classQuestFrom({ ...form, series: 'gdp_growth', kind: 'level' }, ctx).problems.join(), /annual series needs the year/);
  assert.deepEqual(classQuestFrom({ ...form, series: 'gdp_growth', kind: 'level', period: '2026', on: '2027-05-01' }, ctx).problems, []);
  assert.deepEqual(classQuestFrom({ ...form, level: 'expert' }, ctx).problems, ['Choose a level: intro, intermediate or advanced']);
  assert.deepEqual(classQuestFrom({ ...form, opensOn: '2026-11-01' }, ctx).problems, ['Entries cannot open before today']);
  assert.match(classQuestFrom({ ...form, kind: 'between' }, ctx).problems.join(), /Choose how the forecast is settled/);
  assert.match(classQuestFrom({ ...form, country: 'ZZZ' }, ctx).problems.join(), /does not cover ZZZ/);
  const debate = classQuestFrom({ ...form, type: 'debate', country: '', positions: 'Cut now\nWait\n', settlesOn: '2027-01-15' }, ctx);
  assert.deepEqual(debate.problems, []);
  assert.deepEqual((debate.quest as { positions: string[] }).positions, ['Cut now', 'Wait']);
  assert.match(classQuestFrom({ ...form, type: 'debate', positions: 'Only one', settlesOn: '2027-01-15' }, ctx).problems.join(), /positions: 2 to 4/);
});

test('a class Quest moves to next term with its dates, and an annual rule reads the next year', () => {
  const ctx = { id: 'class-growth-a1', author: 'prof', today: '2026-01-10' };
  const q = classQuestFrom({ ...form, series: 'gdp_growth', kind: 'direction', period: '2025', on: '2026-05-01', opensOn: '2026-01-10', closesOn: '2026-02-01' }, ctx).quest as ForecastQuest;
  const moved = shiftClassQuest(q, 364, '2027-01-09') as ForecastQuest;
  assert.equal(moved.closesOn, '2027-01-31');
  assert.equal(moved.registeredOn, '2027-01-09');
  assert.deepEqual(q.rule.kind === 'direction' && q.rule.from, { on: '2026-05-01', period: '2024' }, 'an annual direction compares with the year before');
  assert.deepEqual(moved.rule.kind === 'direction' && moved.rule.to, { on: '2027-04-30', period: '2026' });
  assert.deepEqual(moved.rule.kind === 'direction' && moved.rule.from, { on: '2027-04-30', period: '2025' });
});

test('writing a class Quest needs an Analyst, like the rest of the teacher’s work', () => {
  assert.equal(requiredRole('POST', '/api/classes/c1/class-quests'), 'analyst');
  assert.equal(requiredRole('DELETE', '/api/classes/c1/class-quests/q1'), 'analyst');
});

const acct = (id: string, role: Role): Account => ({ id, username: id, displayName: id.toUpperCase(), role, provider: 'local', passwordHash: 'x', createdAt: '2026-11-01', passwordChangedAt: '2026-11-01' });

test('routes: write a class Quest, set it, students see its question, markers see the list, copy to next term', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classq-'));
  const qdir = path.join(dir, 'quests');
  fs.mkdirSync(path.join(qdir, 'drafts'), { recursive: true });
  fs.writeFileSync(path.join(qdir, 'manifest.json'), '{}\n');
  const accounts = new Map<string, Account>(['prof', 'ta', 's1'].map((id) => [id, acct(id, id === 'prof' ? 'analyst' : 'viewer')]));
  const clock = new Date('2026-12-01T12:00:00Z');
  const app = express();
  app.use(express.json());
  registerClassRoutes(app, {
    enabled: () => true,
    file: path.join(dir, 'local', 'classes.json'),
    entriesFile: path.join(dir, 'local', 'class-entries.jsonl'),
    questsDir: qdir,
    authRequired: () => true,
    signedIn: (res) => accounts.get(String(res.req.headers['x-who'] || '')) ?? null,
    accountById: (id) => accounts.get(id),
    accountByUsername: (u) => accounts.get(u),
    makeStudent: () => {
      throw new Error('not used');
    },
    now: () => clock,
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (who: string, method: string, p: string, body?: unknown) => {
    const r = await fetch(`${url}${p}`, { method, headers: { 'Content-Type': 'application/json', 'x-who': who }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: r.status, body: await r.json() };
  };
  try {
    const made = await call('prof', 'POST', '/api/classes', { name: 'Macro', term: { label: 'Winter', starts: '2026-11-30', ends: '2027-01-29' } });
    const id = made.body.class.id as string;
    await call('s1', 'POST', '/api/classes/join', { code: made.body.class.code });
    await call('prof', 'POST', `/api/classes/${id}/members`, { username: 'ta', role: 'marker' });

    const bad = await call('prof', 'POST', `/api/classes/${id}/class-quests`, { ...form, level: '' });
    assert.equal(bad.status, 400);
    const wrote = await call('prof', 'POST', `/api/classes/${id}/class-quests`, form);
    assert.equal(wrote.status, 200, JSON.stringify(wrote.body));
    const qid = wrote.body.id as string;
    assert.match(qid, /^class-will-brazil-s-policy-rate/);
    const file = path.join(dir, 'local', 'class-quests', id, `${qid}.json`);
    assert.ok(fs.existsSync(file), 'kept with the class, not in quests/');
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(fs.readdirSync(qdir).includes(`${qid}.json`), false);
    assert.equal((await call('s1', 'POST', `/api/classes/${id}/class-quests`, form)).status, 403);
    assert.equal((await call('s1', 'GET', `/api/classes/${id}/class-quests`)).status, 403);
    const seen = await call('ta', 'GET', `/api/classes/${id}/class-quests`);
    assert.deepEqual(seen.body.quests.map((q: { id: string; level: string }) => [q.id, q.level]), [[qid, 'intermediate']]);

    const settable = await call('prof', 'GET', `/api/classes/${id}/quests`);
    const row = settable.body.quests.find((q: { id: string }) => q.id === qid);
    assert.equal(row.classQuest, true);
    assert.equal(row.level, 'intermediate');
    const set = await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: qid, due: '2026-12-18T23:59', aiRule: 'allowed' });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    const mine = await call('s1', 'GET', `/api/classes/${id}/assignments`);
    const a = mine.body.assignments[0];
    assert.equal(a.classQuest, true);
    assert.equal(a.summary, form.summary);
    assert.equal(a.rule.kind, 'direction');
    assert.equal(a.answerKind, 'probability');
    const hand = await call('s1', 'POST', `/api/classes/${id}/assignments/${a.id}/entries`, { answer: { probability: 0.6 } });
    assert.equal(hand.status, 200, JSON.stringify(hand.body));
    assert.equal((await call('prof', 'DELETE', `/api/classes/${id}/class-quests/${qid}`)).status, 400, 'set for the class, so it stays');

    // Next term: the assignment and its class Quest move by the gap between the terms.
    const next = await call('prof', 'POST', '/api/classes', { name: 'Macro', term: { label: 'Winter 2028', starts: '2027-11-29', ends: '2028-01-28' } });
    const id2 = next.body.class.id as string;
    const copied = await call('prof', 'POST', `/api/classes/${id2}/copy`, { fromClassId: id });
    assert.deepEqual(copied.body.copied, [form.title]);
    const moved = await call('prof', 'GET', `/api/classes/${id2}/class-quests`);
    assert.equal(moved.body.quests[0].id, qid);
    assert.equal(moved.body.quests[0].closesOn, '2027-12-19');

    // A class Quest no assignment uses can be removed.
    const other = await call('prof', 'POST', `/api/classes/${id}/class-quests`, { ...form, title: 'A second question about the rate' });
    assert.equal((await call('prof', 'DELETE', `/api/classes/${id}/class-quests/${other.body.id}`)).status, 200);
    assert.equal((await call('ta', 'GET', `/api/classes/${id}/class-quests`)).body.quests.length, 1);
  } finally {
    server.close();
  }
});
