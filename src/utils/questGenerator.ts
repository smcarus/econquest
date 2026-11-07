/**
 * Quest generator and digest (Quests step 8).
 *
 * The generator drafts Forecast Quests on a fixed cadence for the maintainer to approve in a batch:
 *   weekly    Brent crude, and a few emerging-market currencies against the dollar, one week after
 *             entries close (entries open a week before they close)
 *   monthly   central bank policy rates: lower at the end of the next month than when entries close
 *             (a cut), for a set of central banks the BIS daily series covers
 * Every draft asks "higher or lower than on the day entries close", so a Quest file never carries a
 * figure. Each one passes the same checker as a hand-written Quest, and nothing is approved until
 * the maintainer runs npm run quests:approve. The app has no release or meeting calendar yet; when it
 * gets one, meeting-dated templates go here.
 *
 * The digest is the weekly "closing soon / opening / settled" summary, in plain words, for the
 * Discussions post and the app. Browser-safe, pure.
 */
import { questSettlesOn, questStatus, type ForecastQuest, type Quest, type QuestRegion, type QuestTopic } from './quests';
import { questProblems } from './quests';
import { seriesProblem } from './questSeries';
import { describeOutcome, resultState, type ResolutionLine } from './questResolve';
import { addDaysIso } from './questScoring';

interface Place {
  iso3: string;
  name: string;
  currency?: string;
  region: QuestRegion;
}

/** Currencies for weekly Quests (ECB reference rates cover them). */
export const WEEKLY_FX: Place[] = [
  { iso3: 'BRA', name: 'Brazil', currency: 'Brazilian real', region: 'Americas' },
  { iso3: 'MEX', name: 'Mexico', currency: 'Mexican peso', region: 'Americas' },
  { iso3: 'ZAF', name: 'South Africa', currency: 'South African rand', region: 'EMEA' },
  { iso3: 'TUR', name: 'Turkey', currency: 'Turkish lira', region: 'EMEA' },
  { iso3: 'IND', name: 'India', currency: 'Indian rupee', region: 'Asia-Pacific' },
  { iso3: 'IDN', name: 'Indonesia', currency: 'Indonesian rupiah', region: 'Asia-Pacific' },
  { iso3: 'JPN', name: 'Japan', currency: 'Japanese yen', region: 'Asia-Pacific' },
];

/** Central banks for monthly policy-rate Quests (BIS daily policy rates cover them). */
export const MONTHLY_POLICY: Place[] = [
  { iso3: 'USA', name: 'the United States', region: 'Americas' },
  { iso3: 'BRA', name: 'Brazil', region: 'Americas' },
  { iso3: 'MEX', name: 'Mexico', region: 'Americas' },
  { iso3: 'CHL', name: 'Chile', region: 'Americas' },
  { iso3: 'COL', name: 'Colombia', region: 'Americas' },
  { iso3: 'ZAF', name: 'South Africa', region: 'EMEA' },
  { iso3: 'TUR', name: 'Turkey', region: 'EMEA' },
  { iso3: 'POL', name: 'Poland', region: 'EMEA' },
  { iso3: 'HUN', name: 'Hungary', region: 'EMEA' },
  { iso3: 'IND', name: 'India', region: 'Asia-Pacific' },
  { iso3: 'IDN', name: 'Indonesia', region: 'Asia-Pacific' },
];

const longDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthEnd = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
};
/** The Friday on or after a date. */
const fridayOnOrAfter = (d: string) => {
  const day = new Date(`${d}T00:00:00Z`).getUTCDay();
  return addDaysIso(d, (5 - day + 7) % 7);
};

function draft(base: { id: string; title: string; summary: string; countries: string[]; topics: QuestTopic[]; region: QuestRegion; registeredOn: string; opensOn: string; closesOn: string; rule: ForecastQuest['rule']; knownLimits: string[]; author: string; tutorial?: boolean }): ForecastQuest {
  return { id: base.id, version: 1, registeredOn: base.registeredOn, opensOn: base.opensOn, author: base.author, type: 'forecast', title: base.title, summary: base.summary, countries: base.countries, topics: base.topics, region: base.region, closesOn: base.closesOn, rule: base.rule, fallback: 'unresolvable', knownLimits: base.knownLimits } as ForecastQuest;
}

