/**
 * "Report a problem" (standard features check, 24 November 2026): the text a person can copy when a
 * screen fails to draw, and a link that opens a new GitHub issue with that text filled in. Nothing is
 * sent by the app; the person reads the issue and sends it themselves, as with the Flag button
 * (src/utils/feedback.ts). Browser-safe and small: the crash screen loads with the first page.
 */

/**
 * Where flags and problem reports go. Until e-conquest/econquest is published, reports go to the
 * development repository, which is public and takes issues. On the day the public repository opens,
 * change this to 'e-conquest/econquest' (docs/MAINTENANCE.md, "Each release", step 5).
 */
export const ISSUE_REPO = 'smcarus/econquest';

export interface ProblemDetails {
  /** App version, with its commit when known. */
  version: string;
  /** Which screen or panel failed ("The app" for the whole page). */
  where: string;
  message: string;
  /** React's component stack, if any; trimmed. */
  stack?: string;
  /** The page path, without its query (which can hold a search). */
  path?: string;
  /** The browser's language setting in the app (en, es, fr, pt). */
  lang?: string;
}

const STACK_LINES = 8;

/** Plain text for the clipboard and the issue body. No figures, keys or saved data are included. */
export function problemText(d: ProblemDetails): string {
  const stack = (d.stack ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, STACK_LINES);
  return [
    `EconQuest ${d.version}`,
    `Where: ${d.where}`,
    `Error: ${String(d.message).slice(0, 300)}`,
    ...(d.path ? [`Page: ${d.path}`] : []),
    ...(d.lang ? [`Language: ${d.lang}`] : []),
    ...(stack.length ? ['Component stack:', ...stack.map((l) => `  ${l}`)] : []),
  ].join('\n');
}

function issueLink(title: string, body: string): string {
  return `https://github.com/${ISSUE_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/** A new issue for a screen that failed, with the details filled in. */
export function problemIssueUrl(d: ProblemDetails): string {
  const body = ['**What I was doing:** ', '', '```', problemText(d), '```', '', "_Details copied by the app's error screen and sent by the person who opened this issue._"].join('\n');
  return issueLink(`Problem: ${d.where} could not be drawn`.slice(0, 120), body);
}

/** Menu > Report a problem: a new issue with only the version filled in. */
export function blankProblemUrl(version: string): string {
  const body = ['**What happened:** ', '', '**What I expected:** ', '', '**Steps to see it:** ', '', `- App version: ${version}`].join('\n');
  return issueLink('Problem: ', body);
}

export interface QuestDataProblem {
  version: string;
  questId: string;
  questVersion: number;
  title: string;
  /** The figures the Quest page shows: the series in words, what it showed (a value or Missing) and the source. */
  figures: Array<{ series: string; shown: string; source?: string }>;
}

/**
 * "Report a data problem" on every Quest (Quests go-live checklist): a new issue naming the Quest and
 * the figures its page showed, for a wrong value, a source that changed, or a rule that reads the
 * wrong series. The person adds what is wrong and sends it themselves.
 */
export function questDataProblemUrl(d: QuestDataProblem): string {
  const lines = d.figures.length ? d.figures.map((f) => `- ${f.series}: ${f.shown}${f.source ? ` (${f.source})` : ''}`) : ['- (this Quest reads no series)'];
  const body = [
    '**What looks wrong:** ',
    '',
    '**Where the right figure is published (a link, if you have one):** ',
    '',
    `- Quest: ${d.questId} v${d.questVersion}, "${d.title.slice(0, 200)}"`,
    '- What the Quest page showed:',
    ...lines.slice(0, 12).map((l) => `  ${l}`),
    `- App version: ${d.version}`,
  ].join('\n');
  return issueLink(`Quest data problem: ${d.questId}`.slice(0, 120), body);
}
