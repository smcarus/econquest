import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';
import type { CouncilAssessmentRun, LiveWatchlistItem } from '../types/council';
import { HIDDEN_GROUPS, READY_BY_ID, READY_TOOLS, type ReadyTool, type ToolTarget } from '../data/toolsCatalog';
import { getSnapshotDataStatus } from '../utils/dataStatus';
import { DSA_INPUTS } from '../utils/officialNote';
import { DataConnectionsPanel } from './DataConnectionsPanel';

/**
 * Tools: the analysis tools that run on live and official data, with how much of your watchlist
 * (or the open country) each can cover right now, then the older desks kept hidden because they
 * compute from built-in example figures, each with the data it would need.
 */

interface Status {
  ok: boolean;
  text: string;
}

function toolStatus(tool: ReadyTool, items: LiveWatchlistItem[], run: CouncilAssessmentRun): Status | undefined {
  const n = items.length;
  const count = (f: (i: LiveWatchlistItem) => unknown) => items.filter((i) => f(i) !== undefined).length;
  const status = getSnapshotDataStatus(run.openData);
  switch (tool.id) {
    case 'marketedge': {
      const y = count((i) => i.yield10YPct);
      const c = count((i) => i.cds5YBps);
      return { ok: y > 0 || c > 0, text: `${y} of ${n} with an official yield, ${c} of ${n} with your CDS` };
    }
    case 'divergences':
    case 'ask_council': {
      const live = items.filter((i) => i.yield10YPct !== undefined || i.cpiInflationPct !== undefined || i.reerGapPct !== undefined).length;
      return { ok: live > 0, text: live ? `Live figures for ${live} of ${n} countries` : 'No live figures yet: press Refresh now on Country Research' };
    }
    case 'scenarios':
      return { ok: true, text: 'Runs on the World Bank and WITS trade data on file' };
    case 'economist_brief':
      return status.isFeedLive('imf')
        ? { ok: true, text: `IMF figures live for ${run.countryName}` }
        : { ok: false, text: `IMF did not answer for ${run.countryName}: figures read Missing` };
    case 'issuer_brief':
      return run.openData.debtSchedule?.qeds
        ? { ok: true, text: `QEDS repayments live for ${run.countryName}` }
        : { ok: false, text: `QEDS did not answer for ${run.countryName}: repayments read Missing` };
    case 'sustainability': {
      const missing = DSA_INPUTS.filter((p) => !status.isLive(p)).length;
      return missing
        ? { ok: false, text: `${missing} of ${DSA_INPUTS.length} inputs missing for ${run.countryName}: no projection yet` }
        : { ok: true, text: `All inputs live for ${run.countryName}` };
    }
    default:
      return undefined;
  }
}

const StatusLine: React.FC<{ s: Status }> = ({ s }) => (
  <p className={`mt-2 flex items-center gap-1.5 text-xs ${s.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
    {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <CircleDashed className="w-3.5 h-3.5 shrink-0" />}
    {s.text}
  </p>
);

export const ToolsPage: React.FC<{
  run: CouncilAssessmentRun;
  items: LiveWatchlistItem[];
  watchlistName: string;
  onOpen: (target: ToolTarget) => void;
}> = ({ run, items, watchlistName, onOpen }) => {
  const statuses = useMemo(() => Object.fromEntries(READY_TOOLS.map((t) => [t.id, toolStatus(t, items, run)])), [items, run]);
  const hiddenCount = HIDDEN_GROUPS.reduce((a, g) => a + g.desks.length, 0);

  return (
    <div className="space-y-4" data-no-stat-ref="true" data-no-provenance-overlay="true">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Tools</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every tool here runs on live feeds, official series or your own files. A figure without a source reads Missing, with what would fill it.
          Status is for {watchlistName} and the open country, {run.countryName}.
        </p>
      </div>

      <DataConnectionsPanel />

      <section aria-labelledby="ready-tools">
        <h2 id="ready-tools" className="ui-section-title mb-2">
          Ready ({READY_TOOLS.length})
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" data-ready-tools="true">
          {READY_TOOLS.map((t) => {
            const s = statuses[t.id];
            return (
              <li key={t.id} className="ui-panel p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</h3>
                  <button
                    type="button"
                    onClick={() => onOpen(t.target)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
                  >
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300 flex-1">{t.what}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Sources: {t.sources}</p>
                {s && <StatusLine s={s} />}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="hidden-tools" className="ui-panel">
        <header className="ui-panel-header">
          <h2 id="hidden-tools" className="ui-section-title">
            Hidden until they have live inputs ({hiddenCount})
          </h2>
          <p className="ui-label">
            The older desks compute from built-in example figures, so they are not shown. Each comes back once the data it needs is connected. Where a ready
            tool answers the same question, it is linked.
          </p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 p-4" data-hidden-desks="true">
          {HIDDEN_GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{g.title}</h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {g.desks.map((d) => {
                  const cover = d.coveredBy ? READY_BY_ID[d.coveredBy] : undefined;
                  return (
                    <li key={d.id} className="py-1.5 text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-slate-800 dark:text-slate-200">{d.label}</span>
                        {cover && (
                          <button
                            type="button"
                            onClick={() => onOpen(cover.target)}
                            className="text-xs text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
                          >
                            Use {cover.title}
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{d.needs.startsWith('Covered') ? d.needs : `Needs: ${d.needs}`}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
