import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatSuccessReport, githubSearches, readGithubCounts, successRecord, SUCCESS_MEASURES, NO_TRACKING } from '../src/utils/successMeasures';

const repo = { stargazers_count: 12, forks_count: 3, subscribers_count: 4 };
const releases = [{ assets: [{ download_count: 5 }, { download_count: 2 }] }, { assets: [] }];
const search = { openIssues: { total_count: 6 }, closedIssues: { total_count: 9 }, openPulls: { total_count: 1 }, flags: { total_count: 2 } };
const tally = { hit: 3, miss: 1, too_early: 2, missing: 0 };
const fb = { flags: 1, flaggedFigures: 1, flaggedAnswers: 0, ratings: 4, up: 3, down: 1 };

test('success measures: GitHub replies are read into counts, release downloads summed', () => {
  const g = readGithubCounts(repo, releases, search);
  assert.deepEqual(g, { stars: 12, forks: 3, watchers: 4, openIssues: 6, closedIssues: 9, openPulls: 1, flags: 2, releases: 2, releaseDownloads: 7 });
  assert.equal(readGithubCounts({ message: 'Not Found' }, [], {}), null);
  assert.equal(readGithubCounts(repo, null, { openIssues: null })?.openIssues, null);
});

test('success measures: searches stay on the public repository; flags are issues titled "Flag:"', () => {
  const s = githubSearches();
  for (const q of Object.values(s)) assert.match(q, /^repo:e-conquest\/econquest /);
  assert.match(s.flags, /type:issue in:title "Flag:"/);
});

test('success measures: the report shows changes since the last run, Missing with the reason, and small-sample warnings', () => {
  const g = readGithubCounts(repo, releases, search);
  const prev = successRecord('2026-11-01T00:00:00Z', { ...g!, stars: 10 }, undefined, tally, fb as any);
  const text = formatSuccessReport(successRecord('2026-11-12T00:00:00Z', g, undefined, tally, fb as any), prev);
  assert.match(text, /Stars: 12 \(\+2 since the last run\)/);
  assert.match(text, /Forks: 3 \(no change since the last run\)/);
  assert.match(text, /goal met in 75% of 4 judged \(fewer than 10: too few to read a rate from\)/);
  assert.match(text, /Answer ratings \(P3\): 4 \(3 up, 1 down\)/);
  assert.ok(text.includes(NO_TRACKING));
  const missing = formatSuccessReport(successRecord('2026-11-12T00:00:00Z', null, 'the public repository is not published yet', tally, fb as any));
  assert.match(missing, /Missing: the public repository is not published yet/);
  assert.match(formatSuccessReport(successRecord('2026-11-12T00:00:00Z', g, undefined, { hit: 0, miss: 0, too_early: 0, missing: 0 }, { ...fb, ratings: 0 } as any)), /Outcome checks \(P1\): none yet[\s\S]*Answer ratings \(P3\): none yet/);
});

test('success measures: every measure is in the roadmap, and the app itself sends nothing', () => {
  const roadmap = fs.readFileSync('docs/ROADMAP.md', 'utf8');
  assert.match(roadmap, /## How we will know it works/);
  for (const m of SUCCESS_MEASURES) assert.ok(roadmap.includes(m.name), `roadmap lists ${m.name}`);
  // No analytics or usage pings anywhere in the app's own code.
  const src = fs.readFileSync('src/utils/successMeasures.ts', 'utf8') + fs.readFileSync('scripts/success-measures.ts', 'utf8');
  assert.doesNotMatch(src, /navigator\.sendBeacon|google-analytics|plausible|posthog|segment\.io/i);
});