export interface GenerateOptions {
  /** Today (YYYY-MM-DD): the registered date. */
  today: string;
  /** Draft Quests whose entries close in the next `weeks` weeks from `today`. */
  weeks: number;
  author: string;
  /** Ids already on file (drafts or approved); these are skipped. */
  existing: Set<string>;
}

/** Drafts for the coming weeks. Each passes the Quest checker, or is left out with the reason. */
export function generateQuests(o: GenerateOptions): { quests: ForecastQuest[]; skipped: Array<{ id: string; why: string }> } {
  const out: ForecastQuest[] = [];
  const skipped: Array<{ id: string; why: string }> = [];
  const add = (q: ForecastQuest) => {
    if (o.existing.has(q.id)) return;
    const problems = questProblems(q, { approved: false, fileName: `${q.id}.json` });
    const series = seriesProblem(q.rule.ref.country, q.rule.ref.series);
    if (series) problems.push(series);
    if (problems.length) skipped.push({ id: q.id, why: problems.join('; ') });
    else out.push(q);
  };
  // Weekly: entries close on Fridays from the second week on, so each is open a full week first.
  for (let w = 1; w <= o.weeks; w++) {
    const close = fridayOnOrAfter(addDaysIso(o.today, 7 * w));
    const open = addDaysIso(close, -7);
    const to = addDaysIso(close, 7);
    add(
      draft({
        id: `brent-week-${close}`,
        title: `Will Brent crude be higher on ${longDate(to)} than on ${longDate(close)}?`,
        summary: `Give the probability that the price of Brent crude oil (the main world benchmark, US EIA daily spot price) on the first day published on or after ${longDate(to)} is higher than on the day entries close, ${longDate(close)}. A short Quest: you see your score within about two weeks.`,
        countries: ['WLD'],
        topics: ['commodities'],
        region: 'Global',
        registeredOn: o.today,
        opensOn: open,
        closesOn: close,
        rule: { kind: 'direction', ref: { country: 'WLD', series: 'commodity_eia_rbrte' }, from: 'closesOn', to: { on: to }, op: 'higher' },
        knownLimits: ['EIA publishes daily spot prices a few days late; the Quest settles when the value for the date is out.', 'Over a single week, oil moves mostly on news nobody can know in advance; the base rate is close to 50%.'],
        author: o.author,
      }),
    );
    for (const c of WEEKLY_FX) {
      add(
        draft({
          id: `${c.iso3.toLowerCase()}-fx-week-${close}`,
          title: `Will the ${c.currency} be weaker against the US dollar on ${longDate(to)} than on ${longDate(close)}?`,
          summary: `Give the probability that it takes more ${c.currency} to buy one US dollar (ECB reference rate, crossed to the dollar) on the first fixing on or after ${longDate(to)} than on the day entries close, ${longDate(close)}. More units per dollar means a weaker ${c.currency}, which makes imports dearer in ${c.name}.`,
          countries: [c.iso3],
          topics: ['fx'],
          region: c.region,
          registeredOn: o.today,
          opensOn: open,
          closesOn: close,
          rule: { kind: 'direction', ref: { country: c.iso3, series: 'fx_per_usd' }, from: 'closesOn', to: { on: to }, op: 'higher' },
          knownLimits: ['The ECB does not fix on TARGET holidays; the first fixing on or after each date is used.', 'The rate is crossed through the euro, so it can differ slightly from rates quoted directly against the dollar.'],
          author: o.author,
        }),
      );
    }
  }
  // Monthly: entries close on the last day of each month in range; the rate is read at the end of the next month.
  const months = new Set<string>();
  for (let d = addDaysIso(o.today, 7); d <= addDaysIso(o.today, 7 * o.weeks); d = addDaysIso(d, 1)) months.add(monthEnd(d));
  for (const close of [...months].sort()) {
    if (close <= addDaysIso(o.today, 6)) continue;
    const to = monthEnd(addDaysIso(close, 1));
    const open = addDaysIso(close, -14);
    for (const c of MONTHLY_POLICY) {
      add(
        draft({
          id: `${c.iso3.toLowerCase()}-policy-cut-${to.slice(0, 7)}`,
          title: `Will the central bank of ${c.name} have cut its policy rate by ${longDate(to)}?`,
          summary: `Give the probability that the central bank policy rate of ${c.name} (BIS daily series) on ${longDate(to)} is lower than on the day entries close, ${longDate(close)}. The policy rate is the interest rate the central bank sets; a cut makes borrowing cheaper and usually happens when inflation is falling or the economy is weak.`,
          countries: [c.iso3],
          topics: ['monetary'],
          region: c.region,
          registeredOn: o.today,
          opensOn: open < o.today ? o.today : open,
          closesOn: close,
          rule: { kind: 'direction', ref: { country: c.iso3, series: 'policy_rate' }, from: 'closesOn', to: { on: to }, op: 'lower' },
          knownLimits: ['BIS daily data can lag a decision by a few days.', 'Whether a meeting falls in the window matters; check the central bank\'s own calendar before answering.'],
          author: o.author,
        }),
      );
    }
  }
  return { quests: out.sort((a, b) => a.closesOn.localeCompare(b.closesOn) || a.id.localeCompare(b.id)), skipped };
}

