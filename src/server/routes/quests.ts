/**
 * Quests (src/utils/quests.ts): read-only routes for Menu > Quests. Off unless QUESTS_ENABLED=on
 * (docs/QUESTS.md); while off, every route answers { enabled: false } and nothing else.
 *
 *   GET /api/quests        every valid Quest (approved first, then drafts) with status and horizon
 *   GET /api/quests/:id    one Quest, its rule in words, and the latest value of each series it
 *                          reads, from the same feeds as Country Research > History & data
 */
import type express from 'express';
import path from 'path';
import { APP_ROOT } from '../config';
import type { SeriesSet } from '../../utils/seriesHistory';
import { questHorizon, questSeriesRefs, questSettlesOn, questStatus, questsEnabled, QUESTS_OFF_REASON, HORIZON_LABEL, type Quest } from '../../utils/quests';
import { describeRule } from '../../utils/questRules';
import { questSeriesDef } from '../../utils/questSeries';
import { loadQuests } from '../../utils/questStore';

export const QUESTS_DIR = path.join(APP_ROOT, 'quests');

export interface QuestDeps {
  seriesFor: (iso3: string) => Promise<SeriesSet>;
  /** Defaults to process.env.QUESTS_ENABLED. */
  enabled?: () => boolean;
  dir?: string;
}

/** World series (Brent, WTI) are in every country's set; read them from this one. */
const WORLD_SET = 'USA';

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

  app.get('/api/quests', (_req, res) => {
    if (!enabled()) return off(res);
    const today = new Date().toISOString().slice(0, 10);
    const quests = loadQuests(dir).map((x) => summary(x.quest, x.approved, today));
    res.json({ enabled: true, quests });
  });

  app.get('/api/quests/:id', async (req, res) => {
    if (!enabled()) return off(res);
    const today = new Date().toISOString().slice(0, 10);
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
    });
  });
}
