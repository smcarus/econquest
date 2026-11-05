import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { FIRST_RUN_DISMISSED_KEY, WATCHLIST_TOUCHED_KEY, firstRunSteps, showFirstRun, type FirstRunStepId } from '../utils/firstRun';

const read = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

/** Getting started card on Workspace for a new install (see utils/firstRun.ts). */
export const FirstRunGuide: React.FC<{
  liveCount: number;
  aiProvider?: string;
  onAction: (id: FirstRunStepId) => void;
}> = ({ liveCount, aiProvider, onAction }) => {
  const [dismissed, setDismissed] = useState(() => read(FIRST_RUN_DISMISSED_KEY));
  const [keySources, setKeySources] = useState<Record<string, 'app' | 'env' | 'none'> | undefined>();
  const [touched, setTouched] = useState(() => read(WATCHLIST_TOUCHED_KEY));

  useEffect(() => {
    if (dismissed) return;
    let stop = false;
    const load = () =>
      fetch('/api/settings/keys')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stop || !d?.keys) return;
          setKeySources(Object.fromEntries(d.keys.map((k: { id: string; source: 'app' | 'env' | 'none' }) => [k.id, k.source])));
        })
        .catch(() => {});
    void load();
    // Settings saved in the dialog take effect at once; pick them up when the window regains focus.
    const onFocus = () => {
      void load();
      setTouched(read(WATCHLIST_TOUCHED_KEY));
    };
    window.addEventListener('focus', onFocus);
    const t = window.setInterval(onFocus, 15000);
    return () => {
      stop = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(t);
    };
  }, [dismissed]);

  const steps = firstRunSteps({ liveCount, keySources, aiProvider, watchlistTouched: touched });
  if (!showFirstRun(steps, dismissed)) return null;
  const left = steps.filter((s) => !s.done).length;

  return (
    <section className="ui-panel" aria-labelledby="first-run-title" data-first-run="true">
      <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 id="first-run-title" className="text-sm font-semibold text-slate-900 dark:text-white">
            Getting started
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {left} of {steps.length} steps left. The app shows only real figures, so a new install reads Missing until these are done.
          </p>
        </div>
        <button
          type="button"
          className="ui-btn ui-btn-ghost"
          title="Hide this guide (it stays hidden in this browser)"
          onClick={() => {
            try {
              localStorage.setItem(FIRST_RUN_DISMISSED_KEY, '1');
            } catch {
              // storage blocked: hidden for this visit only
            }
            setDismissed(true);
          }}
        >
          <X className="w-3.5 h-3.5" /> Hide
        </button>
      </header>
      <ol className="divide-y divide-slate-100 dark:divide-slate-800">
        {steps.map((s) => (
          <li key={s.id} className="px-4 py-2.5 flex items-start gap-3">
            {s.done ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-label="Done" />
            ) : (
              <Circle className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" aria-label="Not done" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${s.done ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{s.title}</div>
              {!s.done && <p className="text-xs text-slate-500 dark:text-slate-400">{s.why}</p>}
            </div>
            {!s.done && (
              <button
                type="button"
                className="ui-btn shrink-0"
                onClick={() => {
                  if (s.id === 'watchlist') {
                    try {
                      localStorage.setItem(WATCHLIST_TOUCHED_KEY, '1');
                    } catch {
                      // storage blocked
                    }
                    setTouched(true);
                  }
                  onAction(s.id);
                }}
              >
                {s.action}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};
