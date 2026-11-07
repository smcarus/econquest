/**
 * Quests (src/utils/quests.ts): read-only routes for Menu > Quests. Off unless QUESTS_ENABLED=on
 * (docs/QUESTS.md); while off, every route answers { enabled: false } and nothing else.
 *
 *   GET /api/quests        every valid Quest (approved first, then drafts) with status and horizon
 *   GET /api/quests/:id    one Quest, its rule in words, and the latest value of each series it
 *                          reads, from the same feeds as Country Research > History & data
 *
 * Private entries and practice (step 4), never published:
 *   POST /api/quests/:id/private   log a forecast on this computer (hashed, append-only)
 *   GET  /api/quests/private       your entries with their scores
 *   GET  /api/quests/class/:code   the class table for a class code (this server only)
 *   GET  /api/quests/:id/practice  a past window of the Quest's own length, answer hidden
 *   POST /api/quests/practice/:token  score a practice answer at once (kept in memory only)
 *
 * Results (step 5), kept in quests/resolutions.jsonl and written only by `npm run quests:resolve`:
 *   GET  /api/quests/results       every recorded line, whether the chain holds, each Quest's state
 *   GET  /api/quests/due           approved forecast Quests past their settle date with no result
 *                                  yet, each with the result the feeds give now (?drafts=1 also
 *                                  previews drafts, which are never recorded)
 */
import type express from 'express';
import crypto from 'crypto';
import path from 'path';
import type { Account } from '../../utils/auth';
import { APP_ROOT, DATA_DIR } from '../config';
import type { SeriesSet } from '../../utils/seriesHistory';
import { questHorizon, questSeriesRefs, questSettlesOn, questStatus, questsEnabled, QUESTS_OFF_REASON, HORIZON_LABEL, type ForecastQuest, type Quest } from '../../utils/quests';
import { describeRule, type QuestSeriesRef as QuestSeriesRefLike } from '../../utils/questRules';
import { questSeriesDef } from '../../utils/questSeries';
import { loadQuests } from '../../utils/questStore';
import { classTable, countedEntries, entryProblems, practiceWindow, scoreEntry, scorePractice, type QuestEntry, type QuestEntryInput } from '../../utils/questEntries';
import { appendEntry, entryFilePath, loadEntries } from '../../utils/questEntryStore';
import { scoreLevel, scoreProbability, type Point } from '../../utils/questScoring';
import type { OfficialHistoryFile } from '../../utils/officialHistory';
import { resolveForecast, resultState, type ResolutionLine, type SeriesData } from '../../utils/questResolve';
import { loadResolutions, resolutionsPath } from '../../utils/questResolveStore';
import type { EntryScore } from '../../utils/questEntries';

export const QUESTS_DIR = path.join(APP_ROOT, 'quests');

export interface QuestDeps {
  seriesFor: (iso3: string) => Promise<SeriesSet>;
  /** Defaults to process.env.QUESTS_ENABLED. */
  enabled?: () => boolean;
  dir?: string;
  /** Where private entries are kept; defaults to data/local/quest-entries.jsonl. */
  entryFile?: string;
  refuseRemoteChange?: (req: express.Request, res: express.Response) => boolean;
  signedIn?: (res: express.Response) => Account | null;
  /** Random number in [0, 1) for practice windows; Math.random by default. */
  random?: () => number;
  /** The saved World Bank / IMF history for a country, with the revisions between downloads. */
  loadOfficialHistory?: (iso3: string) => OfficialHistoryFile | null;
  /** Where results are kept; defaults to quests/resolutions.jsonl. */
  resolutionsFile?: string;
  /** Today's date (YYYY-MM-DD); the clock by default. For tests. */
  today?: () => string;
}

