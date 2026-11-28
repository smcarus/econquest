import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { entryRef, feedbackProblems, latestBy, peerAllocation, reviewProblems, sensitiveAssignmentIds } from '../src/utils/classFeedback';
import { registerClassRoutes } from '../src/server/routes/classes';
import { requiredRole } from '../src/utils/permissions';
import type { Account, Role } from '../src/utils/auth';
import type { ClassAssignment } from '../src/utils/classAssignments';

test('peer review: each student gets two classmates, never their own, and each argument gets two reviewers', () => {
  const ids = ['s1', 's2', 's3', 's4', 's5'];
  const m = peerAllocation('a1', ids);
  assert.deepEqual([...m.keys()].sort(), ids);
  const received = new Map<string, number>();
  for (const [reviewer, authors] of m) {
    assert.equal(authors.length, 2);
    assert.ok(!authors.includes(reviewer));
    for (const a of authors) received.set(a, (received.get(a) ?? 0) + 1);
  }
  assert.ok([...received.values()].every((n) => n === 2));
  assert.deepEqual(peerAllocation('a1', ['s1', 's2']).get('s1'), ['s2'], 'with two students each reviews the other');
  assert.deepEqual(peerAllocation('a1', ['s1']).get('s1'), []);
  assert.deepEqual([...peerAllocation('a1', ids)], [...peerAllocation('a1', [...ids].reverse())], 'the order does not depend on who handed in first');
});

test('feedback and review checks; refs need the class key', () => {
  assert.deepEqual(feedbackProblems('Good use of the data.', 'B+'), []);
  assert.match(feedbackProblems('', '').join(), /Write the feedback/);
  assert.match(feedbackProblems('ok', 'x'.repeat(21)).join(), /at most 20/);
  assert.match(reviewProblems('Nice.').join(), /at least 20/);
  assert.notEqual(entryRef('k1', 'a1', 's1'), entryRef('k2', 'a1', 's1'));
  assert.match(entryRef('k1', 'a1', 's1'), /^[0-9a-f]{16}$/);
  assert.deepEqual(latestBy([{ k: 'a', at: '1' }, { k: 'a', at: '2' }, { k: 'b', at: '3' }], (r) => r.k).map((r) => r.at), ['2', '3']);
  assert.deepEqual([...sensitiveAssignmentIds([{ id: 'x', sensitive: true }, { id: 'y' }] as ClassAssignment[])], ['x']);
});

test('a student or marker on a Viewer account may write feedback and peer reviews; settings need an Analyst', () => {
  assert.equal(requiredRole('POST', '/api/classes/c1/assignments/a1/feedback'), 'viewer');
  assert.equal(requiredRole('POST', '/api/classes/c1/assignments/a1/peer'), 'viewer');
  assert.equal(requiredRole('POST', '/api/classes/c1/assignments/a1/settings'), 'analyst');
});

const acct = (id: string, role: Role): Account => ({ id, username: id, displayName: id.toUpperCase(), role, provider: 'local', passwordHash: 'x', createdAt: '2026-11-01', passwordChangedAt: '2026-11-01' });

