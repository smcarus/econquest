import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { liveCheckProblems, liveCheckReport, type LiveCheckInput } from '../src/utils/questLiveCheck';

const input: LiveCheckInput = {
  app: 'http://127.0.0.1:3737',
  quests: [
    { id: 'tutorial-brent-week', type: 'forecast', approved: false, figures: [{ series: 'brent', country: 'WLD', value: 71.2, date: '2026-11-27' }], practice: { start: '2025-03-04', endDate: '2025-03-11' } },
    { id: 'gha-policy', type: 'forecast', approved: false, figures: [{ series: 'policy_rate', country: 'GHA', missing: 'IMF has no value after 2025-09' }], practice: { error: 'Practice needs a daily or weekly series' } },
    { id: 'bra-bohn-replication', type: 'replication', approved: false, figures: [] },
  ],
  bohn: { rows: 22, file: 'data/local/quests-check/bohn-bra.csv' },
  starters: [{ language: 'Python', outcome: 'ran' }, { language: 'R', outcome: 'not installed' }],
};

test('live check: one line per figure, practice and starter, with counts', () => {
  const r = liveCheckReport(input);
  const text = r.lines.join('\n');
  assert.match(text, /live {8}tutorial-brent-week \(draft forecast\): brent = 71\.2 on 2026-11-27/);
  assert.match(text, /MISSING {5}gha-policy \(draft forecast\): policy_rate GHA: IMF has no value after 2025-09/);
  assert.match(text, /no series {3}bra-bohn-replication/);
  assert.match(text, /none {8}gha-policy: Practice needs a daily or weekly series/);
  assert.match(text, /downloaded 22 rows/);
  assert.match(text, /R starter: not installed/);
  assert.deepEqual(r.counts, { quests: 3, figures: 2, live: 1, missing: 1, pageErrors: 0, practiceOk: 1, practiceNone: 1 });
  assert.deepEqual(liveCheckProblems(input), [], 'Missing with a reason and a starter not installed are fine');
});

test('live check: a page error, a Missing with no reason, a failed download or starter fail the run', () => {
  const bad: LiveCheckInput = {
    ...input,
    quests: [{ id: 'a', type: 'forecast', approved: true, figures: { error: 'HTTP 500' } }, { id: 'b', type: 'forecast', approved: true, figures: [{ series: 's', country: 'BRA', missing: ' ' }] }],
    bohn: { error: 'HTTP 404' },
    starters: [{ language: 'Stata', outcome: 'failed', detail: 'r(601)' }],
  };
  assert.deepEqual(liveCheckProblems(bad), ['a: page error', 'b: s Missing with no reason', 'Bohn download failed', 'Stata starter failed']);
  assert.match(liveCheckReport(bad).lines.join('\n'), /no reason given \(this is a bug\)/);
});

test('npm run quests:live-check is wired and documented', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['quests:live-check'], 'tsx scripts/quests-live-check.ts');
  assert.match(fs.readFileSync(path.join(process.cwd(), 'docs/QUESTS.md'), 'utf8'), /npm run quests:live-check/);
});
