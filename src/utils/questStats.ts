/**
 * Contributor statistics (Quests step 7): computed only from public entries (quests/entries/) and
 * recorded results (quests/resolutions.jsonl), never from live feeds, so anyone can recompute them.
 *
 * Every figure carries its sample size, and a figure resting on too few cases says how many more it
 * needs instead of showing a number:
 *
 *   skill score        mean of (base-rate Brier - entry Brier); positive = better than the base rate  12 settled
 *   beat no change     share of number forecasts closer than "nothing moves"                          12 settled
 *   calibration        10% bins: what was said against what happened, and the average gap             30 settled
 *   sharpness          how far probabilities sit from 50% (0 = always 50%, 1 = always 0% or 100%)     12 settled
 *   contrarian record  skill where the entry called the other outcome from the crowd's middle answer 12 such
 *   field strengths    skill by topic and by region                                                   8 in that field
 *   forward streak     settled Quests in a row with positive skill; shown, never ranked               5 settled
 *   debates argued     the Debate Quests a person argued (step 9); listed, never scored or ranked     none
 *
 * Rankings: by skill score only, among people with 12 or more settled forecasts with a base rate,
 * whose GitHub account was at least 90 days old when their first Quest closed (emailed entries,
 * checked by a maintainer, count without one). Each score has a bootstrap 90% interval, so readers
 * can see when two people are not really different. Seasons by calendar year of the settle date,
 * plus an all-time table; field tables rank only within a field. Nobody is ranked on volume.
 *
 * Browser-safe, pure.
 */
import { questSettlesOn, type DebateQuest, type ForecastQuest } from './quests';
import { countedPublicEntries, entrySpread, type PublicEntry } from './questPublicEntries';
import { resultState, type ResolutionLine } from './questResolve';
import { brier, mean, scoreLevel, scoreProbability } from './questScoring';

export const MIN = { skill: 12, beatNoChange: 12, calibration: 30, sharpness: 12, contrarian: 12, field: 8, streak: 5 } as const;
export const ACCOUNT_DAYS = 90;
export const BOOTSTRAP_RUNS = 2000;

/** A figure, or how many more cases it needs. */
export type Gated<T> = { n: number; value: T } | { n: number; needs: number };

export interface CalibrationBin {
  from: number;
  to: number;
  n: number;
  /** Mean probability stated, and share that happened. */
  said: number;
  happened: number;
}

export interface ScoredEntry {
  questId: string;
  title: string;
  settlesOn: string;
  answer: 'probability' | 'level';
  /** probability */
  p?: number;
  happened?: boolean;
  brier?: number;
  /** null when the Quest had no base rate */
  skill?: number | null;
  contrarian?: boolean;
  /** level */
  error?: number;
  beatNoChange?: boolean | null;
  topics: string[];
  region: string;
  seq: number;
}

export interface ContributorStats {
  login: string;
  emailed: boolean;
  entered: number;
  settled: number;
  unresolvable: number;
  waiting: number;
  byTopic: Record<string, number>;
  byRegion: Record<string, number>;
  skill: Gated<{ score: number; low: number; high: number }>;
  beatNoChange: Gated<number>;
  calibration: Gated<{ bins: CalibrationBin[]; gap: number }>;
  sharpness: Gated<number>;
  contrarian: Gated<number>;
  fields: Array<{ field: string; kind: 'topic' | 'region'; stat: Gated<number> }>;
  streak: Gated<number>;
  proposed: Array<{ questId: string; entries: number }>;
  /** Debate Quests argued: listed, never scored or ranked. */
  debates: Array<{ questId: string; title: string }>;
  /** Why the person is not on the scoreboard, when they are not. */
  unranked?: string;
  entries: ScoredEntry[];
}

export interface BoardRow {
  rank: number;
  login: string;
  n: number;
  score: number;
  low: number;
  high: number;
}

export interface QuestStats {
  asOf: string;
  contributors: ContributorStats[];
  board: { allTime: BoardRow[]; seasons: Record<string, BoardRow[]>; fields: Record<string, BoardRow[]> };
  crowd: Gated<number>;
  minimums: typeof MIN;
  accountDays: number;
}

const round = (x: number) => Math.round(x * 1e4) / 1e4;
const gate = <T>(n: number, min: number, value: () => T): Gated<T> => (n >= min ? { n, value: value() } : { n, needs: min - n });

/** Small deterministic random numbers, so the same files always give the same intervals. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 90% bootstrap interval of the mean. */
export function bootstrapMean(xs: number[], seed: string, runs = BOOTSTRAP_RUNS): { low: number; high: number } {
  const r = rng(seed);
  const means: number[] = [];
  for (let k = 0; k < runs; k++) {
    let s = 0;
    for (let i = 0; i < xs.length; i++) s += xs[Math.floor(r() * xs.length)];
    means.push(s / xs.length);
  }
  means.sort((a, b) => a - b);
  return { low: round(means[Math.floor(runs * 0.05)]), high: round(means[Math.min(runs - 1, Math.floor(runs * 0.95))]) };
}

