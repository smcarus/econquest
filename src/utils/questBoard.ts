/**
 * The public Quests board (Quests step 11): one static web page, built by `npm run quests:board`
 * from the files in quests/ only (Quests, public entries, the results record, Signal Quest verdicts,
 * stance profiles), for people who never install the app. It can be served by GitHub Pages.
 *
 * It shows what the app's Scoreboard shows and nothing more: the ranked table with 90% ranges and
 * its rules, seasons, the crowd against the base rate, each approved Quest with its result, every
 * contributor's settled count, the health measures (src/utils/questHealth.ts), and the stances of
 * people who signed up with a profile. Every figure
 * is worked out from public files, so anyone can rebuild the page and get the same thing.
 *
 * Browser-safe, pure: returns the HTML text.
 */
import { EXPORT_NOTICE } from './disclaimer';
import { questSettlesOn, questStatus, type Quest } from './quests';
import { describeOutcome, resultState, type ResolutionLine } from './questResolve';
import type { BoardRow, ContributorStats, Gated, QuestStats } from './questStats';
import type { QuestHealth } from './questHealth';
import { STANCE_AXES, stanceWords, type StanceProfile } from './questStances';

export interface BoardInput {
  stats: QuestStats;
  quests: Array<{ quest: Quest; approved: boolean }>;
  lines: ResolutionLine[];
  profiles: StanceProfile[];
  /** The health measures; the section is left out when not given. */
  health?: QuestHealth;
  /** owner/name of the public repository, for links; '' when not set. */
  repo: string;
  today: string;
}

const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const sign = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(3)}`;
const gated = <T>(g: Gated<T>, show: (v: T) => string) => ('value' in g ? show(g.value) : `needs ${g.needs} more (has ${g.n})`);

const STATUS: Record<string, string> = { upcoming: 'Opens soon', open: 'Open', closed: 'Closed to entries', due: 'Result due', draft: 'Draft' };
const TYPE: Record<string, string> = { forecast: 'Forecast', signal: 'Signal', replication: 'Replication', debate: 'Debate' };

function table(rows: BoardRow[]): string {
  if (!rows.length) return '<p class="muted">Nobody has enough settled forecasts to be ranked yet.</p>';
  return `<table><thead><tr><th>Rank</th><th>Who</th><th>Settled</th><th>Skill</th><th>90% range</th></tr></thead><tbody>${rows
    .map((r) => `<tr><td>${r.rank}</td><td><a href="#c-${esc(r.login)}">${esc(r.login)}</a></td><td>${r.n}</td><td>${sign(r.score)}</td><td>${sign(r.low)} to ${sign(r.high)}</td></tr>`)
    .join('')}</tbody></table>`;
}

function healthSection(h: QuestHealth): string {
  if (!h.approved) return '';
  const months = h.months.length
    ? `<table><thead><tr><th>Month closed</th><th>Quests</th><th>Entries</th><th>People</th></tr></thead><tbody>${h.months.map((m) => `<tr><td>${esc(m.month)}</td><td>${m.questsClosed}</td><td>${m.entries}</td><td>${m.people}</td></tr>`).join('')}</tbody></table>`
    : '<p class="muted">No Quest has closed yet.</p>';
  const ot = h.onTime;
  const onTime = ot.share === null ? 'No result has been due long enough to judge yet.' : `${Math.round(ot.share * 100)}% of results were recorded within ${ot.graceDays} days of their due date (${ot.onTime} of ${ot.due}; ${ot.late} late, ${ot.overdue} overdue).`;
  return `<h2>Is it working?</h2>
