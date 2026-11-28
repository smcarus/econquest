import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { sealFingerprint, sealHandIn, sealedProblems, sheetProblems, type HandInSheet } from '../src/utils/classHandIn';
import { registerClassRoutes } from '../src/server/routes/classes';
import { requiredRole } from '../src/utils/permissions';
import type { Account, Role } from '../src/utils/auth';

test('sheets and sealed files are checked before anything else', () => {
  assert.match(sheetProblems({ kind: 'x' }).join(), /not a hand-in sheet/);
  assert.match(sealedProblems({}).join(), /not a sealed hand-in/);
  assert.equal(requiredRole('POST', '/api/classes/c1/assignments/a1/hand-ins'), 'analyst', 'the teacher loads hand-ins');
});

const acct = (id: string, role: Role): Account => ({ id, username: id, displayName: id.toUpperCase(), role, provider: 'local', passwordHash: 'x', createdAt: '2026-11-01', passwordChangedAt: '2026-11-01' });

test('routes: a sheet, a sealed hand-in from a student copy, loaded once; changed or foreign files are refused', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classhandin-'));
  const qdir = path.join(dir, 'quests');
  fs.mkdirSync(path.join(qdir, 'drafts'), { recursive: true });
  fs.writeFileSync(path.join(qdir, 'manifest.json'), '{}\n');
  const accounts = new Map<string, Account>(['prof', 's1', 's2'].map((id) => [id, acct(id, id === 'prof' ? 'analyst' : 'viewer')]));
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
    const made = await call('prof', 'POST', '/api/classes', { name: 'Macro', term: { label: 'Winter', starts: '2026-11-30', ends: '2027-02-15' } });
    const id = made.body.class.id as string;
    for (const s of ['s1', 's2']) await call(s, 'POST', '/api/classes/join', { code: made.body.class.code });
    const form = { type: 'forecast', title: 'Will Brent be higher at the end of January?', summary: 'Oil after the winter.', level: 'intro', topic: 'commodities', region: 'Global', country: '', opensOn: '2026-12-01', closesOn: '2026-12-20', series: 'commodity_eia_rbrte', kind: 'direction', op: 'higher', on: '2027-01-29' };
    const q = await call('prof', 'POST', `/api/classes/${id}/class-quests`, form);
    await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: q.body.id, due: '2026-12-10T23:59', aiRule: 'note' });
    const aid = (await call('prof', 'GET', `/api/classes/${id}/assignments`)).body.assignments[0].id;
    assert.equal((await call('s1', 'GET', `/api/classes/${id}/assignments/${aid}/sheet`)).status, 403);
    const sheet = (await call('prof', 'GET', `/api/classes/${id}/assignments/${aid}/sheet`)).body as HandInSheet;
    assert.deepEqual(sheetProblems(sheet), []);
    assert.equal(sheet.answerKind, 'probability');
    assert.ok(!JSON.stringify(sheet).includes('PRIVATE'), 'the sheet holds the public key only');
    assert.ok(!fs.readFileSync(path.join(dir, 'local', 'classes.json'), 'utf8').includes('"handInKey": null'));
    assert.equal((await call('prof', 'GET', `/api/classes/${id}`)).body.class.handInKey, undefined);

    const payload = { username: 's1', name: 'S1', answer: { probability: 0.7 }, rationale: 'Winter demand.', aiNote: 'I did not use AI tools.', sealedAt: '2026-12-05T10:00:00.000Z', sheetId: sheet.sheetId, questHash: sheet.questHash };
    const sealed = await sealHandIn(sheet, payload);
    assert.deepEqual(sealedProblems(sealed), []);
    assert.ok(!JSON.stringify(sealed).includes('Winter demand'), 'the answer is not readable in the file');
    const loaded = await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed });
    assert.equal(loaded.status, 200, JSON.stringify(loaded.body));
    assert.equal(loaded.body.student, 'S1');
    assert.equal(loaded.body.late, false);
    assert.equal(loaded.body.fingerprint, await sealFingerprint(sealed), 'the student and the teacher see the same fingerprint');
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed })).status, 409, 'loaded once');
    const entries = (await call('prof', 'GET', `/api/classes/${id}/assignments/${aid}/entries`)).body.entries;
    assert.equal(entries[0].handIn, true);
    assert.equal(entries[0].answer.probability, 0.7);

    // A changed file, another student's username, a missing AI note, a late time.
    const tampered = { ...sealed, data: sealed.data.slice(0, -4) + (sealed.data.endsWith('AAAA') ? 'BBBB' : 'AAAA') };
    assert.match((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed: tampered })).body.error, /cannot be opened/);
    assert.match((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed: await sealHandIn(sheet, { ...payload, username: 'nobody' }) })).body.error, /not a student in this class/);
    assert.match((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed: await sealHandIn(sheet, { ...payload, username: 's2', aiNote: '' }) })).body.error, /AI tools/);
    const late = await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed: await sealHandIn(sheet, { ...payload, username: 's2', sealedAt: '2026-12-12T10:00:00.000Z' }) });
    assert.equal(late.body.late, true, 'loaded, and shown as late');
    assert.match((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed: { ...sealed, assignmentId: 'other' } })).body.error, /another assignment/);

    // A sheet from another class cannot be loaded here.
    const other = await call('prof', 'POST', '/api/classes', { name: 'Other', term: { label: 'Winter', starts: '2026-11-30', ends: '2027-02-15' } });
    const fake = { ...sheet, classId: other.body.class.id };
    const foreign = await sealHandIn(fake, payload);
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments/${aid}/hand-ins`, { sealed: foreign })).status, 400);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