export function calibrationBins(rows: Array<{ p: number; happened: boolean }>): { bins: CalibrationBin[]; gap: number } {
  const bins: CalibrationBin[] = [];
  for (let b = 0; b < 10; b++) {
    const inBin = rows.filter((r) => (b === 9 ? r.p >= 0.9 : r.p >= b / 10 && r.p < (b + 1) / 10));
    if (!inBin.length) continue;
    bins.push({ from: b / 10, to: (b + 1) / 10, n: inBin.length, said: round(inBin.reduce((s, r) => s + r.p, 0) / inBin.length), happened: round(inBin.filter((r) => r.happened).length / inBin.length) });
  }
  const total = bins.reduce((s, b) => s + b.n, 0);
  return { bins, gap: round(bins.reduce((s, b) => s + b.n * Math.abs(b.said - b.happened), 0) / Math.max(1, total)) };
}

function rankRows(rows: Array<{ login: string; skills: number[] }>, min: number, seed: string): BoardRow[] {
  return rows
    .filter((r) => r.skills.length >= min)
    .map((r) => ({ login: r.login, n: r.skills.length, score: round(r.skills.reduce((a, b) => a + b, 0) / r.skills.length), ...bootstrapMean(r.skills, `${seed}|${r.login}`) }))
    .sort((a, b) => b.score - a.score || a.login.localeCompare(b.login))
    .map((r, i) => ({ rank: i + 1, ...r }));
}

export interface StatsInput {
  quests: Array<{ quest: ForecastQuest | DebateQuest; approved: boolean }>;
  entries: PublicEntry[];
  lines: ResolutionLine[];
  /** GitHub login -> account creation time (ISO), as looked up by npm run quests:stats. */
  accounts: Record<string, string>;
}

