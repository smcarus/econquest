/**
 * The yearly open Quests dataset (Quests step 12), built by `npm run quests:dataset -- --year <YYYY>`:
 * every approved Quest that closed in the year, all its public entries (replacements included and
 * marked), every line of the results record about it, the Signal Quest test verdicts and each
 * settled forecast's score, as plain CSV files with a README, a citation file and checksums, ready
 * to deposit (for example on Zenodo) for a DOI. Licensed CC BY 4.0 like the files it comes from.
 *
 * Left out on purpose: stance profiles (a political opinion tied to a name; a person can remove a
 * profile from the repository, but not from a deposited dataset), GitHub account dates, private
 * logs, class tables and drafts.
 *
 * Browser-safe, pure: returns the files' text; the script writes them and the checksums.
 */
import { DATA_LICENCES } from '../data/dataLicences';
import { EXPORT_NOTICE } from './disclaimer';
import { countedPublicEntries, type PublicEntry } from './questPublicEntries';
import { questSeriesRefs, questSettlesOn, type Quest } from './quests';
import type { ResolutionLine } from './questResolve';
import { questSeriesDef } from './questSeries';
import type { QuestTestVerdict } from './questSignal';
import type { QuestStats } from './questStats';

export interface DatasetInput {
  year: string;
  quests: Array<{ quest: Quest; approved: boolean; hash: string }>;
  entries: PublicEntry[];
  lines: ResolutionLine[];
  tests: QuestTestVerdict[];
  stats: QuestStats;
  /** owner/name of the public repository; '' when not set. */
  repo: string;
  builtOn: string;
}

export interface Dataset {
  files: Record<string, string>;
  counts: { quests: number; entries: number; results: number; verdicts: number; scores: number };
}

