/**
 * Debate Quests (Quests step 9): argued, never scored.
 *
 *   Positions      a Debate Quest lists 2 to 4 positions; an entry picks one (position 1 is the first
 *                  listed) and argues it in at least 40 characters, citing the app's figures. Entries
 *                  are made like forecast entries: by pull request, by email, or privately in the app.
 *   Opening brief  once, before entries open, the app's own AI model (the referee model, 32B or
 *                  larger) writes the strongest case for each position, its weakest point, and which
 *                  figures in the app a reader should check. The brief may not state any number of
 *                  its own: a figure comes only from a feed, so a brief with a number not already in
 *                  the Quest's own words is refused. It is labelled as written by the model, recorded
 *                  with its model, settings and hash in quests/briefs/, and never changed.
 *   Claim Check    each argument is run through Claim Check (src/utils/claimCheck.ts), which puts
 *                  every figure it states next to the app's figure, by stated rules and no AI.
 *   Evidence map   after entries close: how many argued each position, each argument with its Claim
 *                  Check readings, and the results of any Forecast Quests the Debate names as related,
 *                  so readers can see which side later figures bore out. The map judges nobody; it
 *                  exports as Markdown with the app's standing notice.
 *
 * Browser-safe, pure.
 */
import type { LiveWatchlistItem } from '../types/council';
import { checkFigures, checkRank, rankClaim, type ClaimVerdict } from './claimCheck';
import { extractClaims } from './docFigureCheck';
import { withNotice } from './disclaimer';
import type { PublicEntry } from './questPublicEntries';
import type { DebateQuest } from './quests';

// ---------------------------------------------------------------- opening brief

export const BRIEF_TEXT_MAX = 600;
export const BRIEF_TEMPERATURE = 0;
export const BRIEF_SEED = 42;
export const BRIEF_LABEL =
  "Opening brief written by the app's AI model, not by a person. It sets out each side's strongest case and weakest point and says which figures to check; it states no figures of its own and takes no side. Recorded once, before entries opened, and never changed.";

export interface BriefPosition {
  position: number;
  strongest: string;
  weakest: string;
  check: string;
}

export interface DebateBrief {
  questId: string;
  questVersion: number;
  /** SHA-256 of the Quest file the brief was written for. */
  questHash: string;
  model: string;
  temperature: number;
  seed: number;
  writtenAt: string;
  /** The maintainer who ran it. */
  by: string;
  label: string;
  positions: BriefPosition[];
  /** SHA-256 of the brief without this field (canonicalBrief). */
  hash: string;
}

export const BRIEF_SYSTEM =
  'You write the opening brief for a public debate about an economic question. For each position, in order, write three short paragraphs for a reader with no training in economics: ' +
  '"strongest" (the best case for this position), "weakest" (the point its opponents will press hardest), and "check" (which figures in the app a reader should look at to judge it, such as reserves, inflation, the current account or government debt). ' +
  'Rules: plain words, no jargon without a one-line explanation; do NOT state any number, percentage, date or amount, because every figure must come from the app\'s data feeds, not from you; name the figures to look at instead; ' +
  'do not say which position is right; treat every position fairly. Return JSON: {"positions": [{"position": 1, "strongest": "...", "weakest": "...", "check": "..."}, ...]} with one object per position.';

export function briefPrompt(q: DebateQuest): string {
  return JSON.stringify(
    {
      question: q.title,
      background: q.summary,
      countries: q.countries,
      positions: q.positions.map((text, i) => ({ position: i + 1, text })),
      knownLimits: q.knownLimits,
    },
    null,
    2,
  );
}

/** Words with a digit in the brief that are not already in the Quest's own words (e.g. "G20" in its title). */
export function briefNumbers(text: string, q: DebateQuest): string[] {
  const own = new Set(
    [q.title, q.summary, ...q.positions, ...q.knownLimits]
      .join(' ')
      .split(/\s+/)
      .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase()),
  );
  return (text.match(/\S*\d\S*/g) || []).map((w) => w.replace(/^[^\w]+|[^\w]+$/g, '')).filter((w) => w && !own.has(w.toLowerCase()));
}

/** The model's reply as brief positions, or why it is refused. */
export function parseBrief(raw: string, q: DebateQuest): { positions: BriefPosition[] } | { problems: string[] } {
  let j: unknown;
  try {
    j = JSON.parse(raw.replace(/^[\s\S]*?(\{)/, '$1').replace(/\}[^}]*$/, '}'));
  } catch {
    return { problems: ['The model did not return JSON'] };
  }
  const list = (j as { positions?: unknown })?.positions;
  if (!Array.isArray(list)) return { problems: ['The reply has no list of positions'] };
  const problems: string[] = [];
  if (list.length !== q.positions.length) problems.push(`The reply covers ${list.length} positions; the Quest has ${q.positions.length}`);
  const positions: BriefPosition[] = [];
  list.slice(0, q.positions.length).forEach((x, i) => {
    const o = (x || {}) as Record<string, unknown>;
    const p: BriefPosition = { position: i + 1, strongest: String(o.strongest ?? '').trim(), weakest: String(o.weakest ?? '').trim(), check: String(o.check ?? '').trim() };
    if (o.position !== undefined && Number(o.position) !== i + 1) problems.push(`Position ${i + 1}: the reply numbers it ${String(o.position)}`);
    for (const k of ['strongest', 'weakest', 'check'] as const) {
      if (!p[k]) problems.push(`Position ${i + 1}: "${k}" is empty`);
      else if (p[k].length > BRIEF_TEXT_MAX) problems.push(`Position ${i + 1}: "${k}" is longer than ${BRIEF_TEXT_MAX} characters`);
      const nums = briefNumbers(p[k], q);
      if (nums.length) problems.push(`Position ${i + 1}: "${k}" states a figure (${nums.join(', ')}); a brief names figures to check and never gives them`);
    }
    positions.push(p);
  });
  return problems.length ? { problems } : { positions };
}

