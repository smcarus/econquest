/**
 * S1 success measures: a short list of things to watch after the public release, counted without
 * tracking anyone. The app sends nothing anywhere for this. Public counts come from GitHub's public
 * pages and API (stars, issues, discussions, image pulls, release downloads); the rest are counted on
 * the maintainer's own computer from files the app already keeps (outcome checks, answer ratings),
 * or come from people who choose to send them (pilot feedback, flags they file as issues).
 *
 * `npm run check:success` (scripts/success-measures.ts) prints the counts it can read and keeps each
 * run in data/local/success-measures.jsonl, so the counts can be compared at Checkpoint 1.
 */
import type { CheckTally } from './outcomeChecks';
import type { ExpertTally } from './expertReview';
import type { FeedbackSummary } from './feedback';

export const PUBLIC_REPO = 'e-conquest/econquest';
export const PUBLIC_IMAGE = 'ghcr.io/e-conquest/econquest';
export const SUCCESS_VERSION = 'success-measures-v1';

/** When the measures are read and the build order is looked at again. */
export const SUCCESS_REVIEW =
  'Checkpoint 1, about four weeks after the public release. The release day and the review day are written into docs/ROADMAP.md on the day of the release.';

export type MeasureSource = 'github_api' | 'github_page' | 'this_computer' | 'sent_by_people';

export interface SuccessMeasure {
  id: string;
  name: string;
  /** What it tells us, in plain words. */
  why: string;
  /** Where the count is read. */
  where: string;
  source: MeasureSource;
}

export const SUCCESS_MEASURES: SuccessMeasure[] = [
  { id: 'stars', name: 'GitHub stars and forks', why: 'How many people found the project worth keeping an eye on, or copying to change.', where: `github.com/${PUBLIC_REPO} (read by npm run check:success)`, source: 'github_api' },
  { id: 'issues', name: 'Issues and pull requests', why: 'Whether people use the app enough to report problems or send changes, and how many reports wait for an answer.', where: `github.com/${PUBLIC_REPO}/issues (read by npm run check:success)`, source: 'github_api' },
  { id: 'flags', name: 'Flags sent as issues', why: 'Figures or answers people found wrong and chose to report with the Flag button (issues whose title starts "Flag:").', where: `github.com/${PUBLIC_REPO}/issues (read by npm run check:success)`, source: 'github_api' },
  { id: 'discussions', name: 'Discussions', why: 'Questions and ideas from people using the app.', where: `github.com/${PUBLIC_REPO}/discussions (count read by hand; GitHub gives no count without a sign-in)`, source: 'github_page' },
  { id: 'image_pulls', name: 'App image downloads', why: 'How often the ready-made app image is downloaded. One person can download it many times, so this counts downloads, not people.', where: `github.com/${PUBLIC_REPO}/pkgs/container/econquest (read by hand; GitHub shows it only on the page)`, source: 'github_page' },
  { id: 'release_downloads', name: 'Release downloads', why: 'How often files attached to a release are downloaded. Like image pulls, it counts downloads, not people.', where: `github.com/${PUBLIC_REPO}/releases (read by npm run check:success)`, source: 'github_api' },
  { id: 'outcome_checks', name: 'Outcome-check hit rate (P1)', why: 'How often the goal of a saved policy review was met 12 and 24 months later. Fewer than 10 judged checks is too few to read a rate from.', where: 'Menu > Research > Policy track record, from data/local/reviews.json on this computer', source: 'this_computer' },
  { id: 'ratings', name: 'Answer ratings (P3)', why: 'Thumbs up and down on council answers. Counted on this computer; other people\'s ratings count only when they choose to send them.', where: 'Data health, from data/local/feedback.jsonl on this computer', source: 'this_computer' },
  { id: 'pilot', name: 'Expert review scores (P4)', why: 'What pilot economists and professors score policy review memos for clarity and use of evidence, whether the sources are correct and whether they would act on them.', where: 'Reports > Policy reviews > Expert review, saved on the computer where they fill it in; published only with consent in docs/validation/expert-reviews.md (npm run reviews:summary)', source: 'sent_by_people' },
];

/** What the app never does for these measures; shown in the report and the roadmap. */
export const NO_TRACKING =
  'The app sends nothing for these measures: no analytics, no usage pings, no counting of who opens it. Every count is either public on GitHub or kept on the maintainer\'s own computer.';

