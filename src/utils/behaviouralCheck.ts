/**
 * Behavioural policy check (roadmap G33), a step in Policy review between Evidence and the memo.
 *
 * For each option saved in step 3, it flags where the option depends on how people behave (take-up
 * of a benefit, response to a tax change, trust in an inflation target, defaults, losses, acting now
 * for a gain later). The flags come from fixed word rules over the option's own saved text, so the
 * same options always give the same flags; no AI writes them. Each flag cites published studies from
 * the fixed list in src/data/behaviouralEvidence.ts, with full citations.
 *
 * No built-in effect sizes: a size appears only when the user enters it, with its source. The entries
 * are saved beside the review (not in the step hash chain), tied to the hash of the Options step they
 * were entered against, so they read "Out of date" once the options are run again. The server hashes
 * each save and writes it to the audit log.
 *
 * Labelled "Description, not a tested signal". Browser-safe.
 */
import { BEHAVIOUR_CHANNELS, CHANNEL_RULES, studyById, type BehaviourChannel, type BehaviourStudy } from '../data/behaviouralEvidence';
import type { PolicyOption } from './reviewOptions';

export const BEHAVIOUR_TEMPLATE_VERSION = 'behaviour-check-v1';
export const BEHAVIOUR_LABEL = 'Description, not a tested signal';
export const BEHAVIOUR_METHOD =
  'Fixed word rules read each saved option (its title, how it works, effect, trade-offs, who bears the cost, what must be true and risks). A flag means the text mentions something that depends on how people behave; it is not a forecast and not a test. Studies come only from a fixed list with full citations; no effect size is built in.';
export const MAX_EFFECTS = 24;

/** The option fields the rules read, in this order. */
export const FLAG_FIELDS = ['title', 'how', 'effect', 'tradeoffs', 'whoBears', 'mustBeTrue', 'risks'] as const;
type FlagField = (typeof FLAG_FIELDS)[number];
export const FIELD_LABEL: Record<FlagField, string> = {
  title: 'title',
  how: 'how it works',
  effect: 'effect',
  tradeoffs: 'trade-offs',
  whoBears: 'who bears the cost',
  mustBeTrue: 'what must be true',
  risks: 'risks',
};

export interface ChannelFlag {
  channel: BehaviourChannel;
  label: string;
  question: string;
  glossary?: string;
  /** The words that raised the flag, as written in the option (up to 5, first seen first). */
  matched: string[];
  /** Which fields of the option they were found in. */
  fields: FlagField[];
  studies: BehaviourStudy[];
}

export interface OptionFlags {
  rank: number;
  title: string;
  flags: ChannelFlag[];
}

/** Flags for one option, in the order of BEHAVIOUR_CHANNELS. */
export function flagOption(o: Pick<PolicyOption, FlagField>): ChannelFlag[] {
  const out: ChannelFlag[] = [];
  for (const channel of BEHAVIOUR_CHANNELS) {
    const rule = CHANNEL_RULES[channel];
    const re = new RegExp(rule.words.source, 'gi');
    const matched: string[] = [];
    const fields: FlagField[] = [];
    for (const f of FLAG_FIELDS) {
      const text = String(o[f] ?? '');
      let hit = false;
      for (const m of text.matchAll(re)) {
        hit = true;
        const w = m[0].toLowerCase();
        if (!matched.includes(w) && matched.length < 5) matched.push(w);
      }
      if (hit) fields.push(f);
    }
    if (!matched.length) continue;
    out.push({
      channel,
      label: rule.label,
      question: rule.question,
      ...(rule.glossary ? { glossary: rule.glossary } : {}),
      matched,
      fields,
      studies: rule.studies.map(studyById).filter((s): s is BehaviourStudy => Boolean(s)),
    });
  }
  return out;
}

/** Flags for every saved option, by rank. */
export function behaviouralFlags(options: PolicyOption[]): OptionFlags[] {
  return [...options].sort((a, b) => a.rank - b.rank).map((o) => ({ rank: o.rank, title: o.title, flags: flagOption(o) }));
}

