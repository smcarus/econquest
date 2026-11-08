import { CDS_HIDDEN } from '../utils/cdsHidden';
import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, CircleDashed } from 'lucide-react';
import type { CouncilAssessmentRun, LiveWatchlistItem } from '../types/council';
import { HIDDEN_GROUPS, READY_BY_ID, READY_TOOLS, TOOL_CATEGORIES, type ReadyTool, type ToolTarget } from '../data/toolsCatalog';
import { getSnapshotDataStatus } from '../utils/dataStatus';
import { DSA_INPUTS } from '../utils/officialNote';
import { DataConnectionsPanel } from './DataConnectionsPanel';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS, type ToolsT } from '../i18n/messages/tools';


/**
 * Tools: the analysis tools that run on live and official data, in drill-down groups by what you want to do,
 * with how much of your watchlist (or the open country) each can cover right now. Under Set up:
 * the data connection check (collapsed to its summary) and the older desks kept hidden because
 * they compute from built-in example figures, each with the data it would need.
 */

interface Status {
  ok: boolean;
  text: string;
}

function toolStatus(tool: ReadyTool, items: LiveWatchlistItem[], run: CouncilAssessmentRun, t: ToolsT): Status | undefined {
  const country = run.countryName;
  const n = items.length;
  const count = (f: (i: LiveWatchlistItem) => unknown) => items.filter((i) => f(i) !== undefined).length;
  const status = getSnapshotDataStatus(run.openData);
  switch (tool.id) {
    case 'marketedge': {
      const y = count((i) => i.yield10YPct);
      const c = count((i) => i.cds5YBps);
      return { ok: y > 0 || c > 0, text: CDS_HIDDEN ? t('tl_s_yield', { y, n }) : t('tl_s_yieldCds', { y, n, c }) };
    }
    case 'divergences':
    case 'ask_council': {
      const live = items.filter((i) => i.yield10YPct !== undefined || i.cpiInflationPct !== undefined || i.reerGapPct !== undefined).length;
      return { ok: live > 0, text: live ? t('tl_s_live', { live, n }) : t('tl_s_noLive') };
    }
    case 'scenarios':
      return { ok: true, text: t('tl_s_trade') };
    case 'economist_brief':
      return status.isFeedLive('imf')
        ? { ok: true, text: t('tl_s_imfLive', { country }) }
        : { ok: false, text: t('tl_s_imfDown', { country }) };
    case 'issuer_brief':
      return run.openData.debtSchedule?.qeds
        ? { ok: true, text: t('tl_s_qedsLive', { country }) }
        : { ok: false, text: t('tl_s_qedsDown', { country }) };
    case 'sustainability': {
      const missing = DSA_INPUTS.filter((p) => !status.isLive(p)).length;
      return missing
        ? { ok: false, text: t('tl_s_dsaMissing', { m: missing, n: DSA_INPUTS.length, country }) }
        : { ok: true, text: t('tl_s_dsaLive', { country }) };
    }
    default:
      return undefined;
  }
}

