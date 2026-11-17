/**
 * Scenario API (console integration item 9). A token with the run:scenarios scope sends a portfolio
 * and a scenario; the reply gives the hypothetical result per position. The portfolio is not saved.
 *
 *   GET  /api/v1/scenarios   the historical episodes, what the saved series cover, and the request shape
 *   POST /api/v1/scenarios   { portfolio: [ positions as in /api/v1/holdings ], scenario: { kind, ... } }
 *
 * Replays read only the series the daily download saved (scripts/replays-pull.ts and the ECB
 * reference rates); nothing is fetched when the address is called. Positions naming a hidden
 * country or security are left out and counted. Each run is in the audit log as counts.
 */
import type express from 'express';
import { appendAudit } from '../../utils/auditStore';
import { AUDIT_FILES } from '../config';
import { iso3FromCode } from '../../data/iso3166Alpha2';
import { parseApiHoldings } from '../../utils/holdingsApi';
import { EPISODES, parseScenarioRequest, replayCoverage, runScenario, SCENARIO_NOTE, type ReplayFile } from '../../utils/scenarioReplay';
import { shareableSource } from '../../utils/consoleEvents';
import type { Holding } from '../../utils/holdings';

export interface ConsoleScenarioDeps {
  replayFile: () => ReplayFile | null;
  /** Monthly averages of the ECB daily rate, `ccy` per US dollar, from the saved file. */
  ecbMonthly: (ccy: string) => Record<string, number> | null;
  /** The first month the saved ECB rates cover, or null when none are saved. */
  ecbFirstMonth: () => string | null;
  hidden?: (h: Holding) => boolean;
}

export function registerConsoleScenarioRoutes(app: express.Express, deps: ConsoleScenarioDeps): void {
  app.get('/api/v1/scenarios', (_req, res) => {
    const file = deps.replayFile();
    res.json({
      hypothetical: true,
      note: SCENARIO_NOTE,
      replay_series_saved_at: file?.savedAt ?? null,
      episodes: replayCoverage(file, deps.ecbFirstMonth()),
      kinds: {
        shock: { em_fx_pct: '% move of every emerging-market currency against the US dollar (negative = weaker)', us_rates_bp: 'US rates move, bp', countries: '{ "TUR": { "fx_pct": -20, "spread_bp": 300, "local_yield_bp": 500 } } for a fiscal shock' },
        replay: { episode: EPISODES.map((e) => e.id) },
      },
    });
  });

  app.post('/api/v1/scenarios', (req, res) => {
    const body = (req.body ?? {}) as { portfolio?: unknown };
    const parsed = parseApiHoldings(body.portfolio);
    const sc = parseScenarioRequest(req.body, iso3FromCode);
    const errors = [...parsed.errors, ...sc.errors];
    if (errors.length || !sc.request) return res.status(400).json({ error: 'BAD_SCENARIO', message: 'Nothing was run.', errors: errors.slice(0, 100) });
    const all = parsed.holdings.map((h, i): Holding => ({ ...h, id: `p${i + 1}` }));
    const shown = deps.hidden ? all.filter((h) => !deps.hidden!(h)) : all;
    const result = runScenario(shown, sc.request, { file: deps.replayFile(), ecbMonthly: deps.ecbMonthly, shareable: shareableSource });
    const t = res.locals.apiToken as { name?: string } | undefined;
    const label = sc.request.kind === 'replay' ? `replay ${sc.request.episode.id}` : 'shock';
    appendAudit(AUDIT_FILES, {
      kind: 'api',
      summary: `${t?.name ? `API token "${t.name}"` : 'A caller'} ran a scenario (${label}) on ${shown.length} position${shown.length === 1 ? '' : 's'}: ${result.totals.complete} complete, ${result.totals.partial} with a missing move`,
      detail: { kind: sc.request.kind, positions: shown.length, complete: result.totals.complete, hidden: all.length - shown.length },
    });
    res.json({ ...result, hidden: all.length - shown.length });
  });
}
