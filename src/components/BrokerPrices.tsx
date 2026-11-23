import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { BROKER_LABEL, type BrokerQuote } from '../engine/brokerPrices';

/**
 * Menu > Settings > Your subscriptions, below "Your broker prices": the prices of the contracts you
 * list, from your own IBKR account through the gateway on this computer (gap CG9). Shown here only:
 * the page keeps nothing, and the server never saves them. Loaded only when the page is opened.
 */

interface Reply {
  on: boolean;
  ready: boolean;
  note: string;
  gateway?: string;
  signedIn?: boolean;
  quotes: BrokerQuote[];
  at: string;
}

const fmt = (v: number | null, d = 4) => (v === null ? '' : Number(v.toPrecision(8)).toLocaleString(undefined, { maximumFractionDigits: d }));

export default function BrokerPrices() {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/broker/prices', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) {
        setError(String(j?.error || `HTTP ${r.status}`));
        setReply(null);
      } else {
        setError('');
        setReply(j as Reply);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!reply?.ready) return;
    const id = setInterval(() => void load(), 15_000);
    return () => clearInterval(id);
  }, [reply?.ready, load]);

  if (reply && !reply.on) return null;
  return (
    <div className="mt-4 border border-slate-700 rounded p-3" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-200">{BROKER_LABEL}</h4>
        <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} aria-hidden /> Refresh
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">Shown on screen only. These prices are never saved, put in downloads, backups or shared copies, or sent to the AI model.</p>
      {error && <p className="mt-2 text-xs text-amber-400">{error}</p>}
      {reply && <p className="mt-2 text-xs text-slate-300">{reply.note}</p>}
      {reply?.ready && reply.quotes.length > 0 && (
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-slate-400 text-left">
              <th className="py-1 pr-2">Your label</th>
              <th className="py-1 pr-2">Symbol</th>
              <th className="py-1 pr-2 text-right">Last</th>
              <th className="py-1 pr-2 text-right">Bid</th>
              <th className="py-1 pr-2 text-right">Ask</th>
              <th className="py-1 pr-2 text-right">Change %</th>
              <th className="py-1">Data</th>
            </tr>
          </thead>
          <tbody>
            {reply.quotes.map((q) => (
              <tr key={q.conid} className="border-t border-slate-800">
                <td className="py-1 pr-2">{q.label}</td>
                <td className="py-1 pr-2 text-slate-400">{q.symbol ?? q.conid}</td>
                <td className="py-1 pr-2 text-right">{q.last === null ? <span className="text-slate-500">Missing</span> : fmt(q.last)}{q.closePrice ? <span className="text-slate-500"> (previous close)</span> : null}{q.halted ? <span className="text-amber-400"> (halted)</span> : null}</td>
                <td className="py-1 pr-2 text-right">{fmt(q.bid)}</td>
                <td className="py-1 pr-2 text-right">{fmt(q.ask)}</td>
                <td className="py-1 pr-2 text-right">{q.changePct === null ? '' : `${fmt(q.changePct, 2)}%`}</td>
                <td className="py-1 text-slate-400">{q.availability ?? 'Not stated'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {reply?.ready && <p className="mt-2 text-[11px] text-slate-500">Asked at {new Date(reply.at).toLocaleTimeString()} from {reply.gateway}. "Missing" means IBKR gave no price: your market data subscriptions decide what you see.</p>}
    </div>
  );
}
