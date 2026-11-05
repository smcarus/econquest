import React, { useEffect, useState } from 'react';
import { PANEL_LABEL, workspaceInputs, type InputChip, type InputId, type WorkspaceInputsState } from '../utils/workspaceInputs';

/**
 * Workspace > Your inputs: one chip per input (watchlist, open country, feeds, keys, AI model,
 * holdings, saved research), each with its state, the panels it feeds and a button to where it is set.
 */

const ALL_PANELS = Object.keys(PANEL_LABEL).length;

type Keys = NonNullable<WorkspaceInputsState['keys']>;

/** Keys and saved-research counts from the app server, refreshed when the window regains focus. */
function useServerInputs(): { keys?: Keys; research?: { briefs: number; docs: number } } {
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
  state: Omit<WorkspaceInputsState, 'keys' | 'research'>;
  onAction: (id: InputId) => void;
}> = ({ state, onAction }) => {
  const server = useServerInputs();
  const chips = workspaceInputs({ ...state, ...server });
  const toFix = chips.filter((c) => c.state === 'setup').length;

  return (
    <section className="ui-panel" aria-labelledby="ws-inputs-title" data-workspace-inputs="true">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <h2 id="ws-inputs-title" className="text-sm font-semibold text-slate-900 dark:text-white">
          Your inputs
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {toFix ? `${toFix} need setup. ` : ''}Each one names the panels it feeds. Press one to change it.
        </p>
      </header>
      <ul className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {chips.map((c) => (
          <li key={c.id} className="border-b xl:border-b-0 border-r border-slate-100 dark:border-slate-800 min-w-0">
            <button
              type="button"
              data-input={c.id}
              data-input-state={c.state}
              onClick={() => onAction(c.id)}
              title={`${c.note} ${c.action}.`}
              className="w-full h-full flex flex-col items-start justify-start text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${DOT[c.state]}`} aria-hidden="true" />
                {c.label}
                
              </span>
              <span className="block mt-0.5 text-sm text-slate-900 dark:text-white line-clamp-2">{c.value}</span>
              {c.state === 'setup' && <span className="block mt-0.5 text-xs text-amber-800 dark:text-amber-300">{c.note}</span>}
              <span className="block mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {c.drives.length === ALL_PANELS ? 'Feeds every panel' : c.drives.length ? `Feeds ${c.drives.map((p) => PANEL_LABEL[p]).join(', ')}` : `Feeds ${c.alsoFeeds}`}
              </span>
              <span className="block mt-1 text-xs font-medium text-blue-700 dark:text-blue-300">{c.action}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
