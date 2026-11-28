import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { calibrationCoach, reportSummary, tableRows, teamProblems, type ScoredClassEntry } from '../src/utils/classReport';
import { scoreProbability } from '../src/utils/questScoring';
import { registerClassRoutes } from '../src/server/routes/classes';
import { requiredRole } from '../src/utils/permissions';
import type { Account, Role } from '../src/utils/auth';
import type { SeriesSet } from '../src/utils/seriesHistory';

const settled = (accountId: string, p: number, happened: boolean, baseRate: number | null = 0.5): ScoredClassEntry => ({ accountId, assignmentId: 'a', title: 'Q', answer: { probability: p }, at: '2026-12-01', score: { status: 'settled', via: 'rule', readings: [], ...scoreProbability(p, happened, baseRate) } });

test('teams: a name, 3 to 5 students of the class, one team each', () => {
  const isStudent = (id: string) => id.startsWith('s');
  assert.deepEqual(teamProblems('Hawks', ['s1', 's2', 's3'], isStudent, () => false), []);
  assert.match(teamProblems('', ['s1', 's2', 's3'], isStudent, () => false).join(), /name/);
  assert.match(teamProblems('Hawks', ['s1', 's2'], isStudent, () => false).join(), /3 to 5/);
  assert.match(teamProblems('Hawks', ['s1', 's2', 's3', 's4', 's5', 's6'], isStudent, () => false).join(), /3 to 5/);
  assert.match(teamProblems('Hawks', ['s1', 's2', 'prof'], isStudent, () => false).join(), /student of this class/);
  assert.match(teamProblems('Hawks', ['s1', 's2', 's3'], isStudent, (id) => id === 's2').join(), /one team/);
});

test('table rows: per student or per team, best skill first', () => {
  const scored = [settled('s1', 0.9, true), settled('s1', 0.8, true), settled('s2', 0.9, false), { ...settled('s3', 0.5, true), score: { status: 'waiting' as const, note: 'Scored after 2027-01-29' } }];
  const rows = tableRows(scored, (id) => id);
  assert.deepEqual(rows.map((r) => r.key), ['s1', 's2', 's3']);
  assert.equal(rows[0].settled, 2);
  assert.ok((rows[0].probabilitySkill ?? 0) > 0);
  assert.equal(rows[2].settled, 0);
  const teams = tableRows(scored, (id) => (id === 's3' ? null : 'team'));
  assert.equal(teams.length, 1);
  assert.equal(teams[0].entries, 3);
});

test('the report: calibration only after 10 settled answers, and a coach in plain parts', () => {
  const nine = Array.from({ length: 9 }, (_, i) => settled('s1', 0.9, i < 5));
  assert.deepEqual(reportSummary(nine).calibration, { needs: 10, have: 9 });
  const ten = [...nine, settled('s1', 0.9, false)];
  const r = reportSummary(ten);
  assert.ok(!('needs' in r.calibration));
  if (!('needs' in r.calibration)) assert.deepEqual(r.calibration.coach, [{ kind: 'tooSure', said: 0.9, happened: 0.5, n: 10 }]);
  assert.deepEqual(calibrationCoach([{ from: 0.1, to: 0.2, n: 4, said: 0.1, happened: 0.5 }]), [{ kind: 'tooSure', said: 0.1, happened: 0.5, n: 4 }], 'below 50%, too sure means it happened more often than said');
  assert.deepEqual(calibrationCoach([{ from: 0.6, to: 0.7, n: 5, said: 0.6, happened: 1 }]).map((c) => c.kind), ['notSureEnough']);
  assert.deepEqual(calibrationCoach([{ from: 0.7, to: 0.8, n: 2, said: 0.7, happened: 0 }]), [{ kind: 'wellCalibrated', n: 2 }], 'too few answers in a group to say');
  assert.equal(r.beat, 5);
  assert.equal(r.compared, 10);
});

test('a student (Viewer) reads the table and their report; settings and teams need an Analyst', () => {
  assert.equal(requiredRole('GET', '/api/classes/c1/table'), 'viewer');
  assert.equal(requiredRole('GET', '/api/classes/c1/report/me'), 'viewer');
  assert.equal(requiredRole('POST', '/api/classes/c1/teams'), 'analyst');
  assert.equal(requiredRole('POST', '/api/classes/c1/table-settings'), 'analyst');
});

