import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Search, X } from 'lucide-react';
import type { CatalogueEntry, CatalogueSource } from '../utils/catalogueSearch';

/**
 * Menu > Find data (CG6): one search across DBnomics, the IMF DataMapper, the World Bank's World
 * Development Indicators and Eurostat. Results are catalogue entries with a link to the provider's
 * own page; nothing is downloaded until the user opens one.
 */
type Reply = { q: string; results: CatalogueEntry[]; problems: string[]; licences: Record<CatalogueSource, string>; labels: Record<CatalogueSource, string> };
const ORDER: CatalogueSource[] = ['dbnomics', 'imf', 'worldbank', 'eurostat'];

export function CatalogueSearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/catalogue/search?q=${encodeURIComponent(q.trim())}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setReply(await r.json());
    } catch (err: any) {
      setError(`The search did not answer (${err?.message || err}).`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="catalogue-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="catalogue-title" className="ui-title inline-flex items-center gap-2">
            <Search className="w-4 h-4" aria-hidden /> Find data in free catalogues
          </h2>
          <button type="button" onClick={onClose} aria-label="Close find data" className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto text-sm">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Searches DBnomics (about 90 statistical providers), the IMF DataMapper, the World Bank's World Development Indicators and Eurostat. Each result opens on the provider's own page. Load a series you find under Menu &gt; Your data (CSV), or ask the Chart Agent for it if the app already holds it.
          </p>
          <form onSubmit={run} className="flex gap-2">
            <label htmlFor="catalogue-q" className="sr-only">Search words or a code</label>
            <input id="catalogue-q" ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. remittances Kenya, house prices, NY.GDP.MKTP.KD.ZG" className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700" />
            <button type="submit" className="ui-btn" disabled={busy || q.trim().length < 2} data-catalogue-search="true">
              {busy ? 'Searching…' : 'Search'}
            </button>
          </form>
          {error && <p className="text-rose-600 dark:text-rose-400">{error}</p>}
          {reply?.problems.map((p) => (
            <p key={p} className="text-xs text-amber-700 dark:text-amber-400">
              {p}
            </p>
          ))}
          {reply &&
            ORDER.map((src) => {
              const rows = reply.results.filter((r) => r.source === src);
              return (
                <section key={src} data-catalogue-source={src}>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    {reply.labels[src]} <span className="font-normal text-slate-500">({rows.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{reply.licences[src]}</p>
                  {rows.length === 0 ? (
                    <p className="text-xs text-slate-500">No match.</p>
                  ) : (
                    <ul className="space-y-1">
                      {rows.map((r) => (
                        <li key={`${r.source}:${r.code}`} className="flex flex-wrap items-baseline gap-x-2">
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                            {r.title} <ExternalLink className="w-3 h-3" aria-hidden />
                          </a>
                          <code className="text-xs text-slate-500">{r.code}</code>
                          {r.group && <span className="text-xs text-slate-500">{r.group}</span>}
                          {r.series !== undefined && <span className="text-xs text-slate-500">{r.series.toLocaleString()} series</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
        </div>
      </div>
    </div>
  );
}
