import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { boardHtml } from '../src/utils/questBoard';
import { computeStats } from '../src/utils/questStats';
import type { PublicEntry } from '../src/utils/questPublicEntries';
import type { ReplicationQuest, DebateQuest } from '../src/utils/quests';
import { RESEARCH_NOTICE } from '../src/utils/disclaimer';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'quests', 'drafts', f), 'utf8'));
const rep: ReplicationQuest = { ...read('bra-bohn-replication.json'), approvedBy: 'smcarus', title: 'Rebuild <b>Bohn</b> & check' };
const deb: DebateQuest = { ...read('egy-reserves-debate.json'), approvedBy: 'smcarus' };
const e = (questId: string, login: string, answer: PublicEntry['answer'], extra: Partial<PublicEntry> = {}): PublicEntry => ({ questId, questVersion: 1, questHash: 'h', login, n: 1, answer, via: 'pull-request', ...extra });

test('the board is one static page built only from the files: Quests, results, contributors and signed-up stances', () => {
  const quests = [{ quest: rep, approved: true }, { quest: deb, approved: true }, { quest: { ...rep, id: 'draft-one', approvedBy: undefined }, approved: false }];
  const entries = [e(rep.id, 'alice', { value: 0.06 }, { code: 'https://github.com/alice/x/blob/main/a.R' }), e(deb.id, 'bob', { position: 1 }, { rationale: 'x'.repeat(50) })];
  const lines = [{ seq: 1, at: '2027-03-01T10:00:00Z', kind: 'settled' as const, questId: rep.id, questVersion: 1, questHash: 'h', by: 'smcarus', outcome: { answer: 'replication' as const, value: 0.06, tolerance: 0.005, from: 'History & data' }, prev: 'GENESIS', hash: 'x' }];
  const stats = computeStats({ quests, entries, lines, accounts: {} });
  const html = boardHtml({ stats, quests, lines, profiles: [{ login: 'bob', axes: { fx_regime: -2 }, shownSince: '2027-01-05' }, { login: 'carol', axes: { trade: 1 }, shownSince: '2027-01-06' }], repo: 'e-conquest/econquest', today: '2027-03-02' });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<title>Quests board<\/title>/);
  assert.match(html, /Rebuild &lt;b&gt;Bohn&lt;\/b&gt; &amp; check/, 'text is escaped');
  assert.doesNotMatch(html, /<b>Bohn/);
  assert.match(html, /The app&#39;s figure is 0\.06/);
  assert.doesNotMatch(html, /draft-one/, 'drafts are not on the board');
  assert.match(html, /Nobody has enough settled forecasts to be ranked yet/);
  assert.match(html, /id="c-alice"/);
  assert.match(html, /Replications \(never ranked\): Rebuild &lt;b&gt;Bohn&lt;\/b&gt; &amp; check \(reproduced\)/);
  assert.match(html, /Debates argued \(never scored\)/);
  assert.match(html, /Stances bob chose to show \(since 2027-01-05\)/);
  assert.match(html, /Leans strongly towards: Allowed to float with the market/);
  assert.match(html, /Signed up with a stance profile, no entries yet.*carol/s);
  assert.match(html, /href="https:\/\/github\.com\/e-conquest\/econquest\/blob\/main\/quests\/bra-bohn-replication\.json"/);
  assert.match(html, /prefers-color-scheme:dark/);
  assert.ok(html.includes(RESEARCH_NOTICE) && html.includes('Not investment advice'), 'carries the standing notice');
  assert.doesNotMatch(html, /<script/i, 'no scripts');
});