export interface GithubCounts {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number | null;
  closedIssues: number | null;
  openPulls: number | null;
  flags: number | null;
  releases: number;
  releaseDownloads: number;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

/**
 * Reads GitHub's public replies: the repository, its releases, and search counts (open issues, closed
 * issues, open pull requests, flag issues). A search that failed is null and prints as Missing.
 */
export function readGithubCounts(repo: unknown, releases: unknown, search: { openIssues?: unknown; closedIssues?: unknown; openPulls?: unknown; flags?: unknown }): GithubCounts | null {
  const r = repo as { stargazers_count?: unknown; forks_count?: unknown; subscribers_count?: unknown };
  if (!r || num(r.stargazers_count) === null) return null;
  const list = Array.isArray(releases) ? (releases as Array<{ assets?: Array<{ download_count?: unknown }> }>) : [];
  let downloads = 0;
  for (const rel of list) for (const a of rel.assets || []) downloads += num(a.download_count) ?? 0;
  const total = (v: unknown) => num((v as { total_count?: unknown })?.total_count);
  return {
    stars: num(r.stargazers_count) ?? 0,
    forks: num(r.forks_count) ?? 0,
    watchers: num(r.subscribers_count) ?? 0,
    openIssues: total(search.openIssues),
    closedIssues: total(search.closedIssues),
    openPulls: total(search.openPulls),
    flags: total(search.flags),
    releases: list.length,
    releaseDownloads: downloads,
  };
}

/** The GitHub search queries behind the issue counts. */
export function githubSearches(repo = PUBLIC_REPO): Record<'openIssues' | 'closedIssues' | 'openPulls' | 'flags', string> {
  return {
    openIssues: `repo:${repo} type:issue state:open`,
    closedIssues: `repo:${repo} type:issue state:closed`,
    openPulls: `repo:${repo} type:pr state:open`,
    flags: `repo:${repo} type:issue in:title "Flag:"`,
  };
}

export interface SuccessRecord {
  version: string;
  at: string;
  github: GithubCounts | null;
  /** Why the GitHub counts are missing, when they are. */
  githubReason?: string;
  outcomeChecks: CheckTally;
  ratings: { ratings: number; up: number; down: number; flags: number };
  /** Expert reviews (P4) saved with the policy reviews on this computer. */
  expert?: ExpertTally;
}

export function successRecord(at: string, github: GithubCounts | null, githubReason: string | undefined, tally: CheckTally, feedback: FeedbackSummary, expert?: ExpertTally): SuccessRecord {
  return {
    version: SUCCESS_VERSION,
    at,
    github,
    ...(github ? {} : { githubReason: githubReason || 'not read' }),
    outcomeChecks: tally,
    ratings: { ratings: feedback.ratings, up: feedback.up, down: feedback.down, flags: feedback.flags },
    ...(expert ? { expert } : {}),
  };
}

const show = (v: number | null) => (v === null ? 'Missing (the search did not answer)' : String(v));

function change(now: number | null | undefined, then: number | null | undefined): string {
  if (typeof now !== 'number' || typeof then !== 'number') return '';
  const d = now - then;
  return d ? ` (${d > 0 ? '+' : ''}${d} since the last run)` : ' (no change since the last run)';
}

/** The printed report. `prev` is the last saved run, for the change since then. */
export function formatSuccessReport(rec: SuccessRecord, prev?: SuccessRecord | null): string {
  const g = rec.github;
  const p = prev?.github;
  const lines: string[] = [`Success measures (S1), ${rec.at.slice(0, 10)}`, '', NO_TRACKING, ''];
  lines.push(`GitHub, ${PUBLIC_REPO}:`);
  if (!g) lines.push(`  Missing: ${rec.githubReason || 'not read'}`);
  else {
    lines.push(
      `  Stars: ${g.stars}${change(g.stars, p?.stars)}`,
      `  Forks: ${g.forks}${change(g.forks, p?.forks)}`,
      `  Watching: ${g.watchers}${change(g.watchers, p?.watchers)}`,
      `  Open issues: ${show(g.openIssues)}${change(g.openIssues, p?.openIssues)}`,
      `  Closed issues: ${show(g.closedIssues)}${change(g.closedIssues, p?.closedIssues)}`,
      `  Open pull requests: ${show(g.openPulls)}${change(g.openPulls, p?.openPulls)}`,
      `  Flags sent as issues: ${show(g.flags)}${change(g.flags, p?.flags)}`,
      `  Release downloads: ${g.releaseDownloads} across ${g.releases} release${g.releases === 1 ? '' : 's'}${change(g.releaseDownloads, p?.releaseDownloads)}`
    );
  }
  lines.push(`  Discussions: read by hand at github.com/${PUBLIC_REPO}/discussions`);
  lines.push(`  App image downloads: read by hand at github.com/${PUBLIC_REPO}/pkgs/container/econquest`);
  const t = rec.outcomeChecks;
  const judged = t.hit + t.miss;
  lines.push('', 'On this computer:');
  lines.push(
    `  Outcome checks (P1): ${judged + t.too_early + t.missing ? `${t.hit} hit, ${t.miss} miss, ${t.too_early} too early, ${t.missing} missing` : 'none yet'}${judged ? `; goal met in ${Math.round((100 * t.hit) / judged)}% of ${judged} judged` : ''}${judged > 0 && judged < 10 ? ' (fewer than 10: too few to read a rate from)' : ''}`
  );
  const r = rec.ratings;
  lines.push(`  Answer ratings (P3): ${r.ratings ? `${r.ratings} (${r.up} up, ${r.down} down)` : 'none yet'}; flags saved here: ${r.flags}`);
  const x = rec.expert;
  lines.push(
    '',
    'Sent by people:',
    `  Expert reviews (P4): ${x && x.reviews ? `${x.reviews} saved here (${x.consenting} may be published); mean clarity ${x.meanClarity} of 5, use of evidence ${x.meanEvidence} of 5; would act ${x.wouldAct.yes} as written, ${x.wouldAct.with_changes} with changes, ${x.wouldAct.no} not${x.reviews < 5 ? ' (fewer than 5: individual views, not a rate)' : ''}` : 'none yet'}`
  );
  lines.push('', `Review: ${SUCCESS_REVIEW}`);
  return lines.join('\n');
}
