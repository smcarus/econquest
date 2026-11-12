/**
 * Prints the S1 success measures (docs/ROADMAP.md, "How we will know it works"):
 *
 *   npm run check:success              print, and keep this run in data/local/success-measures.jsonl
 *   npm run check:success -- --no-save print only
 *
 * Reads GitHub's public API for e-conquest/econquest without a key (stars, forks, issues, pull
 * requests, flags sent as issues, release downloads), and this computer's own files for outcome
 * checks and answer ratings. Sends nothing about anyone. Needs no running server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../src/server/config.ts';
import { formatSuccessReport, githubSearches, PUBLIC_REPO, readGithubCounts, successRecord, type SuccessRecord } from '../src/utils/successMeasures.ts';
import { loadReviews, reviewFilePath } from '../src/utils/policyReviewStore.ts';
import { tallyChecks } from '../src/utils/outcomeChecks.ts';
import { feedbackFilePath, loadFeedback } from '../src/utils/feedbackStore.ts';
import { summariseFeedback } from '../src/utils/feedback.ts';

const API = 'https://api.github.com';
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'econquest-success-measures' };

async function getJson(url: string): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    return { status: res.status, body: res.ok ? await res.json() : null };
  } catch (e) {
    return { status: 0, body: String((e as Error)?.message || e) };
  }
}

const repo = await getJson(`${API}/repos/${PUBLIC_REPO}`);
let github = null;
let reason: string | undefined;
if (repo.status === 200) {
  const releases = await getJson(`${API}/repos/${PUBLIC_REPO}/releases?per_page=100`);
  const search: Record<string, unknown> = {};
  for (const [k, q] of Object.entries(githubSearches())) search[k] = (await getJson(`${API}/search/issues?per_page=1&q=${encodeURIComponent(q)}`)).body;
  github = readGithubCounts(repo.body, releases.body, search);
  if (!github) reason = 'GitHub answered, but not with repository counts';
} else if (repo.status === 404) reason = 'the public repository is not published yet (GitHub answers 404)';
else if (repo.status === 403 || repo.status === 429) reason = `GitHub refused for now (HTTP ${repo.status}, usually its hourly limit for requests without a sign-in); try again in an hour`;
else reason = repo.status ? `GitHub answered HTTP ${repo.status}` : `GitHub could not be reached (${String(repo.body)})`;

const checks = loadReviews(reviewFilePath(DATA_DIR)).reviews.flatMap((r) => r.outcomeChecks ?? []);
const feedback = summariseFeedback(loadFeedback(feedbackFilePath(DATA_DIR)));
const rec = successRecord(new Date().toISOString(), github, reason, tallyChecks(checks), feedback);

const file = path.join(DATA_DIR, 'local', 'success-measures.jsonl');
let prev: SuccessRecord | null = null;
try {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0 && !prev; i--) {
    try {
      const r = JSON.parse(lines[i]) as SuccessRecord;
      if (r?.github) prev = r;
    } catch {
      // a broken line is skipped
    }
  }
} catch {
  // no earlier runs
}

console.log(formatSuccessReport(rec, prev));
if (!process.argv.includes('--no-save')) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify(rec)}\n`, { mode: 0o600 });
    console.log(`\nKept in ${file}`);
  } catch (e) {
    console.log(`\nCould not save ${file}: ${(e as Error).message}`);
  }
}
