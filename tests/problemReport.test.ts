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