const acct = (id: string, role: Role): Account => ({ id, username: id, displayName: id.toUpperCase(), role, provider: 'local', passwordHash: 'x', createdAt: '2026-11-01', passwordChangedAt: '2026-11-01' });

test('routes: scored class table with views and teams, and one-page reports', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classreport-'));
  const qdir = path.join(dir, 'quests');
  fs.mkdirSync(path.join(qdir, 'drafts'), { recursive: true });
  fs.writeFileSync(path.join(qdir, 'manifest.json'), '{}\n');
  const ids = ['prof', 'ta', 's1', 's2', 's3', 's4'];
  const accounts = new Map<string, Account>(ids.map((id) => [id, acct(id, id === 'prof' ? 'analyst' : 'viewer')]));
  let clock = new Date('2026-12-01T12:00:00Z');
  // Brent rising by 0.1 a day from 2025: the base rate of "higher" is 1, and it was higher.
  const points = Array.from({ length: 900 }, (_, i) => ({ date: new Date(Date.UTC(2025, 0, 1) + i * 86_400_000).toISOString().slice(0, 10), value: 70 + i / 10 }));
  const seriesFor = async (iso3: string): Promise<SeriesSet> => ({ iso3, series: [{ id: 'commodity_eia_rbrte', label: 'Brent crude', unit: '$/bbl', freq: 'daily', source: 'EIA', points }], missing: [] });
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
    seriesFor,
  });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (who: string, method: string, p: string, body?: unknown) => {
    const r = await fetch(`${url}${p}`, { method, headers: { 'Content-Type': 'application/json', 'x-who': who }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: r.status, body: await r.json() };
  };
  try {
    const made = await call('prof', 'POST', '/api/classes', { name: 'Macro', term: { label: 'Winter', starts: '2026-11-30', ends: '2027-03-29' } });
    const id = made.body.class.id as string;
    for (const s of ['s1', 's2', 's3', 's4']) await call(s, 'POST', '/api/classes/join', { code: made.body.class.code });
    await call('prof', 'POST', `/api/classes/${id}/members`, { username: 'ta', role: 'marker' });
    const form = { type: 'forecast', title: 'Will Brent be higher at the end of January?', summary: 'Oil after the winter.', level: 'intro', topic: 'commodities', region: 'Global', country: '', opensOn: '2026-12-01', closesOn: '2026-12-20', series: 'commodity_eia_rbrte', kind: 'direction', op: 'higher', on: '2027-01-29' };
    const q = await call('prof', 'POST', `/api/classes/${id}/class-quests`, form);
    assert.equal(q.status, 200, JSON.stringify(q.body));
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: q.body.id, due: '2026-12-10T23:59', aiRule: 'allowed' })).status, 200);
    const debate = await call('prof', 'POST', `/api/classes/${id}/class-quests`, { ...form, type: 'debate', title: 'Should the oil fund be spent now?', positions: 'Spend\nSave', settlesOn: '2027-01-15' });
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: debate.body.id, due: '2026-12-10T23:59', aiRule: 'allowed', sensitive: true })).status, 200);
    const list = (await call('s1', 'GET', `/api/classes/${id}/assignments`)).body.assignments;
    const fa = list.find((x: { answerKind: string }) => x.answerKind === 'probability').id;
    const da = list.find((x: { answerKind: string }) => x.answerKind === 'position').id;
    const p: Record<string, number> = { s1: 0.9, s2: 0.6, s3: 0.2, s4: 0.5 };
    for (const s of Object.keys(p)) assert.equal((await call(s, 'POST', `/api/classes/${id}/assignments/${fa}/entries`, { answer: { probability: p[s] } })).status, 200);
    assert.equal((await call('s1', 'POST', `/api/classes/${id}/assignments/${da}/entries`, { answer: { position: 1 }, rationale: 'Spending now builds roads while borrowing is cheap.' })).status, 200);

    // Before the Quest settles: entries counted, none settled.
    let t = await call('prof', 'GET', `/api/classes/${id}/table`);
    assert.equal(t.body.tableView, 'own');
    assert.equal(t.body.rows.length, 4);
    assert.equal(t.body.rows.find((r: { name: string }) => r.name === 'S1').entries, 1, 'the sensitive debate is left out of the table');
    assert.equal(t.body.sensitiveLeftOut, true);
    assert.equal(t.body.rows[0].settled, 0);

    clock = new Date('2027-02-05T12:00:00Z');
    t = await call('prof', 'GET', `/api/classes/${id}/table`);
    assert.deepEqual(t.body.rows.map((r: { name: string }) => r.name), ['S1', 'S2', 'S4', 'S3'], 'best skill first');
    assert.ok(t.body.rows[0].brier < t.body.rows[3].brier, 'S1 said 90% and it happened');
    assert.ok(t.body.rows.every((r: { accountId: string }) => r.accountId));

    // Students: only their own row by default; numbers or nicknames when the teacher says.
    let st = await call('s3', 'GET', `/api/classes/${id}/table`);
    assert.deepEqual(st.body.rows.map((r: { name: string; mine: boolean }) => [r.name, r.mine]), [['S3', true]]);
    assert.equal(st.body.rows[0].accountId, undefined);
    assert.equal((await call('s1', 'POST', `/api/classes/${id}/table-settings`, { tableView: 'numbers' })).status, 403);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/table-settings`, { tableView: 'numbers' })).status, 200);
    st = await call('s3', 'GET', `/api/classes/${id}/table`);
    assert.equal(st.body.rows.length, 4);
    assert.ok(st.body.rows.every((r: { name: string; mine: boolean }) => (r.mine ? r.name === 'S3' : /^Student \d$/.test(r.name))));
    await call('prof', 'POST', `/api/classes/${id}/table-settings`, { tableView: 'nicknames' });
    st = await call('s3', 'GET', `/api/classes/${id}/table`);
    assert.ok(st.body.rows.some((r: { name: string }) => r.name === 'S1'));

    // Teams share a row.
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/teams`, { name: 'Hawks', usernames: ['s1', 's2'] })).status, 400);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/teams`, { name: 'Hawks', usernames: ['s1', 's2', 'ta'] })).status, 400, 'a marker is not a student');
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/teams`, { name: 'Hawks', usernames: ['s1', 's2', 's3'] })).status, 200);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/teams`, { name: 'Doves', usernames: ['s3', 's4', 's1'] })).status, 400, 'one team each');
    t = await call('prof', 'GET', `/api/classes/${id}/table`);
    assert.equal(t.body.teams.length, 1);
    assert.equal(t.body.teams[0].entries, 3);
    assert.deepEqual(t.body.teams[0].members, ['S1', 'S2', 'S3']);
    assert.equal(t.body.allTeams.length, 1);
    assert.equal((await call('prof', 'DELETE', `/api/classes/${id}/teams/${t.body.teams[0].id}`)).status, 200);

    // Reports: the teacher for anyone, a student only their own, a marker without the sensitive topic.
    await call('ta', 'POST', `/api/classes/${id}/assignments/${da}/feedback`, { ref: (await call('ta', 'GET', `/api/classes/${id}/assignments/${da}/entries`)).body.entries[0].ref, text: 'Good point on borrowing costs.' });
    const mine = await call('s1', 'GET', `/api/classes/${id}/report/me`);
    assert.equal(mine.status, 200, JSON.stringify(mine.body));
    assert.equal(mine.body.student, 'S1');
    assert.equal(mine.body.summary.settled, 1);
    assert.deepEqual(mine.body.summary.calibration, { needs: 10, have: 1 });
    assert.equal(mine.body.entries.length, 2, 'the student sees their own sensitive entry');
    assert.deepEqual(mine.body.entries.find((e: { positions?: string[] }) => e.positions)?.positions, ['Spend', 'Save']);
    assert.equal(mine.body.feedback[0].text, 'Good point on borrowing costs.');
    assert.equal((await call('s1', 'GET', `/api/classes/${id}/report/s2`)).status, 403);
    const asTeacher = await call('prof', 'GET', `/api/classes/${id}/report/s1`);
    assert.equal(asTeacher.body.entries.length, 2);
    const asMarker = await call('ta', 'GET', `/api/classes/${id}/report/s1`);
    assert.equal(asMarker.body.entries.length, 1, 'a marker does not see the sensitive topic');
    assert.equal(asMarker.body.feedback.length, 0);
    assert.equal((await call('prof', 'GET', `/api/classes/${id}/report/ta`)).status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