/** An entry's score from a recorded result (the record wins over today's feeds). */
export function scoreFromRecord(entry: QuestEntry, lines: ResolutionLine[]): EntryScore | null {
  const st = resultState(lines, entry.questId, entry.questVersion);
  if (st.state === 'none') return null;
  if (st.state === 'withdrawn') return { status: 'unresolvable', note: `Withdrawn: ${st.line.reason || 'no reason given'}` };
  if (st.state === 'unresolvable') return { status: 'unresolvable', note: st.decision?.decision === 'unresolvable' ? `Unresolvable after a dispute: ${st.decision.reason || ''}`.trim() : st.line.reason || 'Unresolvable' };
  const o = st.line.outcome;
  const readings = (st.line.readings || []).map((r) => ({ date: r.date, value: r.value }));
  const via = st.line.via || 'rule';
  const a = entry.answer as { probability?: number; level?: number };
  if (!o) return null;
  if (o.answer === 'level') return typeof a.level === 'number' ? { status: 'settled', via, readings, ...scoreLevel(a.level, o.value, o.noChange) } : null;
  return typeof a.probability === 'number' ? { status: 'settled', via, readings, ...scoreProbability(a.probability, o.happened, o.baseRate) } : null;
}

const PRACTICE_TTL_MS = 60 * 60 * 1000;
const PRACTICE_MAX = 2000;

/** World series (Brent, WTI) are in every country's set; read them from this one. */
const WORLD_SET = 'USA';
const FEED_DOWN = 'The feed did not answer';

function summary(q: Quest, approved: boolean, today: string) {
  return {
    id: q.id,
    version: q.version,
    type: q.type,
    title: q.title,
    countries: q.countries,
    topics: q.topics,
    region: q.region,
    approved,
    tutorial: Boolean(q.tutorial),
    status: questStatus(q, today),
    horizon: questHorizon(q),
    horizonLabel: HORIZON_LABEL[questHorizon(q)],
    opensOn: q.opensOn,
    closesOn: q.closesOn,
    settlesOn: questSettlesOn(q),
  };
}

