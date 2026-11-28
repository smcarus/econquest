/** Copy details and Report this problem on the error screens; Menu > Report a problem. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankProblemUrl, problemIssueUrl, problemText, ISSUE_REPO } from '../src/utils/problemReport';
import { ISSUE_REPO as FEEDBACK_REPO } from '../src/utils/feedback';

const d = {
  version: '0.3.0 (commit 1a2b3c4d5e6f)',
  where: 'One country',
  message: "Cannot read properties of undefined (reading 'value')",
  stack: '\n    at CountryPage\n    at PanelBoundary\n' + Array.from({ length: 20 }, (_, i) => `    at Deep${i}`).join('\n'),
  path: '/research',
  lang: 'es',
};

test('the copied text names the version, the place and the error, with a short stack', () => {
  const t = problemText(d);
  assert.match(t, /^EconQuest 0\.3\.0 \(commit 1a2b3c4d5e6f\)/);
  assert.match(t, /Where: One country/);
  assert.match(t, /Error: Cannot read properties/);
  assert.match(t, /Page: \/research/);
  assert.match(t, /Language: es/);
  assert.equal(t.split('\n').filter((l) => l.startsWith('  at ')).length, 8);
});

test('the issue link goes to the project with the details filled in', () => {
  const u = new URL(problemIssueUrl(d));
  assert.equal(u.origin + u.pathname, `https://github.com/${ISSUE_REPO}/issues/new`);
  assert.equal(u.searchParams.get('title'), 'Problem: One country could not be drawn');
  assert.match(u.searchParams.get('body') ?? '', /Where: One country/);
  assert.ok(problemIssueUrl(d).length < 6000);
});

test('Menu > Report a problem fills in only the version', () => {
  const u = new URL(blankProblemUrl('0.3.0'));
  assert.match(u.searchParams.get('body') ?? '', /App version: 0\.3\.0/);
  assert.equal(FEEDBACK_REPO, ISSUE_REPO);
});

test('every Quest has a report-a-data-problem link naming the Quest and the figures its page showed', async () => {
  const { questDataProblemUrl, ISSUE_REPO } = await import('../src/utils/problemReport');
  const url = questDataProblemUrl({ version: '0.3.0', questId: 'bra-growth-2026', questVersion: 1, title: 'Brazil growth', figures: [{ series: 'Real GDP growth (BRA)', shown: 'Missing: The feed did not answer', source: 'IMF WEO' }] });
  assert.ok(url.startsWith(`https://github.com/${ISSUE_REPO}/issues/new?title=Quest%20data%20problem%3A%20bra-growth-2026&body=`));
  const body = decodeURIComponent(url.split('&body=')[1]!);
  assert.match(body, /Quest: bra-growth-2026 v1, "Brazil growth"/);
  assert.match(body, /Real GDP growth \(BRA\): Missing: The feed did not answer \(IMF WEO\)/);
  assert.match(body, /App version: 0\.3\.0/);
  assert.match(decodeURIComponent(questDataProblemUrl({ version: 'x', questId: 'd', questVersion: 1, title: 'D', figures: [] }).split('&body=')[1]!), /reads no series/);
  const dialog = (await import('node:fs')).readFileSync('src/components/QuestsDialog.tsx', 'utf8');
  assert.match(dialog, /data-quest-report-data/);
});