<p>${h.approved} approved Quests, ${h.closed} closed to entries${h.closedEmpty ? ` (${h.closedEmpty} with no entries)` : ''}; ${h.totalEntries} counted entries from ${h.totalPeople} people, ${h.returning} of whom came back in more than one month. The middle closed Quest had ${h.medianEntries === null ? 'no entries yet' : `${h.medianEntries} entr${h.medianEntries === 1 ? 'y' : 'ies'}`}. ${esc(onTime)}${h.reviewOn ? ` These measures are reviewed on ${esc(h.reviewOn)}, six months after the first Quest opened.` : ''}</p>
${months}
<p class="small">People are counted by the month each Quest closed, since entry files carry no date of their own.</p>`;
}

function contributor(c: ContributorStats, profile: StanceProfile | undefined): string {
  const parts = c.entered
    ? [
        `forecasts: ${c.entered} entered, ${c.settled} settled, ${c.unresolvable} unresolvable or withdrawn, ${c.waiting} waiting`,
        `skill ${gated(c.skill, (v) => `${sign(v.score)} (90% range ${sign(v.low)} to ${sign(v.high)})`)}`,
        `calibration gap ${gated(c.calibration, (v) => `${Math.round(v.gap * 100)}%`)}`,
      ]
    : ['no forecasts entered'];
  const lists = [
    c.debates.length ? `Debates argued (never scored): ${c.debates.map((d) => esc(d.title)).join('; ')}` : '',
    c.replications.length ? `Replications (never ranked): ${c.replications.map((r) => `${esc(r.title)} (${r.matched === null ? 'waiting' : r.matched ? 'reproduced' : 'did not match'})`).join('; ')}` : '',
    c.tests.length ? `Tests proposed (never ranked): ${c.tests.map((t) => `${esc(t.title)} (${t.verdict === null ? 'not run yet' : t.verdict.replace(/_/g, ' ')})`).join('; ')}` : '',
    c.unranked && c.entered ? `Not ranked: ${esc(c.unranked)}` : '',
  ].filter(Boolean);
  const stances = profile
    ? `<details><summary>Stances ${esc(c.login)} chose to show (since ${esc(profile.shownSince)})</summary><ul>${STANCE_AXES.filter((a) => profile.axes[a.id] !== undefined)
        .map((a) => `<li>${esc(a.question)} ${esc(stanceWords(a, profile.axes[a.id]))}</li>`)
        .join('')}</ul></details>`
    : '';
  return `<li id="c-${esc(c.login)}"><strong>${esc(c.login)}</strong>${c.emailed ? ' <span class="muted">(entries emailed to a maintainer)</span>' : ''}: ${parts.map(esc).join('; ')}.${lists.map((l) => `<div class="small">${l}</div>`).join('')}${stances}</li>`;
}

export function boardHtml(x: BoardInput): string {
  const { stats } = x;
  const approved = x.quests.filter((q) => q.approved).sort((a, b) => questSettlesOn(b.quest).localeCompare(questSettlesOn(a.quest)) || a.quest.id.localeCompare(b.quest.id));
  const repoLink = x.repo ? `https://github.com/${x.repo}` : '';
  const profiles = new Map(x.profiles.map((p) => [p.login, p]));
  const contributors = stats.contributors.map((c) => c.login);
  const profileOnly = x.profiles.filter((p) => !contributors.includes(p.login));
  const quests = approved
    .map(({ quest: q }) => {
      const st = resultState(x.lines, q.id, q.version);
      const pending = q.type === 'debate' ? `Argued, not scored; the evidence map follows close` : q.type === 'signal' ? `Each test is run once after entries close` : `No result yet (due ${questSettlesOn(q)})`;
      const result = st.state === 'none' ? pending : describeOutcome(st.state === 'withdrawn' ? st.line : st.decision ?? st.line);
      const link = repoLink ? ` <a href="${esc(`${repoLink}/blob/main/quests/${q.version === 1 ? q.id : `${q.id}.v${q.version}`}.json`)}">file</a>` : '';
      return `<tr><td>${esc(q.title)}${link}</td><td>${esc(TYPE[q.type])}</td><td>${esc(STATUS[questStatus(q, x.today)] ?? '')}</td><td>${esc(q.closesOn)}</td><td>${esc(result)}</td></tr>`;
    })
    .join('');
  const seasons = Object.entries(stats.board.seasons)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([y, rows]) => `<h3>Season ${esc(y)}</h3>${table(rows)}`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quests board</title>