export function registerQuestRoutes(app: express.Express, deps: QuestDeps): void {
  const enabled = deps.enabled ?? (() => questsEnabled(process.env.QUESTS_ENABLED));
  const dir = deps.dir ?? QUESTS_DIR;
  const off = (res: express.Response) => res.json({ enabled: false, reason: QUESTS_OFF_REASON });
  const todayIso = deps.today ?? (() => new Date().toISOString().slice(0, 10));
  const resultsFile = deps.resolutionsFile ?? resolutionsPath(dir);

  app.get('/api/quests', (_req, res) => {
    if (!enabled()) return off(res);
    const today = todayIso();
    const quests = loadQuests(dir).map((x) => summary(x.quest, x.approved, today));
    res.json({ enabled: true, quests });
  });

  const entryFile = deps.entryFile ?? entryFilePath(DATA_DIR);
  const authorOf = (res: express.Response) => {
    const who = deps.signedIn?.(res);
    return who ? `${who.displayName} (${who.username})` : 'local user';
  };
  /** Daily or weekly points for a series, or why there are none. */
  const pointsFor = async (ref: QuestSeriesRefLike): Promise<Point[] | { reason: string }> => {
    try {
      const set = await deps.seriesFor(ref.country === 'WLD' ? WORLD_SET : ref.country);
      const s = set.series.find((x) => x.id === ref.series);
      if (!s || !s.points.length) return { reason: set.missing.find((m) => m.id === ref.series)?.reason || 'No published values' };
      return s.points.map((p) => ({ date: p.date, value: p.value }));
    } catch {
      return { reason: FEED_DOWN };
    }
  };
  const forecastById = (id: string) => {
    const found = loadQuests(dir).find((x) => x.quest.id === id);
    return found && found.quest.type === 'forecast' ? { quest: found.quest as ForecastQuest, hash: found.hash } : null;
  };
  const scoreAll = async (entries: QuestEntry[], today: string) => {
    const quests = new Map(loadQuests(dir).filter((x) => x.quest.type === 'forecast').map((x) => [x.quest.id, x.quest as ForecastQuest]));
    const recorded = loadResolutions(resultsFile).lines;
    const cache = new Map<string, Promise<Point[] | { reason: string }>>();
    const get = (ref: QuestSeriesRefLike) => {
      const k = `${ref.country}|${ref.series}`;
      if (!cache.has(k)) cache.set(k, pointsFor(ref));
      return cache.get(k)!;
    };
    return Promise.all(
      entries.map(async (entry) => {
        const quest = quests.get(entry.questId);
        if (!quest) return { entry, title: entry.questId, score: { status: 'unresolvable' as const, note: 'The Quest is no longer on file' } as EntryScore };
        const fromRecord = scoreFromRecord(entry, recorded);
        if (fromRecord) return { entry, title: quest.title, score: fromRecord, recorded: true };
        const pts = new Map<string, Point[] | { reason: string }>();
        for (const r of [quest.rule, ...(quest.fallback !== 'unresolvable' ? [quest.fallback.rule] : [])]) pts.set(`${r.ref.country}|${r.ref.series}`, await get(r.ref));
        const score = scoreEntry(entry, quest, (rule) => pts.get(`${rule.ref.country}|${rule.ref.series}`) ?? { reason: 'No series' }, today);
        return { entry, title: quest.title, score };
      }),
    );
  };

  app.get('/api/quests/private', async (req, res) => {
    if (!enabled()) return off(res);
    const today = todayIso();
    const { entries, badLines } = loadEntries(entryFile);
    const me = authorOf(res);
    const mine = entries.filter((x) => x.entry.author === me);
    const scored = await scoreAll(mine.map((x) => x.entry), today);
    const counted = new Set(
      [...new Set(mine.map((x) => x.entry.questId))].flatMap((qid) => {
        const q = forecastById(qid)?.quest;
        return q ? countedEntries(mine.map((x) => x.entry), q).map((e) => e.id) : [];
      }),
    );
    res.json({
      enabled: true,
      author: me,
      file: 'data/local/quest-entries.jsonl',
      badLines,
      entries: scored.map((x, i) => ({ ...x, hashOk: mine[i].hashOk, counted: counted.has(x.entry.id) })).reverse(),
    });
  });

  app.get('/api/quests/class/:code', async (req, res) => {
    if (!enabled()) return off(res);
    const code = String(req.params.code || '');
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(code)) return res.status(400).json({ enabled: true, error: 'Class code: letters, digits, - or _, up to 40' });
    const today = todayIso();
    const all = loadEntries(entryFile).entries.map((x) => x.entry).filter((e) => e.group === code);
    const counted = [...new Set(all.map((e) => e.questId))].flatMap((qid) => {
      const q = forecastById(qid)?.quest;
      return q ? countedEntries(all, q) : [];
    });
    const scored = await scoreAll(counted, today);
    res.json({ enabled: true, code, rows: classTable(scored), note: 'Private to this server. Skill is against the base rate (probabilities) or no change (numbers); positive is better.' });
  });

  /** What the resolver reads for one series: daily/weekly points, or the annual run with its revisions. */
  const seriesData = async (ref: QuestSeriesRefLike): Promise<SeriesData> => {
    if (questSeriesDef(ref.series)?.freq === 'annual') {
      const file = deps.loadOfficialHistory?.(ref.country) ?? null;
      if (!file) return { kind: 'missing', reason: 'Full World Bank / IMF history not downloaded yet' };
      const run = file.series?.[ref.series];
      if (!run?.points?.length) return { kind: 'missing', reason: file.failed?.[ref.series] || 'The source publishes no figures for this country' };
      return { kind: 'annual', points: run.points.map((p) => ({ date: p.date, value: p.value })), revisions: file.revisions?.[ref.series], pulledAt: file.pulledAt };
    }
    const pts = await pointsFor(ref);
    return 'reason' in pts ? { kind: 'missing', reason: pts.reason, ...(pts.reason === FEED_DOWN ? { retry: true } : {}) } : { kind: 'points', points: pts };
  };

  app.get('/api/quests/results', (_req, res) => {
    if (!enabled()) return off(res);
    const rec = loadResolutions(resultsFile);
    const titles = new Map(loadQuests(dir).map((x) => [x.quest.id, x.quest.title]));
    const keys = [...new Map(rec.lines.map((l) => [`${l.questId}@${l.questVersion}`, l])).values()];
    res.json({
      enabled: true,
      file: 'quests/resolutions.jsonl',
      chain: rec.brokenAt === -1 ? 'holds' : `broken at line ${rec.brokenAt + 1}`,
      badLines: rec.badLines,
      lines: rec.lines,
      quests: keys.map((l) => ({ questId: l.questId, questVersion: l.questVersion, title: titles.get(l.questId) ?? l.questId, ...resultState(rec.lines, l.questId, l.questVersion) })),
    });
  });

  app.get('/api/quests/due', async (req, res) => {
    if (!enabled()) return off(res);
    const today = todayIso();
    const withDrafts = req.query.drafts === '1';
    const lines = loadResolutions(resultsFile).lines;
    const due = loadQuests(dir).filter((x) => x.quest.type === 'forecast' && (x.approved || withDrafts) && questSettlesOn(x.quest) <= today && resultState(lines, x.quest.id, x.quest.version).state === 'none');
    const at = new Date().toISOString();
    const out = await Promise.all(
      due.map(async (x) => {
        const q = x.quest as ForecastQuest;
        const data = new Map<string, SeriesData>();
        for (const ref of questSeriesRefs(q)) data.set(`${ref.country}|${ref.series}`, await seriesData(ref));
        const draft = resolveForecast(q, x.hash, (ref) => data.get(`${ref.country}|${ref.series}`) ?? { kind: 'missing', reason: 'No series' }, at, 'resolver');
        return { questId: q.id, title: q.title, approved: x.approved, settlesOn: questSettlesOn(q), result: draft, waiting: draft ? undefined : 'The value is not published yet; try again later' };
      }),
    );
    res.json({ enabled: true, today, due: out });
  });

  const practice = new Map<string, { at: number; questId: string; op: 'higher' | 'lower'; start: Point; endDate: string; days: number; points: Point[] }>();
  app.post('/api/quests/practice/:token', (req, res) => {
    if (!enabled()) return off(res);
    const p = practice.get(String(req.params.token));
    if (!p || Date.now() - p.at > PRACTICE_TTL_MS) return res.status(404).json({ enabled: true, error: 'This practice question has expired; ask for a new one' });
    const probability = Number(req.body?.probability);
    if (!(probability >= 0 && probability <= 1)) return res.status(400).json({ enabled: true, error: 'A probability from 0 to 1' });
    practice.delete(String(req.params.token));
    const r = scorePractice(p.op, probability, p.start, p.endDate, p.days, p.points);
    if ('reason' in r) return res.json({ enabled: true, error: r.reason });
    res.json({ enabled: true, start: p.start, end: r.end, ...r.score, note: 'Practice only: not saved, never on any table.' });
  });

  app.get('/api/quests/:id/practice', async (req, res) => {
    if (!enabled()) return off(res);
    const found = forecastById(req.params.id);
    if (!found) return res.status(404).json({ enabled: true, error: 'No forecast Quest with that id' });
    const q = found.quest;
    const today = todayIso();
    const pts = await pointsFor(q.rule.ref);
    if ('reason' in pts) return res.json({ enabled: true, error: pts.reason });
    const w = practiceWindow(q.rule, q.closesOn, pts, today, deps.random ?? Math.random);
    if ('reason' in w) return res.json({ enabled: true, error: w.reason });
    for (const [k, v] of practice) if (Date.now() - v.at > PRACTICE_TTL_MS) practice.delete(k);
    if (practice.size >= PRACTICE_MAX) practice.delete(practice.keys().next().value as string);
    const token = crypto.randomBytes(12).toString('hex');
    const op = q.rule.kind === 'direction' ? q.rule.op : 'higher';
    practice.set(token, { at: Date.now(), questId: q.id, op, start: w.start, endDate: w.endDate, days: w.days, points: pts });
    const def = questSeriesDef(q.rule.ref.series);
    res.json({
      enabled: true,
      token,
      question: `On ${w.start.date}, ${def?.label ?? q.rule.ref.series}${q.rule.ref.country === 'WLD' ? '' : ` (${q.rule.ref.country})`} was ${w.start.value} ${def?.unit ?? ''}. What was the probability it would be ${op} on the first value published on or after ${w.endDate}?`,
      start: w.start,
      endDate: w.endDate,
    });
  });

  app.post('/api/quests/:id/private', (req, res) => {
    if (!enabled()) return off(res);
    if (deps.refuseRemoteChange?.(req, res)) return;
    const found = forecastById(req.params.id);
    if (!found) return res.status(404).json({ enabled: true, error: 'Only forecast Quests take entries' });
    const today = todayIso();
    const body = (req.body || {}) as Partial<QuestEntryInput>;
    const input: Partial<QuestEntryInput> = {
      answer: body.answer,
      ...(typeof body.rationale === 'string' && body.rationale.trim() ? { rationale: body.rationale.trim() } : {}),
      ...(typeof body.group === 'string' && body.group.trim() ? { group: body.group.trim() } : {}),
    };
    const problems = entryProblems(input, found.quest, today);
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    const a = input.answer as { probability?: number; level?: number };
    const entry = appendEntry(entryFile, {
      id: crypto.randomUUID(),
      questId: found.quest.id,
      questVersion: found.quest.version,
      questHash: found.hash,
      author: authorOf(res),
      loggedAt: new Date().toISOString(),
      answer: found.quest.rule.kind === 'level' ? { level: Number(a.level) } : { probability: Number(a.probability) },
      ...(input.rationale ? { rationale: input.rationale } : {}),
      ...(input.group ? { group: input.group } : {}),
    });
    res.json({ enabled: true, entry });
  });

  app.get('/api/quests/:id', async (req, res) => {
    if (!enabled()) return off(res);
    const today = todayIso();
    const found = loadQuests(dir).find((x) => x.quest.id === req.params.id);
    if (!found) return res.status(404).json({ enabled: true, error: 'No Quest with that id' });
    const q = found.quest;
    const figures = await Promise.all(
      questSeriesRefs(q).map(async (ref) => {
        const def = questSeriesDef(ref.series);
        const label = `${def?.label ?? ref.series}${ref.country === 'WLD' ? '' : ` (${ref.country})`}`;
        try {
          const set = await deps.seriesFor(ref.country === 'WLD' ? WORLD_SET : ref.country);
          const s = set.series.find((x) => x.id === ref.series);
          if (!s || !s.points.length) {
            const why = set.missing.find((m) => m.id === ref.series)?.reason;
            return { ...ref, label, missing: why || 'No published value yet' };
          }
          const last = s.points[s.points.length - 1];
          return { ...ref, label, value: last.value, date: last.date, unit: s.unit, source: s.source, freq: s.freq };
        } catch {
          return { ...ref, label, missing: 'The feed did not answer' };
        }
      }),
    );
    res.json({
      enabled: true,
      quest: q,
      summary: summary(q, found.approved, today),
      file: found.file,
      rule: q.type === 'forecast' ? describeRule(q.rule) : undefined,
      fallback: q.type === 'forecast' ? (q.fallback === 'unresolvable' ? 'If the series has no value, the Quest is Unresolvable.' : `If the series has no value: ${describeRule(q.fallback.rule)}`) : undefined,
      figures,
      result: resultState(loadResolutions(resultsFile).lines, q.id, q.version),
    });
  });
}