/** One effect size the user entered, with its source. */
export interface BehaviourEffect {
  rank: number;
  channel: BehaviourChannel;
  /** The size in the user's own words and units, e.g. "take-up rose from 40% to 55%". */
  effect: string;
  /** Where the figure comes from: author, year, title, page or table. Required. */
  source: string;
  link?: string;
}

/** The saved entries for a review: kept beside the steps, tied to the Options step's hash. */
export interface BehaviourRecord {
  templateVersion: string;
  /** Hash of the Options step the entries were made against. */
  optionsHash: string;
  savedAt: string;
  effects: BehaviourEffect[];
  /** SHA-256 of templateVersion, optionsHash and effects (set by the server). */
  hash: string;
}

export type BehaviourState = 'not_started' | 'done' | 'out_of_date';

/** Where the entries stand against the Options step saved now. */
export function behaviourState(rec: BehaviourRecord | undefined, optionsHash: string | undefined): BehaviourState {
  if (!rec) return 'not_started';
  return optionsHash && rec.optionsHash === optionsHash ? 'done' : 'out_of_date';
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');

/** Checks the entries from the browser. Every entry needs an option, a channel, a size and its source. */
export function parseEffects(v: unknown, options: Pick<PolicyOption, 'rank'>[]): { effects: BehaviourEffect[] } | { errors: string[] } {
  const list = Array.isArray(v) ? v : [];
  if (list.length > MAX_EFFECTS) return { errors: [`At most ${MAX_EFFECTS} entries.`] };
  const ranks = new Set(options.map((o) => o.rank));
  const errors: string[] = [];
  const effects: BehaviourEffect[] = [];
  list.forEach((raw, i) => {
    const e = (raw ?? {}) as Record<string, unknown>;
    const n = i + 1;
    const rank = Number(e.rank);
    const channel = BEHAVIOUR_CHANNELS.find((c) => c === e.channel);
    const effect = str(e.effect, 200);
    const source = str(e.source, 300);
    const link = str(e.link, 400);
    if (!ranks.has(rank)) errors.push(`Entry ${n}: pick one of the saved options.`);
    if (!channel) errors.push(`Entry ${n}: pick which behaviour it is about.`);
    if (!effect) errors.push(`Entry ${n}: write the size, in its own units.`);
    if (source.length < 8) errors.push(`Entry ${n}: give the source (author, year, title, and the page or table).`);
    if (link && !/^https?:\/\/[^\s]+$/i.test(link)) errors.push(`Entry ${n}: the link must start with http:// or https://.`);
    if (channel && ranks.has(rank) && effect && source.length >= 8) effects.push({ rank, channel, effect, source, ...(link ? { link } : {}) });
  });
  return errors.length ? { errors } : { effects };
}

/** Plain text for a memo appendix or a copy: the flags and the user's sizes, with full citations. */
export function behaviourText(flags: OptionFlags[], effects: BehaviourEffect[]): string {
  const lines = [`Behavioural check (${BEHAVIOUR_LABEL})`, ''];
  for (const o of flags) {
    lines.push(`Option ${o.rank}: ${o.title}`);
    if (!o.flags.length) lines.push('  No behaviour the rules look for is mentioned.');
    for (const f of o.flags) {
      lines.push(`  ${f.label}: ${f.question}`);
      lines.push(`    Words: ${f.matched.join(', ')}`);
      for (const s of f.studies) lines.push(`    - ${s.citation} ${s.link}`);
      for (const e of effects.filter((x) => x.rank === o.rank && x.channel === f.channel)) lines.push(`    Size entered by you: ${e.effect} (source: ${e.source}${e.link ? `, ${e.link}` : ''})`);
    }
    for (const e of effects.filter((x) => x.rank === o.rank && !o.flags.some((f) => f.channel === x.channel)))
      lines.push(`  ${CHANNEL_RULES[e.channel].label}, size entered by you: ${e.effect} (source: ${e.source}${e.link ? `, ${e.link}` : ''})`);
    lines.push('');
  }
  lines.push(BEHAVIOUR_METHOD);
  return lines.join('\n');
}