<style>
:root{--bg:#fff;--fg:#0f172a;--muted:#64748b;--line:#e2e8f0;--link:#1d4ed8}
@media (prefers-color-scheme:dark){:root{--bg:#0b1120;--fg:#e2e8f0;--muted:#94a3b8;--line:#1e293b;--link:#93c5fd}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:24px 16px}
h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.15rem;margin:28px 0 8px}h3{font-size:1rem;margin:18px 0 6px}
a{color:var(--link)}.muted{color:var(--muted)}.small{font-size:.85rem;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:.9rem;display:block;overflow-x:auto}
th,td{text-align:left;padding:6px 8px;border-top:1px solid var(--line);vertical-align:top}th{font-weight:500;color:var(--muted)}
ul{padding-left:20px}li{margin:6px 0}footer{margin-top:32px;font-size:.85rem;color:var(--muted)}
</style>
</head>
<body>
<main>
<h1>Quests board</h1>
<p class="muted">Open questions on the economy, settled by stated rules from public data. Built ${esc(stats.asOf.slice(0, 10))} from the files in the Quests repository${repoLink ? ` (<a href="${esc(repoLink)}">${esc(x.repo)}</a>)` : ''}; anyone can rebuild it with <code>npm run quests:board</code> and get the same page.</p>

<h2>How the ranking works</h2>
<p>People are ranked on one thing: skill, meaning how much better their probabilities were than just using the base rate (how often the same thing happened in the past). Plus means better than the base rate, minus means worse. The 90% range shows how sure we can be: if two people's ranges overlap, they may not really differ. To be ranked, a person needs at least ${stats.minimums.skill} settled forecasts and a GitHub account at least ${stats.accountDays} days old when the first Quest they entered closed. Nobody is ranked on how many Quests they enter. Debates, replications and proposed tests are listed, never ranked.</p>

<h2>All time</h2>
${table(stats.board.allTime)}
${seasons}
<p>The crowd (the middle answer on each Quest) against the base rate: ${esc(gated(stats.crowd, (v) => sign(v)))}.</p>

<h2>Quests</h2>
${approved.length ? `<table><thead><tr><th>Quest</th><th>Type</th><th>Status</th><th>Entries close</th><th>Result</th></tr></thead><tbody>${quests}</tbody></table>` : '<p class="muted">No approved Quests yet.</p>'}

${x.health ? healthSection(x.health) : ''}

<h2>Everyone who has entered</h2>
${stats.contributors.length ? `<ul>${stats.contributors.map((c) => contributor(c, profiles.get(c.login))).join('')}</ul>` : '<p class="muted">No public entries yet.</p>'}
${
  profileOnly.length
    ? `<h3>Signed up with a stance profile, no entries yet</h3><ul>${profileOnly
        .map((p) => `<li id="c-${esc(p.login)}"><strong>${esc(p.login)}</strong> <span class="muted">since ${esc(p.shownSince)}</span><ul>${STANCE_AXES.filter((a) => p.axes[a.id] !== undefined).map((a) => `<li>${esc(a.question)} ${esc(stanceWords(a, p.axes[a.id]))}</li>`).join('')}</ul></li>`)
        .join('')}</ul>`
    : ''
}
<p class="small">Stances are self-declared by people who chose to sign up with a profile; the app never works out anyone's stance. Tables of stance against skill for groups are not shown.</p>

<footer>
<p>Quest text, entries and this page: CC BY 4.0. Results are worked out from public data feeds by stated rules; a result can be disputed in the Quest's discussion within 7 days, and a decision is recorded beside it, never in place of it.</p>
<p>${esc(EXPORT_NOTICE)}</p>
</footer>
</main>
</body>
</html>
`;
}
