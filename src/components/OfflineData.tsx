/**
 * Offline data: the "Download all country data" window (Menu > Offline data) and the Offline pill
 * in the top bar. Both read the server: /api/preload for the download (same run as
 * `npm run preload`), /api/online for whether the free feeds can be reached from this computer.
 *
 * Screens always show only the newest value; this window is about having everything saved so the
 * app is fast and keeps working without a connection.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudOff, Download, HardDriveDownload, Square, X } from 'lucide-react';
import { formatBytes, type PreloadState, type PreloadSummary } from '../utils/preload';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

type PreloadReply = {
  state: PreloadState;
  summary: PreloadSummary;
  disk: { bytes: number; remainingEstimateBytes: number | null; countriesOnDisk: number };
  file: string;
};
type OnlineReply = {
  online: boolean;
  checkedAt: string;
  savedFrom: string | null;
  savedNewest: string | null;
  countriesSaved: number;
  countriesTotal: number;
  preloadRunning: boolean;
};

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const dayTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

/** "1 min 20 s" since an ISO time. */
export function elapsed(sinceIso: string, now = Date.now()): string {
  const sec = Math.max(0, Math.round((now - Date.parse(sinceIso)) / 1000));
  if (!Number.isFinite(sec)) return '';
  const m = Math.floor(sec / 60);
  return m ? `${m} min ${sec % 60} s` : `${sec} s`;
}

/** Polls whether the feeds answer (every minute) and whether the browser itself has a network. */
export function useOnlineStatus(): OnlineReply | null {
  const [status, setStatus] = useState<OnlineReply | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/online')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j && setStatus(j))
        .catch(() => undefined);
    load();
    const t = setInterval(load, 60_000);
    const onChange = () => load();
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
    };
  }, []);
  return status;
}

/** Top-bar pill, shown only while the feeds cannot be reached. */
export function OfflinePill({ status, onOpen }: { status: OnlineReply | null; onOpen: () => void }) {
  const t = useT(MENU);
  if (!status || status.online) return null;
  const from = status.savedFrom ? t('od_savedFrom', { date: day(status.savedFrom) }) : t('od_nothing');
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap text-amber-700 dark:text-amber-300"
      title={t('od_pillTitle', { from })}
    >
      <CloudOff className="w-3.5 h-3.5" aria-hidden />
      <span>{t('od_offline')}</span>
      <span className="hidden md:inline text-slate-500 dark:text-slate-400">· {from}</span>
    </button>
  );
}