export function computeStats({ quests, entries, lines, accounts }: StatsInput): QuestStats {
  const approved = quests.filter((q) => q.approved);
  const byPerson = new Map<string, { entered: number; unresolvable: number; waiting: number; byTopic: Record<string, number>; byRegion: Record<string, number>; scored: ScoredEntry[]; firstClose: string; debates: Array<{ questId: string; title: string }> }>();
  const person = (login: string) => byPerson.get(login) || { entered: 0, unresolvable: 0, waiting: 0, byTopic: {}, byRegion: {}, scored: [], firstClose: '9999-12-31', debates: [] };
  let crowdSkills: number[] = [];
  for (const { quest } of approved) {
    const counted = countedPublicEntries(entries, quest.id, quest.version);
    if (!counted.length) continue;
    if (quest.type === 'debate') {
      for (const e of counted) {
        const p = person(e.login);
        p.debates.push({ questId: quest.id, title: quest.title });
        byPerson.set(e.login, p);
      }
      continue;
    }
    const st = resultState(lines, quest.id, quest.version);
    const probs = counted.filter((e) => 'probability' in e.answer).map((e) => (e.answer as { probability: number }).probability);
    const median = entrySpread(probs)?.median;
    if (st.state === 'settled' && st.line.outcome?.answer === 'probability' && st.line.outcome.baseRate !== null && median !== undefined) {
      crowdSkills.push(brier(st.line.outcome.baseRate, st.line.outcome.happened) - brier(median, st.line.outcome.happened));
    }
    for (const e of counted) {
      const p = person(e.login);
      p.entered++;
      if (quest.closesOn < p.firstClose) p.firstClose = quest.closesOn;
      for (const t of quest.topics) p.byTopic[t] = (p.byTopic[t] || 0) + 1;
      p.byRegion[quest.region] = (p.byRegion[quest.region] || 0) + 1;
      if (st.state === 'none') p.waiting++;
      else if (st.state !== 'settled' || !st.line.outcome) p.unresolvable++;
      else {
        const o = st.line.outcome;
        const base = { questId: quest.id, title: quest.title, settlesOn: questSettlesOn(quest), topics: quest.topics, region: quest.region, seq: st.line.seq };
        if (o.answer === 'probability' && 'probability' in e.answer) {
          const s = scoreProbability(e.answer.probability, o.happened, o.baseRate);
          const pr = e.answer.probability;
          const contrarian = median !== undefined && pr !== 0.5 && median !== 0.5 && pr > 0.5 !== median > 0.5;
          p.scored.push({ ...base, answer: 'probability', p: pr, happened: o.happened, brier: s.brier, skill: s.skill, contrarian });
        } else if (o.answer === 'level' && 'level' in e.answer) {
          const s = scoreLevel(e.answer.level, o.value, o.noChange);
          p.scored.push({ ...base, answer: 'level', error: s.error, beatNoChange: s.noChangeError === null ? null : s.error < s.noChangeError });
        } else p.unresolvable++;
      }
      byPerson.set(e.login, p);
    }
  }
  crowdSkills = crowdSkills.map(round);

  const contributors: ContributorStats[] = [];
  const eligible: Array<{ login: string; scored: ScoredEntry[] }> = [];
  for (const [login, p] of [...byPerson.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const scored = p.scored.sort((a, b) => a.seq - b.seq);
    const prob = scored.filter((s) => s.answer === 'probability');
    const withSkill = prob.filter((s) => s.skill !== null && s.skill !== undefined);
    const skills = withSkill.map((s) => s.skill as number);
    const lv = scored.filter((s) => s.answer === 'level' && s.beatNoChange !== null && s.beatNoChange !== undefined);
    const contra = withSkill.filter((s) => s.contrarian);
    const fields = [
      ...[...new Set(withSkill.flatMap((s) => s.topics))].map((f) => ({ field: f, kind: 'topic' as const, xs: withSkill.filter((s) => s.topics.includes(f)).map((s) => s.skill as number) })),
      ...[...new Set(withSkill.map((s) => s.region))].map((f) => ({ field: f, kind: 'region' as const, xs: withSkill.filter((s) => s.region === f).map((s) => s.skill as number) })),
    ].sort((a, b) => a.field.localeCompare(b.field));
    let streak = 0;
    for (let i = withSkill.length - 1; i >= 0 && (withSkill[i].skill as number) > 0; i--) streak++;
    const emailed = login.startsWith('~');
    const created = accounts[login];
    const cutoff = new Date(Date.parse(`${p.firstClose}T00:00:00Z`) - ACCOUNT_DAYS * 86_400_000).toISOString();
    let unranked: string | undefined;
    if (skills.length < MIN.skill) unranked = `Ranked after ${MIN.skill} settled forecasts with a base rate (${skills.length} so far)`;
    else if (!emailed && !created) unranked = 'GitHub account age not checked yet (npm run quests:stats looks it up)';
    else if (!emailed && created > cutoff) unranked = `GitHub account was less than ${ACCOUNT_DAYS} days old when the first Quest it entered closed`;
    if (!unranked) eligible.push({ login, scored: withSkill });
    contributors.push({
      login,
      emailed,
      entered: p.entered,
      settled: scored.length,
      unresolvable: p.unresolvable,
      waiting: p.waiting,
      byTopic: p.byTopic,
      byRegion: p.byRegion,
      skill: gate(skills.length, MIN.skill, () => ({ score: mean(skills) as number, ...bootstrapMean(skills, `all|${login}`) })),
      beatNoChange: gate(lv.length, MIN.beatNoChange, () => round(lv.filter((s) => s.beatNoChange).length / lv.length)),
      calibration: gate(prob.length, MIN.calibration, () => calibrationBins(prob.map((s) => ({ p: s.p as number, happened: s.happened as boolean })))),
      sharpness: gate(prob.length, MIN.sharpness, () => round(prob.reduce((a, s) => a + Math.abs((s.p as number) - 0.5) * 2, 0) / prob.length)),
      contrarian: gate(contra.length, MIN.contrarian, () => mean(contra.map((s) => s.skill as number)) as number),
      fields: fields.map((f) => ({ field: f.field, kind: f.kind, stat: gate(f.xs.length, MIN.field, () => mean(f.xs) as number) })),
      streak: gate(scored.length, MIN.streak, () => streak),
      proposed: approved.filter((q) => q.quest.author === login).map((q) => ({ questId: q.quest.id, entries: countedPublicEntries(entries, q.quest.id, q.quest.version).length })),
      debates: p.debates,
      ...(unranked ? { unranked } : {}),
      entries: scored,
    });
  }

  const seasons: Record<string, BoardRow[]> = {};
  for (const year of [...new Set(eligible.flatMap((e) => e.scored.map((s) => s.settlesOn.slice(0, 4))))].sort()) {
    const rows = rankRows(eligible.map((e) => ({ login: e.login, skills: e.scored.filter((s) => s.settlesOn.startsWith(year)).map((s) => s.skill as number) })), MIN.skill, year);
    if (rows.length) seasons[year] = rows;
  }
  const fieldBoards: Record<string, BoardRow[]> = {};
  for (const f of [...new Set(eligible.flatMap((e) => e.scored.flatMap((s) => [...s.topics, s.region])))].sort()) {
    const rows = rankRows(eligible.map((e) => ({ login: e.login, skills: e.scored.filter((s) => s.topics.includes(f) || s.region === f).map((s) => s.skill as number) })), MIN.field, f);
    if (rows.length) fieldBoards[f] = rows;
  }
  return {
    asOf: lines.length ? lines[lines.length - 1].at : '',
    contributors,
    board: { allTime: rankRows(eligible.map((e) => ({ login: e.login, skills: e.scored.map((s) => s.skill as number) })), MIN.skill, 'all'), seasons, fields: fieldBoards },
    crowd: gate(crowdSkills.length, MIN.skill, () => mean(crowdSkills) as number),
    minimums: MIN,
    accountDays: ACCOUNT_DAYS,
  };
}