/** One CSV cell: quoted when it holds a comma, quote or line break; formula-like text is prefixed so spreadsheets show it as text. */
export function csvCell(v: unknown): string {
  if (v === undefined || v === null) return '';
  let s = typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

const COLUMNS = {
  'quests.csv': [
    ['quest_id', 'Quest id'],
    ['version', 'Quest version (a changed Quest is a new version with its own file)'],
    ['type', 'forecast, signal, replication or debate'],
    ['title', 'The question'],
    ['summary', 'Background in plain words'],
    ['countries', 'ISO3 codes, separated by ;'],
    ['topics', 'Topics, separated by ;'],
    ['region', 'Americas, EMEA, Asia-Pacific or Global'],
    ['registered_on', 'Day the Quest was written down'],
    ['opens_on', 'First day entries were taken'],
    ['closes_on', 'Day entries closed'],
    ['settles_on', 'Day the result was due'],
    ['author', 'GitHub login of the author'],
    ['approved_by', 'GitHub login of the maintainer who approved it'],
    ['quest_sha256', 'SHA-256 of the Quest file; every entry and result names it'],
    ['rule', 'Forecast: the settle rule as JSON (series, date, threshold)'],
    ['fallback', 'Forecast: the rule used if the series has no value, or "unresolvable"'],
    ['detail', 'Signal: the hypothesis; Replication: the target and tolerance; Debate: the positions (JSON)'],
    ['sources', 'Forecast: the sources the rule reads'],
    ['known_limits', 'Known limits, separated by ;'],
  ],
  'entries.csv': [
    ['quest_id', 'Quest id'],
    ['quest_version', 'Quest version the entry answers'],
    ['quest_sha256', 'SHA-256 of the Quest file the entry answers'],
    ['entrant', 'GitHub login, or ~name for an entry emailed to a maintainer'],
    ['n', '1 for a first entry, 2 for its replacement, and so on'],
    ['counted', 'true for the entry that counts (the highest n); earlier ones are kept but not scored'],
    ['via', 'pull-request or email'],
    ['probability', 'Forecast, yes or no: the chance given, 0 to 1'],
    ['level', 'Forecast, number: the value forecast'],
    ['position', 'Debate: the position chosen, counted from 0 (see detail in quests.csv)'],
    ['value', 'Replication: the figure the script produced'],
    ['test', 'Signal: the pre-registered test as JSON'],
    ['code', 'Replication: public address of the script'],
    ['rationale', 'The reasoning or argument the entrant gave'],
    ['received_at', 'Emailed entries: when the maintainer received the email'],
  ],
  'results.csv': [
    ['seq', 'Line number in quests/resolutions.jsonl'],
    ['at', 'When the line was recorded'],
    ['kind', 'settled, unresolvable, decision (on a dispute), withdrawn or note'],
    ['quest_id', 'Quest id'],
    ['quest_version', 'Quest version'],
    ['quest_sha256', 'SHA-256 of the Quest file'],
    ['answer', 'probability, level or replication'],
    ['happened', 'Yes or no Quests: whether it happened'],
    ['base_rate', 'Yes or no Quests: how often it happened in the past'],
    ['value', 'Number Quests: the settled value; Replication: the app\'s own figure'],
    ['no_change', 'Number Quests: the value if nothing had moved'],
    ['tolerance', 'Replication: the largest difference that counts as a match'],
    ['readings', 'The values read and their dates, as JSON'],
    ['via', 'rule or fallback'],
    ['reason', 'Why (unresolvable, withdrawn, decision, note)'],
    ['decision', 'Dispute decision: stands or unresolvable'],
    ['by', 'Who recorded the line'],
    ['hash', 'SHA-256 of the line; each line names the one before, so the record cannot be changed unnoticed'],
  ],
  'test-verdicts.csv': [
    ['quest_id', 'Signal Quest id'],
    ['quest_version', 'Quest version'],
    ['entrant', 'Who entered the test'],
    ['n', 'Entry number that was run'],
    ['entry_sha256', 'SHA-256 of the entry file that was run'],
    ['method', 'The test rule used'],
    ['registered_on', 'Day the test was fixed (the Quest\'s closing day)'],
    ['max_p_value', 'The p-value the test had to beat'],
    ['ran_at', 'When it was run (once)'],
    ['verdict', 'The verdict under the signal standard'],
    ['p_value', 'The p-value found, when there were enough cases'],
    ['summary', 'What the run found, in words'],
  ],
  'scores.csv': [
    ['quest_id', 'Quest id'],
    ['entrant', 'Who entered'],
    ['answer', 'probability or level'],
    ['probability', 'The counted chance given'],
    ['happened', 'Whether it happened'],
    ['brier', 'Brier score: squared gap between the chance given and what happened (0 best, 1 worst)'],
    ['skill', 'Base-rate Brier score minus the entrant\'s; plus means better than the base rate'],
    ['error', 'Number Quests: absolute gap between the forecast and the settled value'],
    ['beat_no_change', 'Number Quests: whether the forecast was closer than assuming nothing moved'],
    ['result_seq', 'The results line the score comes from'],
  ],
} as const;

export function buildDataset(x: DatasetInput): Dataset {
  const quests = x.quests.filter((q) => q.approved && q.quest.closesOn.startsWith(`${x.year}-`)).sort((a, b) => a.quest.closesOn.localeCompare(b.quest.closesOn) || a.quest.id.localeCompare(b.quest.id) || a.quest.version - b.quest.version);
  const key = (id: string, v: number) => `${id}@${v}`;
  const inYear = new Set(quests.map((q) => key(q.quest.id, q.quest.version)));
  const ids = new Set(quests.map((q) => q.quest.id));

  const sourcesOf = (q: Quest) =>
    [...new Set(questSeriesRefs(q).map((r) => questSeriesDef(r.series)?.source).filter(Boolean))].join('; ');
  const detailOf = (q: Quest) => (q.type === 'signal' ? q.hypothesis : q.type === 'replication' ? { tool: q.tool, target: q.target, tolerance: q.tolerance } : q.type === 'debate' ? q.positions : '');
  const questRows = quests.map(({ quest: q, hash }) => [
    q.id, q.version, q.type, q.title, q.summary, q.countries.join(';'), q.topics.join(';'), q.region, q.registeredOn, q.opensOn, q.closesOn, questSettlesOn(q), q.author, q.approvedBy ?? '', hash,
    q.type === 'forecast' ? q.rule : '', q.type === 'forecast' ? q.fallback === 'unresolvable' ? 'unresolvable' : q.fallback.rule : '', detailOf(q), sourcesOf(q), q.knownLimits.join(';'),
  ]);

  const entries = x.entries.filter((e) => inYear.has(key(e.questId, e.questVersion))).sort((a, b) => a.questId.localeCompare(b.questId) || a.login.localeCompare(b.login) || a.n - b.n);
  const counted = new Set(quests.flatMap((q) => countedPublicEntries(x.entries, q.quest.id, q.quest.version)).map((e) => `${key(e.questId, e.questVersion)}/${e.login}/${e.n}`));
  const entryRows = entries.map((e) => {
    const a = e.answer as Partial<Record<'probability' | 'level' | 'position' | 'value' | 'test', unknown>>;
    return [e.questId, e.questVersion, e.questHash, e.login, e.n, counted.has(`${key(e.questId, e.questVersion)}/${e.login}/${e.n}`), e.via, a.probability, a.level, a.position, a.value, a.test, e.code, e.rationale, e.receivedAt];
  });

  const lines = x.lines.filter((l) => inYear.has(key(l.questId, l.questVersion)));
  const resultRows = lines.map((l) => {
    const o = l.outcome as Record<string, unknown> | undefined;
    return [l.seq, l.at, l.kind, l.questId, l.questVersion, l.questHash, o?.answer, o?.happened, o?.baseRate, o?.value, o?.noChange, o?.tolerance, l.readings, l.via, l.reason, l.decision, l.by, l.hash];
  });

  const verdicts = x.tests.filter((t) => inYear.has(key(t.questId, t.questVersion)));
  const verdictRows = verdicts.map((t) => [t.questId, t.questVersion, t.login, t.n, t.entryHash, t.method, t.registeredOn, t.maxPValue, t.ranAt, t.verdict, t.p, t.summary]);

  const scores = x.stats.contributors.flatMap((c) => c.entries.filter((s) => ids.has(s.questId)).map((s) => ({ login: c.login, s }))).sort((a, b) => a.s.questId.localeCompare(b.s.questId) || a.login.localeCompare(b.login));
  const scoreRows = scores.map(({ login, s }) => [s.questId, login, s.answer, s.p, s.happened, s.brier, s.skill, s.error, s.beatNoChange, s.seq]);

  const tables: Record<keyof typeof COLUMNS, unknown[][]> = { 'quests.csv': questRows, 'entries.csv': entryRows, 'results.csv': resultRows, 'test-verdicts.csv': verdictRows, 'scores.csv': scoreRows };
  const files: Record<string, string> = {};
  for (const [name, rows] of Object.entries(tables) as Array<[keyof typeof COLUMNS, unknown[][]]>) files[name] = csv(COLUMNS[name].map(([c]) => c), rows);

  const licenceIds = new Set(quests.flatMap((q) => questSeriesRefs(q.quest).map((r) => questSeriesDef(r.series)?.licence)).filter(Boolean));
  const credits = DATA_LICENCES.filter((r) => licenceIds.has(r.id)).map((r) => `- ${r.name}: ${r.attribution}`);
  const repoUrl = x.repo ? `https://github.com/${x.repo}` : '';
  const title = `EconQuest Quests dataset ${x.year}`;
  const counts = { quests: questRows.length, entries: entryRows.length, results: resultRows.length, verdicts: verdictRows.length, scores: scoreRows.length };
  const table = (name: keyof typeof COLUMNS) => ['| Column | Meaning |', '| --- | --- |', ...COLUMNS[name].map(([c, m]) => `| ${c} | ${m} |`)].join('\n');

  files['README.md'] = `# ${title}

Open questions on the economy, the answers people gave, and how each was settled, for every Quest that closed in ${x.year}. Built ${x.builtOn} by \`npm run quests:dataset -- --year ${x.year}\` from the public files in the Quests repository${repoUrl ? ` (${repoUrl})` : ''}; anyone can rebuild it from the same files and get the same tables.

## What a Quest is

A Quest is a question with a rule fixed before anyone can see the answer. A **Forecast** Quest is settled from a public data feed on a stated date: entrants give a chance (yes or no questions) or a number. A **Signal** Quest takes pre-registered tests of an idea, each run once after entries close. A **Replication** Quest asks people to reproduce a figure the app shows with their own script. A **Debate** Quest takes a position and an argument and is never scored. A recorded result is never changed: a dispute decision or a later revision of the source's figure is a new line beside it.

## Files

| File | Rows | What it holds |
| --- | --- | --- |
| quests.csv | ${counts.quests} | Each approved Quest that closed in ${x.year} |
| entries.csv | ${counts.entries} | Every public entry to them, replacements included |
| results.csv | ${counts.results} | Every line of the results record about them |
| test-verdicts.csv | ${counts.verdicts} | Verdicts of the tests entered to Signal Quests |
| scores.csv | ${counts.scores} | The score of each counted forecast on a settled Quest |
| CITATION.cff | | How to cite this dataset |
| SHA256SUMS | | Checksums of every file above |

CSV files are UTF-8 with a header row. Empty means not applicable. JSON is used where a cell holds a structure. Text that starts with = + - or @ has a ' in front so spreadsheets do not run it as a formula.

### quests.csv

${table('quests.csv')}

### entries.csv

${table('entries.csv')}

### results.csv

${table('results.csv')}

### test-verdicts.csv

${table('test-verdicts.csv')}

### scores.csv

${table('scores.csv')}

## How to read the scores

The base rate is how often the same thing happened in the past. Skill is the base rate's Brier score minus the entrant's, so plus means the entrant did better than simply using the base rate. One Quest says little; the app ranks nobody before 12 settled forecasts. Scores here can be worked out again from entries.csv and results.csv.

## What is left out, and why

- Stance profiles (the economics questions some people chose to answer on their public profile): a stance tied to a name is a political opinion, and a person can remove their profile from the repository but could not remove it from a deposited dataset.
- GitHub account dates, used only for the 90-day ranking rule.
- Anything kept privately in the app: private forecast logs, practice answers and class tables.
- Draft Quests that were never approved.

## Licence and credit

Quest text, entries and these tables: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Credit "EconQuest Quests contributors" and link to the dataset.

${credits.length ? `The settled values come from these sources, whose own terms still apply to the figures:\n\n${credits.join('\n')}` : 'No feed figures are included.'}

## Getting a DOI

Upload every file in this folder to a repository that issues DOIs, such as Zenodo (https://zenodo.org): choose "Dataset", licence CC BY 4.0, title "${title}", and paste this README's first paragraph as the description. Then add the DOI to CITATION.cff and to the Quests page.

---

${EXPORT_NOTICE}
`;

  files['CITATION.cff'] = `cff-version: 1.2.0
message: "If you use this dataset, please cite it as below."
title: "${title}"
type: dataset
authors:
  - name: "EconQuest Quests contributors"
license: CC-BY-4.0
date-released: "${x.builtOn}"
${repoUrl ? `repository: "${repoUrl}"\n` : ''}keywords:
  - forecasting
  - macroeconomics
  - open data
  - pre-registration
  - crowd forecasts
`;

  return { files, counts };
}