const StatusLine: React.FC<{ s: Status }> = ({ s }) => (
  <p className={`mt-1 flex items-start gap-1.5 text-xs ${s.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
    {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden /> : <CircleDashed className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />}
    {s.text}
  </p>
);

/** Which groups you left open, kept per browser only as a convenience. */
const OPEN_KEY = 'econquest.toolsOpenGroups.v1';
function loadOpenGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function saveOpenGroups(ids: Set<string>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage blocked: groups just start closed next time */
  }
}

const ToolRow: React.FC<{ t: ReadyTool; s?: Status; showSources: boolean; onOpen: (target: ToolTarget) => void }> = ({ t, s, showSources, onOpen }) => {
  const tt = useT(TOOLS);
  const tx = useTx();
  return (
  <li className="py-2.5" data-tool={t.id}>
    <button
      type="button"
      onClick={() => onOpen(t.target)}
      className="group inline-flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-300 text-left"
    >
      {tx(t.title)}
      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-300" aria-hidden />
    </button>
    <p className="text-sm text-slate-600 dark:text-slate-300">{tx(t.what)}</p>
    {showSources && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tt('tl_sources', { sources: tx(t.sources) })}</p>}
    {s && <StatusLine s={s} />}
  </li>
  );
};

export const ToolsPage: React.FC<{
  run: CouncilAssessmentRun;
  items: LiveWatchlistItem[];
  watchlistName: string;
  onOpen: (target: ToolTarget) => void;
  /** Drawn inside the Settings window, which already carries the title. */
  inDialog?: boolean;
}> = ({ run, items, watchlistName, onOpen, inDialog = false }) => {
  const t = useT(TOOLS);
  const tx = useTx();
  const statuses = useMemo(() => Object.fromEntries(READY_TOOLS.map((tool) => [tool.id, toolStatus(tool, items, run, t)])), [items, run, t]);
  const hiddenCount = HIDDEN_GROUPS.reduce((a, g) => a + g.desks.length, 0);
  const [showSources, setShowSources] = useState(false);
  const [open, setOpen] = useState<Set<string>>(loadOpenGroups);
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveOpenGroups(next);
      return next;
    });
  const allOpen = TOOL_CATEGORIES.every((c) => open.has(c.id));
  const setAll = (on: boolean) => {
    const next = new Set<string>(on ? TOOL_CATEGORIES.map((c) => c.id) : []);
    saveOpenGroups(next);
    setOpen(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          {inDialog ? (
            <h3 className="ui-section-title">{t('tl_title')}</h3>
          ) : (
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('tl_title')}</h1>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('tl_intro', { watchlist: watchlistName, country: run.countryName })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="ui-pill" onClick={() => setAll(!allOpen)} data-toggle-all-groups="true">
            {allOpen ? t('tl_closeAll') : t('tl_openAll')}
          </button>
          <button type="button" className="ui-pill" aria-pressed={showSources} onClick={() => setShowSources((v) => !v)} data-show-sources="true">
            {showSources ? t('tl_hideSources') : t('tl_showSources')}
          </button>
        </div>
      </div>

      <div className="ui-panel divide-y divide-slate-200 dark:divide-slate-800" data-ready-tools="true">
        {TOOL_CATEGORIES.map((c) => {
          const tools = READY_TOOLS.filter((tool) => tool.category === c.id);
          const isOpen = open.has(c.id);
          return (
            <section key={c.id} aria-labelledby={`tools-${c.id}`} data-tool-category={c.id}>
              <button
                type="button"
                id={`tools-${c.id}`}
                aria-expanded={isOpen}
                aria-controls={`tools-${c.id}-list`}
                onClick={() => toggle(c.id)}
                className="w-full flex items-start gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <ChevronRight
                  className={`w-4 h-4 mt-0.5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-slate-900 dark:text-white">{tx(c.title)}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{tx(c.purpose)}</span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap mt-1">
                  {t('tl_count', { n: tools.length })}
                </span>
              </button>
              {isOpen && (
                <ul id={`tools-${c.id}-list`} className="pl-10 pr-4 pb-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {tools.map((tool) => (
                    <ToolRow key={tool.id} t={tool} s={statuses[tool.id]} showSources={showSources} onOpen={onOpen} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section aria-labelledby="tools-setup" className="space-y-3">
        <div>
          <h2 id="tools-setup" className="text-base font-semibold text-slate-900 dark:text-white">
            {t('tl_setup')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('tl_setupIntro')}</p>
        </div>
        <DataConnectionsPanel startCollapsed />

        <details className="ui-panel" data-hidden-desks="true">
          <summary className="ui-panel-header cursor-pointer">
            <span className="ui-section-title">{t('tl_hidden', { n: hiddenCount })}</span>
            <span className="ui-label block">
              {t('tl_hiddenIntro')}
            </span>
          </summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 p-4">
            {HIDDEN_GROUPS.map((g) => (
              <div key={g.title}>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{tx(g.title)}</h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {g.desks.map((d) => {
                    const cover = d.coveredBy ? READY_BY_ID[d.coveredBy] : undefined;
                    return (
                      <li key={d.id} className="py-1.5 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-slate-800 dark:text-slate-200">{tx(d.label)}</span>
                          {cover && (
                            <button
                              type="button"
                              onClick={() => onOpen(cover.target)}
                              className="text-xs text-blue-700 dark:text-blue-300 hover:underline whitespace-nowrap"
                            >
                              {t('tl_use', { tool: tx(cover.title) })}
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{d.needs.startsWith('Covered') ? tx(d.needs) : t('tl_needs', { needs: tx(d.needs) })}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
};