test('routes: feedback on entries, anonymous peer review on a debate, a sensitive topic hides names', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'classfb-'));
  const qdir = path.join(dir, 'quests');
  fs.mkdirSync(path.join(qdir, 'drafts'), { recursive: true });
  fs.writeFileSync(path.join(qdir, 'manifest.json'), '{}\n');
  const accounts = new Map<string, Account>(['prof', 'ta', 's1', 's2', 's3'].map((id) => [id, acct(id, id === 'prof' ? 'analyst' : 'viewer')]));
  let clock = new Date('2026-12-01T12:00:00Z');
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
    assert.equal(made.body.class.refSecret, undefined, 'the class key never leaves the server');
    for (const s of ['s1', 's2', 's3']) await call(s, 'POST', '/api/classes/join', { code: made.body.class.code });
    await call('prof', 'POST', `/api/classes/${id}/members`, { username: 'ta', role: 'marker' });
    const debate = { type: 'debate', title: 'Should the central bank cut now?', summary: 'Inflation is falling but wages are rising fast.', level: 'intro', topic: 'monetary', region: 'Global', country: '', opensOn: '2026-12-01', closesOn: '2026-12-20', positions: 'Cut now\nWait', settlesOn: '2027-01-15' };
    const wrote = await call('prof', 'POST', `/api/classes/${id}/class-quests`, debate);
    assert.equal(wrote.status, 200, JSON.stringify(wrote.body));
    const forecast = { ...debate, type: 'forecast', title: 'Will Brazil’s policy rate be lower?', country: 'bra', series: 'policy_rate', kind: 'direction', op: 'lower', on: '2027-01-29' };
    const wroteF = await call('prof', 'POST', `/api/classes/${id}/class-quests`, forecast);
    assert.equal(wroteF.status, 200, JSON.stringify(wroteF.body));
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: wroteF.body.id, due: '2026-12-10T23:59', aiRule: 'allowed', peerReview: true })).status, 400, 'peer review is for debates');
    assert.equal((await call('prof', 'POST', `/api/classes/${id}/assignments`, { questId: wrote.body.id, due: '2026-12-10T23:59', aiRule: 'allowed', peerReview: true, sensitive: true })).status, 200);
    const list = await call('s1', 'GET', `/api/classes/${id}/assignments`);
    const aid = list.body.assignments[0].id as string;
    assert.equal(list.body.assignments[0].peerReview, true);
    assert.equal(list.body.assignments[0].sensitive, true);
    const A = `/api/classes/${id}/assignments/${aid}`;

    const args: Record<string, string> = { s1: 'Inflation expectations are anchored, so waiting costs jobs.', s2: 'Wage growth will push services prices up again next year.', s3: 'The currency is weak, so a cut risks imported inflation.' };
    for (const s of ['s1', 's2', 's3']) {
      const r = await call(s, 'POST', `${A}/entries`, { answer: { position: s === 's1' ? 1 : 2 }, rationale: args[s] });
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal((await call('prof', 'POST', `${A}/settings`, { sensitive: false })).status, 400, 'a sensitive topic stays so once entries are in');

    // The teacher sees names; the marker sees "Student n" and no usernames.
    const teacher = await call('prof', 'GET', `${A}/entries`);
    assert.deepEqual(teacher.body.entries.map((e: { name: string }) => e.name), ['S1', 'S2', 'S3']);
    const marker = await call('ta', 'GET', `${A}/entries`);
    assert.equal(marker.body.namesHidden, true);
    assert.ok(marker.body.entries.every((e: { name: string; username: string }) => /^Student \d$/.test(e.name) && e.username === ''));
    const ref = marker.body.entries[0].ref as string;
    assert.match(ref, /^[0-9a-f]{16}$/);

    // Feedback: markers write by ref; a newer note from the same marker replaces the old one.
    assert.equal((await call('s1', 'POST', `${A}/feedback`, { ref, text: 'Nice' })).status, 403);
    assert.equal((await call('ta', 'POST', `${A}/feedback`, { ref: '0000000000000000', text: 'Nice' })).status, 404);
    assert.equal((await call('ta', 'POST', `${A}/feedback`, { ref, text: 'Cite a figure.' })).status, 200);
    assert.equal((await call('ta', 'POST', `${A}/feedback`, { ref, text: 'Cite a figure for wages.', mark: 'B+' })).status, 200);
    assert.equal((await call('prof', 'POST', `${A}/feedback`, { ref, text: 'Agree with the marker.' })).status, 200);
    const fbAll = await call('ta', 'GET', `${A}/feedback`);
    assert.equal(fbAll.body.feedback.length, 2);
    assert.match(fbAll.body.feedback[0].student, /^Student \d$/);
    const owner = [...accounts.keys()].find((k) => k.startsWith('s') && teacher.body.entries.find((e: { ref: string; name: string }) => e.ref === ref)?.name === k.toUpperCase())!;
    const mine = await call(owner, 'GET', `${A}/feedback`);
    assert.deepEqual(mine.body.feedback.map((f: { text: string; mark: string }) => [f.text, f.mark]), [['Cite a figure for wages.', 'B+'], ['Agree with the marker.', '']]);
    const other = ['s1', 's2', 's3'].find((s) => s !== owner)!;
    assert.equal((await call(other, 'GET', `${A}/feedback`)).body.feedback.length, 0, 'a student sees only feedback on their own entry');

    // Peer review opens after the due time; each student reviews two arguments without names.
    const early = await call('s1', 'GET', `${A}/peer`);
    assert.equal(early.body.open, false);
    assert.deepEqual(early.body.toReview, []);
    clock = new Date('2026-12-12T12:00:00Z');
    const p1 = await call('s1', 'GET', `${A}/peer`);
    assert.equal(p1.body.open, true);
    assert.equal(p1.body.toReview.length, 2);
    assert.ok(p1.body.toReview.every((x: { rationale: string; label: string }) => x.rationale !== args.s1 && /^Classmate [AB]$/.test(x.label)));
    assert.ok(!JSON.stringify(p1.body).includes('S2') && !JSON.stringify(p1.body).includes('"s2"'), 'no names or account ids');
    assert.equal((await call('s1', 'POST', `${A}/peer`, { ref: p1.body.toReview[0].ref, text: 'Too short' })).status, 400);
    assert.equal((await call('s1', 'POST', `${A}/peer`, { ref: p1.body.toReview[0].ref, text: 'Clear point; add the latest wage figure to back it up.' })).status, 200);
    const myOwnRef = entryRef(JSON.parse(fs.readFileSync(path.join(dir, 'local', 'classes.json'), 'utf8')).classes[0].refSecret, aid, 's1');
    assert.equal((await call('s1', 'POST', `${A}/peer`, { ref: myOwnRef, text: 'My own argument is excellent, trust me on this.' })).status, 404, 'not your own');
    const reviewed = p1.body.toReview[0].ref as string;
    const author = ['s2', 's3'].find((s) => teacher.body.entries.find((e: { ref: string; name: string }) => e.ref === reviewed)?.name === s.toUpperCase())!;
    const about = await call(author, 'GET', `${A}/peer`);
    assert.deepEqual(about.body.aboutMine.map((r: { text: string }) => r.text), ['Clear point; add the latest wage figure to back it up.']);
    assert.equal(JSON.stringify(about.body.aboutMine).includes('S1'), false, 'the reviewer is not named');
    const tv = await call('prof', 'GET', `${A}/peer`);
    assert.equal(tv.body.expected, 6);
    assert.equal(tv.body.reviews[0].reviewer, 'S1', 'the teacher sees who wrote it');
    assert.match((await call('ta', 'GET', `${A}/peer`)).body.reviews[0].reviewer, /^Student \d$/);
    assert.equal((await call('prof', 'POST', `${A}/peer`, { ref: reviewed, text: 'Teachers do not write peer reviews here.' })).status, 403);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
