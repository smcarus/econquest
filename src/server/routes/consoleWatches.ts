/**
 * Indicator watches for outside systems (console integration item 5). A watch is a threshold you
 * set on one figure for one country (or every watchlist country). None is built in. Watches are
 * checked each time the watchlist is rebuilt from saved data, which happens after every daily
 * download; one that is crossed sends a threshold_crossed event (stream and webhooks).
 *
 * They are the same rules as Menu > Watch alerts in the app, saved in data/local/watch-rules.json.
 * A token sees and removes only the watches it made. Needs read:events.
 *
 *   GET    /api/v1/watches        your watches, their last check, and the figures a watch can use
 *   POST   /api/v1/watches        add one: { country, metric, op, value, note? }
 *   DELETE /api/v1/watches/:id    remove one
 */
import type express from 'express';
import { randomBytes } from 'crypto';
import { appendAudit } from '../../utils/auditStore';
import { AUDIT_FILES } from '../config';
import { MAX_RULES, WATCH_METRICS, parseRule, ruleText, type WatchMetric } from '../../utils/watchRules';
import { loadWatchRules, saveWatchRules } from '../../utils/watchRulesStore';
import { iso3FromCode } from '../../data/iso3166Alpha2';
import { WATCH_SOURCE, type WatchStates } from '../eventSources';
import { shareableSource } from '../../utils/consoleEvents';

export interface ConsoleWatchDeps {
  rulesFile: string;
  readStates: () => WatchStates | null;
}

const ownerOf = (res: express.Response): string => (res.locals.apiToken as { id?: string } | undefined)?.id ?? 'app';

/** The figures a watch can use, with their unit and source, for the console's form. */
export const WATCH_METRIC_LIST = (Object.keys(WATCH_METRICS) as WatchMetric[]).map((id) => ({
  id,
  label: WATCH_METRICS[id].label,
  unit: WATCH_METRICS[id].unit,
  source: WATCH_SOURCE[id],
  shareable: shareableSource(WATCH_SOURCE[id]),
}));

export function registerConsoleWatchRoutes(app: express.Express, deps: ConsoleWatchDeps): void {
  const view = (res: express.Response) => {
    const states = deps.readStates() ?? {};
    return loadWatchRules(deps.rulesFile)
      .filter((r) => (r.owner ?? 'app') === ownerOf(res))
      .map((r) => ({
        id: r.id,
        country: r.iso3,
        metric: r.metric,
        op: r.op,
        value: r.value,
        ...(r.note ? { note: r.note } : {}),
        created_at: r.createdAt,
        text: ruleText(r),
        source: WATCH_SOURCE[r.metric],
        shareable: shareableSource(WATCH_SOURCE[r.metric]),
        last_check: Object.entries(states)
          .filter(([k]) => k.startsWith(`${r.id}:`))
          .map(([k, s]) => ({ iso3: k.slice(r.id.length + 1), crossed: s.crossed, value: s.value, as_of: s.asOf, checked_at: s.checkedAt })),
      }));
  };

  app.get('/api/v1/watches', (_req, res) => {
    res.json({ watches: view(res), metrics: WATCH_METRIC_LIST, max: MAX_RULES });
  });

  app.post('/api/v1/watches', (req, res) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const raw = typeof b.country === 'string' ? b.country.trim() : typeof b.iso3 === 'string' ? b.iso3.trim() : '';
    const iso3 = raw === '*' ? '*' : iso3FromCode(raw);
    if (!iso3) return res.status(400).json({ error: 'BAD_WATCH', message: 'Send country as an ISO alpha-2 or alpha-3 code, or "*" for every watchlist country.' });
    if (typeof b.metric !== 'string' || !(b.metric in WATCH_METRICS)) return res.status(400).json({ error: 'BAD_WATCH', message: `Unknown metric. Metrics: ${Object.keys(WATCH_METRICS).join(', ')}.` });
    if (b.op !== '>=' && b.op !== '<=') return res.status(400).json({ error: 'BAD_WATCH', message: 'op must be ">=" or "<=".' });
    const value = typeof b.value === 'string' && b.value.trim() ? Number(b.value) : b.value;
    if (typeof value !== 'number' || !Number.isFinite(value)) return res.status(400).json({ error: 'BAD_WATCH', message: 'value must be a number: the threshold you choose.' });
    const rules = loadWatchRules(deps.rulesFile);
    if (rules.length >= MAX_RULES) return res.status(400).json({ error: 'BAD_WATCH', message: `There are already ${MAX_RULES} watches and alerts. Remove one first.` });
    const rule = parseRule({ id: `w_${randomBytes(5).toString('hex')}`, iso3, metric: b.metric, op: b.op, value, note: b.note, owner: ownerOf(res), createdAt: new Date().toISOString() });
    if (!rule) return res.status(400).json({ error: 'BAD_WATCH', message: 'The watch could not be read.' });
    saveWatchRules(deps.rulesFile, [...rules, rule]);
    appendAudit(AUDIT_FILES, { kind: 'api', summary: `Added the watch "${ruleText(rule)}"`, detail: { watch: rule.id } });
    res.status(201).json({ watch: view(res).find((w) => w.id === rule.id), note: 'Checked after each daily download; a crossing sends a threshold_crossed event.' });
  });

  app.delete('/api/v1/watches/:id', (req, res) => {
    const rules = loadWatchRules(deps.rulesFile);
    const r = rules.find((x) => x.id === String(req.params.id) && (x.owner ?? 'app') === ownerOf(res));
    if (!r) return res.status(404).json({ error: 'NO_WATCH', message: 'No watch of yours with that id.' });
    saveWatchRules(deps.rulesFile, rules.filter((x) => x !== r));
    appendAudit(AUDIT_FILES, { kind: 'api', summary: `Removed the watch "${ruleText(r)}"`, detail: { watch: r.id } });
    res.json({ ok: true });
  });
}