export function canonicalBrief(b: Omit<DebateBrief, 'hash'> | DebateBrief): string {
  const { hash: _h, ...rest } = b as DebateBrief;
  const sort = (v: unknown): unknown => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])])) : v);
  return JSON.stringify(sort(rest));
}

// ---------------------------------------------------------------- Claim Check on an argument

export interface ArgumentCheck {
  verdict: ClaimVerdict;
  reading: string;
}

/**
 * Claim Check on one argument, against the app's figures for the Quest's countries. Stated figures
 * are checked when the Quest names one country (as Claim Check does for a sentence); rankings for
 * each country.
 */
export function checkArgument(text: string, q: Pick<DebateQuest, 'countries'>, items: LiveWatchlistItem[]): ArgumentCheck[] {
  const named = items.filter((i) => q.countries.includes(i.iso3));
  const rc = rankClaim(text);
  const out: ArgumentCheck[] = [];
  if (!named.length) {
    if (rc || extractClaims(text).length)
      out.push({ verdict: 'cannot check', reading: `The Quest's ${q.countries.length === 1 ? 'country' : 'countries'} (${q.countries.join(', ')}) ${q.countries.length === 1 ? 'is' : 'are'} not on the watchlist in this app, so the figures could not be checked. Add ${q.countries.length === 1 ? 'it' : 'them'} to the watchlist and open this again.` });
    return out;
  }
  if (named.length === 1) for (const r of checkFigures(text, named[0])) out.push({ verdict: r.verdict, reading: r.reading });
  if (rc) for (const it of named) out.push((({ verdict, reading }) => ({ verdict, reading }))(checkRank(rc, it, items)));
  return out;
}

// ---------------------------------------------------------------- evidence map

export interface MapArgument {
  login: string;
  via: PublicEntry['via'];
  argument: string;
  checks: ArgumentCheck[];
}

export interface EvidenceMap {
  questId: string;
  title: string;
  total: number;
  positions: Array<{ position: number; text: string; count: number; arguments: MapArgument[]; matches: number; differs: number }>;
  related: Array<{ questId: string; title: string; result: string }>;
  /** Entries whose position is not one the Quest lists (should not happen once checked). */
  skipped: number;
}

export function evidenceMap(
  q: DebateQuest,
  counted: PublicEntry[],
  opts: { check?: (text: string) => ArgumentCheck[]; related?: EvidenceMap['related'] } = {},
): EvidenceMap {
  let skipped = 0;
  const positions = q.positions.map((text, i) => ({ position: i + 1, text, count: 0, arguments: [] as MapArgument[], matches: 0, differs: 0 }));
  for (const e of counted) {
    const pos = 'position' in e.answer ? e.answer.position : NaN;
    const row = positions.find((p) => p.position === pos);
    if (!row) {
      skipped++;
      continue;
    }
    const argument = e.rationale ?? '';
    const checks = opts.check ? opts.check(argument) : [];
    row.count++;
    row.matches += checks.filter((c) => c.verdict === 'matches' || c.verdict === 'holds').length;
    row.differs += checks.filter((c) => c.verdict === 'differs' || c.verdict === 'does not hold').length;
    row.arguments.push({ login: e.login, via: e.via, argument, checks });
  }
  return { questId: q.id, title: q.title, total: counted.length - skipped, positions, related: opts.related ?? [], skipped };
}

const quote = (s: string) => s.split('\n').map((l) => `> ${l}`).join('\n');

/** The evidence map as Markdown, with the brief if there is one, ending with the standing notice. */
export function evidenceMarkdown(m: EvidenceMap, brief?: DebateBrief | null, asOf?: string): string {
  const out: string[] = [`# Evidence map: ${m.title}`, '', `Debate Quest \`${m.questId}\`. Not scored: no position is marked right or wrong. ${m.total} ${m.total === 1 ? 'person' : 'people'} argued.${asOf ? ` Figures checked against the app on ${asOf}.` : ''}`, ''];
  out.push('| Position | Argued by | Figures that match the app | Figures that differ |', '|---|---|---|---|');
  for (const p of m.positions) out.push(`| ${p.position}. ${p.text} | ${p.count} | ${p.matches} | ${p.differs} |`);
  for (const p of m.positions) {
    out.push('', `## ${p.position}. ${p.text}`, '');
    const b = brief?.positions.find((x) => x.position === p.position);
    if (b) out.push(`**Opening brief** (written by ${brief!.model}, the app's AI model)`, '', `- Strongest case: ${b.strongest}`, `- Weakest point: ${b.weakest}`, `- Figures to check: ${b.check}`, '');
    if (!p.arguments.length) out.push('Nobody argued this position.');
    for (const a of p.arguments) {
      out.push(`**${a.login}**${a.via === 'email' ? ' (emailed)' : ''}`, '', quote(a.argument), '');
      if (a.checks.length) for (const c of a.checks) out.push(`- Claim Check (${c.verdict}): ${c.reading}`);
      else out.push('- Claim Check: no figure or ranking it could check.');
      out.push('');
    }
  }
  if (m.related.length) {
    out.push('## What related Forecast Quests found', '');
    for (const r of m.related) out.push(`- **${r.title}** (\`${r.questId}\`): ${r.result}`);
  }
  if (brief) out.push('', `_${brief.label}_`);
  out.push('', 'Claim Check compares the figures an argument states with the app\'s figures, which may be older or measure something else; it is a check against the app, not a verdict on the truth.');
  return withNotice(out.join('\n'));
}
