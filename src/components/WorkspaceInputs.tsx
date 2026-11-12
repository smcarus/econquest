import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PANEL_KEY, PANEL_LABEL, panelUses, type InputChip, type InputId, type PanelId, type WorkspaceInputsState, type WorkspaceT } from '../utils/workspaceInputs';
import { useT } from '../i18n/useLang';
import { WORKSPACE } from '../i18n/messages/workspace';

/**
 * Workspace > Your inputs: one chip per input (watchlist, open country, feeds, keys, AI model,
 * holdings, saved research), each with its state, the panels it feeds and a button to where it is set.
 */

const ALL_PANELS = Object.keys(PANEL_LABEL).length;

function feedsText(c: InputChip, t: WorkspaceT): string {
  const here = c.drives.length === ALL_PANELS ? t('feedsEvery') : c.drives.length ? t('feedsSome', { list: c.drives.map((p) => t(PANEL_KEY[p])).join(', ') }) : t('feedsNone');
  return c.alsoFeeds ? t('feedsAlso', { here, other: c.alsoFeeds }) : here;
}

type Keys = NonNullable<WorkspaceInputsState['keys']>;

/** Keys and saved-research counts from the app server, refreshed when the window regains focus. */
export function useServerInputs(): { keys?: Keys; research?: { briefs: number; docs: number } } {
  const [keys, setKeys] = useState<Keys | undefined>();
  const [research, setResearch] = useState<{ briefs: number; docs: number } | undefined>();
  useEffect(() => {
    let stop = false;
    const load = () => {
      fetch('/api/settings/keys')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!stop) setKeys(Array.isArray(d?.keys) ? d.keys : undefined);
        })
        .catch(() => !stop && setKeys(undefined));
      fetch('/api/research')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stop) return;
          setResearch(d ? { briefs: Array.isArray(d.briefs) ? d.briefs.length : 0, docs: Array.isArray(d.docs) ? d.docs.length : 0 } : undefined);
        })
        .catch(() => !stop && setResearch(undefined));
    };
    load();
    // Settings saved in a dialog, or a brief saved below, show up when focus returns or within 20 s.
    window.addEventListener('focus', load);
    const t = window.setInterval(load, 20000);
    return () => {
      stop = true;
      window.removeEventListener('focus', load);
      window.clearInterval(t);
    };
  }, []);
  return { keys, research };
}

const DOT: Record<InputChip['state'], string> = {
  ok: 'bg-emerald-500',
  setup: 'bg-amber-500',
  empty: 'bg-slate-300 dark:bg-slate-600',
};

export const WorkspaceInputs: React.FC<{
  chips: InputChip[];
  onAction: (id: InputId) => void;
  /** The chip under the pointer or keyboard focus, so the page can outline the panels it feeds. */
  onHighlight?: (id: InputId | null) => void;
}> = ({ chips, onAction, onHighlight }) => {
  const toFix = chips.filter((c) => c.state === 'setup').length;
  const t = useT(WORKSPACE);

  return (
    <section className="ui-panel" aria-labelledby="ws-inputs-title" data-workspace-inputs="true">
      <header className="px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <h2 id="ws-inputs-title" className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('yourInputs')}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {toFix ? t('inputsNeedSetup', { n: toFix }) : ''}{t('inputsHelp')}
        </p>
      </header>
      <ul>
        {chips.map((c) => (
          <li key={c.id} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800 min-w-0">
            <button
              type="button"
              data-input={c.id}
              data-input-state={c.state}
              onClick={() => onAction(c.id)}
              onMouseEnter={() => onHighlight?.(c.id)}
              onMouseLeave={() => onHighlight?.(null)}
              onFocus={() => onHighlight?.(c.id)}
              onBlur={() => onHighlight?.(null)}
              title={`${c.label}: ${c.value}. ${c.note} ${feedsText(c, t)}. ${t('pressTo', { action: `${c.action.charAt(0).toLowerCase()}${c.action.slice(1)}` })}`}
              aria-label={`${c.label}: ${c.value}. ${c.state === 'setup' ? c.note + ' ' : ''}${feedsText(c, t)}. ${c.action}.`}
              className="w-full h-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${DOT[c.state]}`} aria-hidden="true" />
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{c.label}</span>
                <span className="ml-auto min-w-0 truncate text-sm text-slate-900 dark:text-white text-right">{c.value}</span>
                <ChevronRight className="shrink-0 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              </span>
              {c.state === 'setup' && <span className="block mt-0.5 pl-3.5 text-xs text-amber-800 dark:text-amber-300">{c.note}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** "Uses: Watchlist · Data feeds (Missing) · …" under a panel title. Each name opens that input. */
export const UsesLine: React.FC<{ chips: InputChip[]; panel: PanelId; onAction: (id: InputId) => void }> = ({ chips, panel, onAction }) => {
  const uses = panelUses(chips, panel);
  const t = useT(WORKSPACE);
  if (!uses.length) return null;
  return (
    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400" data-uses={panel}>
      {t('uses')}{' '}
      {uses.map((c, i) => (
        <React.Fragment key={c.id}>
          {i > 0 && ' · '}
          <button type="button" className="hover:underline text-slate-700 dark:text-slate-300" onClick={() => onAction(c.id)} title={`${c.label}: ${c.value}. ${c.action}.`}>
            {c.label}
          </button>
          {c.state === 'setup' && (
            <span className="text-amber-800 dark:text-amber-300"> ({c.note.startsWith(t('missing')) ? t('missing') : t('needsSetup')})</span>
          )}
        </React.Fragment>
      ))}
    </p>
  );
};