export function OfflineDataDialog({ onClose }: { onClose: () => void }) {
  const t = useT(MENU);
  const tx = useTx();
  const [reply, setReply] = useState<PreloadReply | null>(null);
  const [online, setOnline] = useState<OnlineReply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([fetch('/api/preload'), fetch('/api/online')]);
      if (!p.ok) throw new Error(`HTTP ${p.status}`);
      setReply(await p.json());
      if (o.ok) setOnline(await o.json());
      setError(null);
    } catch (e: any) {
      setError(t('c_serverDown', { detail: e?.message || 'error' }));
    }
  }, [t]);

  useEffect(() => {
    void load();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load, onClose]);

  // Refresh every 2 s while a download runs, else every 30 s.
  const running = Boolean(reply?.state.running);
  useEffect(() => {
    const t = setInterval(() => void load(), running ? 2000 : 30_000);
    return () => clearInterval(t);
  }, [load, running]);

  const post = async (url: string, body?: unknown) => {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || `HTTP ${r.status}`);
      }
      setReply(await r.json());
      setTimeout(() => void load(), 800);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  // Ticks every second so the running step's time moves even between server polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const s = reply?.summary;
  const pct = s && s.total ? Math.round((s.done / s.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offline-data-title"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="offline-data-title" className="ui-title inline-flex items-center gap-2">
            <HardDriveDownload className="w-4 h-4" aria-hidden /> {t('od_title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('od_closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto ui-body">
          <p>{t('od_intro')}</p>

          {error && <p className="text-rose-600 dark:text-rose-400">{tx(error)}</p>}

          {online && (
            <p className={online.online ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}>
              {online.online
                ? t('od_online')
                : t('od_offlineNote')}
            </p>
          )}

          {s && reply && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="ui-label">{t('od_countries')}</div>
                <div className="ui-num text-base">
                  {t('od_of', { a: s.countriesReady, b: s.countriesTotal })}
                </div>
              </div>
              <div>
                <div className="ui-label">{t('od_steps')}</div>
                <div className="ui-num text-base">
                  {t('od_of', { a: s.done, b: s.total })}
                </div>
              </div>
              <div>
                <div className="ui-label">{t('od_disk')}</div>
                <div className="ui-num text-base">{formatBytes(reply.disk.bytes)}</div>
              </div>
              <div>
                <div className="ui-label">{t('od_left')}</div>
                <div className="ui-num text-base" title={t('od_leftTip')}>
                  {reply.disk.remainingEstimateBytes === null
                    ? t('od_afterFirst')
                    : reply.disk.remainingEstimateBytes === 0
                    ? t('od_none')
                    : t('od_about', { size: formatBytes(reply.disk.remainingEstimateBytes) })}
                </div>
              </div>
            </div>
          )}

          {s && (
            <div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('od_progress')}>
                <div className="h-2 bg-blue-600 dark:bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {reply?.state.running
                  ? reply.state.waiting
                    ? t('od_waiting', { why: tx(reply.state.waiting.why), when: dayTime(reply.state.waiting.until) })
                    : reply.state.current
                    ? t('od_now', { n: s.done + s.failed + s.skipped + 1, total: s.total, elapsed: elapsed(reply.state.current.since, now), label: tx(reply.state.current.label) })
                    : t('od_starting')
                  : s.completeAsOf
                  ? t('od_complete', { when: dayTime(s.completeAsOf) })
                  : reply?.state.finishedAt
                  ? t('od_finished', { when: dayTime(reply.state.finishedAt) })
                  : reply?.state.endedEarly
                  ? tx(reply.state.endedEarly)
                  : t('od_notYet')}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {running ? (
              <button type="button" className="ui-btn inline-flex items-center gap-1.5" onClick={() => void post('/api/preload/stop')}>
                <Square className="w-3.5 h-3.5" aria-hidden /> {t('od_stop')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary inline-flex items-center gap-1.5"
                  disabled={online?.online === false}
                  onClick={() => void post('/api/preload/start')}
                >
                  <Download className="w-3.5 h-3.5" aria-hidden />
                  {s && s.done > 0 && s.done < s.total ? t('od_carryOn') : t('od_downloadAll')}
                </button>
                {s && s.done > 0 && (
                  <button type="button" className="ui-btn ui-btn-ghost" disabled={online?.online === false} onClick={() => void post('/api/preload/start', { fresh: true })}>
                    {t('od_again')}
                  </button>
                )}
              </>
            )}
          </div>

          {s && s.problems.length > 0 && (
            <div>
              <div className="ui-section-title mb-1">{t('od_notSaved')}</div>
              <ul className="space-y-1">
                {s.problems.map((p) => (
                  <li key={p.id}>
                    <span className={p.outcome === 'skipped' ? 'text-amber-700 dark:text-amber-300' : 'text-rose-600 dark:text-rose-400'}>
                      {p.outcome === 'skipped' ? t('od_needsSetup') : t('od_missing')}
                    </span>{' '}
                    {tx(p.label)}
                    {p.note ? <span className="text-slate-500 dark:text-slate-400">: {tx(p.note)}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-slate-500 dark:text-slate-400">
            {t('od_foot', { cmd: 'npm run preload', file: reply?.file || 'data/local/preload.json' })}
          </p>
        </div>
      </div>
    </div>
  );
}