/** The Quest file as written: two-space JSON, newline at the end. */
export const questFileText = (q: Quest) => `${JSON.stringify(q, null, 2)}\n`;

export interface Digest {
  from: string;
  to: string;
  closingSoon: Array<{ id: string; title: string; closesOn: string }>;
  opening: Array<{ id: string; title: string; opensOn: string }>;
  settled: Array<{ id: string; title: string; result: string }>;
  due: Array<{ id: string; title: string; settlesOn: string }>;
}

/** The week's digest: approved Quests closing or opening in the next 7 days, results recorded in the last 7, and results due. */
export function questDigest(quests: Array<{ quest: Quest; approved: boolean }>, lines: ResolutionLine[], today: string): Digest {
  const next = addDaysIso(today, 7);
  const last = addDaysIso(today, -7);
  const approved = quests.filter((q) => q.approved).map((q) => q.quest);
  const title = (id: string) => approved.find((q) => q.id === id)?.title ?? id;
  return {
    from: today,
    to: next,
    closingSoon: approved.filter((q) => questStatus(q, today) === 'open' && q.closesOn <= next).map((q) => ({ id: q.id, title: q.title, closesOn: q.closesOn })).sort((a, b) => a.closesOn.localeCompare(b.closesOn)),
    opening: approved.filter((q) => q.opensOn > today && q.opensOn <= next).map((q) => ({ id: q.id, title: q.title, opensOn: q.opensOn })).sort((a, b) => a.opensOn.localeCompare(b.opensOn)),
    settled: lines.filter((l) => (l.kind === 'settled' || l.kind === 'unresolvable' || l.kind === 'decision' || l.kind === 'withdrawn') && l.at.slice(0, 10) > last && l.at.slice(0, 10) <= today).map((l) => ({ id: l.questId, title: title(l.questId), result: describeOutcome(l) })),
    due: approved.filter((q) => q.type === 'forecast' && q.closesOn < today && questSettlesOn(q) <= today && resultState(lines, q.id, q.version).state === 'none').map((q) => ({ id: q.id, title: q.title, settlesOn: questSettlesOn(q) })),
  };
}

/** The digest as a Discussions post (Markdown). */
export function digestMarkdown(d: Digest): string {
  const list = <T,>(xs: T[], line: (x: T) => string, none: string) => (xs.length ? xs.map((x) => `- ${line(x)}`).join('\n') : `_${none}_`);
  return [
    `## Quests this week (${longDate(d.from)} to ${longDate(d.to)})`,
    '',
    '### Closing soon',
    list(d.closingSoon, (x) => `**${x.title}** (closes ${longDate(x.closesOn)})`, 'Nothing closes this week.'),
    '',
    '### Opening',
    list(d.opening, (x) => `**${x.title}** (opens ${longDate(x.opensOn)})`, 'Nothing opens this week.'),
    '',
    '### Results recorded',
    list(d.settled, (x) => `**${x.title}**: ${x.result}`, 'No results were recorded this week.'),
    ...(d.due.length ? ['', '### Waiting for a result', list(d.due, (x) => `**${x.title}** (due ${longDate(x.settlesOn)})`, '')] : []),
    '',
    'Scores are against the base rate (how often the same thing happened before). Forecasting practice, not investment advice.',
    '',
  ].join('\n');
}
