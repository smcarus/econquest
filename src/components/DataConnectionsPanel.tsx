import { CDS_HIDDEN } from '../utils/cdsHidden';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, CircleOff, RefreshCw, Settings2, XCircle } from 'lucide-react';
import { API_KEY_FIELDS } from '../data/apiKeyFields';
import { STATE_LABEL, isFailure, type ConnectionGroup, type ConnectionReport, type ConnectionResult, type ConnectionState } from '../utils/connectionCheck';
import { useLang, useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

/**
 * Data connections: one row per outside source, checked live from the server (GET
 * /api/data/connections). Says what connected, with a figure it returned, and for anything else
 * whether it needs setting up or did not answer, and why. The same check runs in a terminal with
 * `npm run check:data`.
 */

/** Rows whose key can be entered in Settings instead of .env. */
const SETTINGS_CHECK_IDS = new Set(API_KEY_FIELDS.map((f) => f.checkId));
/** Opens the Settings page that holds this source's key (AI model, free keys or your own paid data). */
const openSettingsFor = (checkId: string) => {
  const section = API_KEY_FIELDS.find((f) => f.checkId === checkId)?.section;
  window.dispatchEvent(new CustomEvent('econquest:open-settings', { detail: { tab: section === 'ai' ? 'ai' : section === 'own_account' ? 'paid' : section === 'subscription' ? 'subscriptions' : 'keys' } }));
};


function StateIcon({ state }: { state: ConnectionState }) {
  const cls = 'w-4 h-4 shrink-0';
  if (state === 'connected') return <CheckCircle2 className={`${cls} text-emerald-600 dark:text-emerald-400`} aria-hidden />;
  if (isFailure(state)) return <XCircle className={`${cls} text-rose-600 dark:text-rose-400`} aria-hidden />;
  if (state === 'needs_setup') return <Settings2 className={`${cls} text-amber-600 dark:text-amber-400`} aria-hidden />;
  if (state === 'off') return <CircleOff className={`${cls} text-slate-400`} aria-hidden />;
  return <CircleDashed className={`${cls} text-slate-400`} aria-hidden />;
}

function stateTone(state: ConnectionState): string {
  if (state === 'connected') return 'text-emerald-700 dark:text-emerald-400';
  if (isFailure(state)) return 'text-rose-700 dark:text-rose-400';
  if (state === 'needs_setup') return 'text-amber-700 dark:text-amber-400';
  return 'text-slate-500 dark:text-slate-400';
}

const Row: React.FC<{ r: ConnectionResult }> = ({ r }) => {
  const t = useT(MENU);
  const tx = useTx();
  return (
  <li className="py-2 text-sm" data-connection={r.id} data-state={r.state}>
    <div className="flex items-start gap-2">
      <StateIcon state={r.state} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium text-slate-900 dark:text-white">{r.name}</span>
          <span className={`text-xs font-medium ${stateTone(r.state)}`}>
            {STATE_LABEL[r.state] && t(`st_${r.state}`)}
            {r.state === 'connected' && r.latencyMs !== undefined ? `, ${r.latencyMs} ms` : ''}
          </span>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{t('dc_fills', { feeds: tx(r.feeds) })}</div>
        <div className="mt-0.5 text-xs text-slate-700 dark:text-slate-300 break-words">
          {tx(r.state === 'connected' && r.sample ? r.sample : r.detail)}
          {r.state !== 'connected' && r.host ? <span className="text-slate-400"> ({r.host})</span> : null}
        </div>
        {r.warning && (
          <div className="mt-0.5 flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />
            <span>{r.warning}</span>
          </div>
        )}
        {SETTINGS_CHECK_IDS.has(r.id) ? (
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            <button type="button" onClick={() => openSettingsFor(r.id)} className="text-blue-700 dark:text-blue-400 hover:underline">
              {r.state === 'optional' ? t('dc_addKey') : t('dc_changeKey')}
            </button>
            <span>{t('dc_orEnv')}</span>
          </div>
        ) : (
          r.setup &&
          (r.state === 'needs_setup' || r.state === 'off') && (
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium">{t('dc_setupEnv')}</span> <code className="break-words">{r.setup}</code>
            </div>
          )
        )}
      </div>
    </div>
  </li>
  );
};

export const DataConnectionsPanel: React.FC<{ startCollapsed?: boolean }> = ({ startCollapsed = false }) => {
  const t = useT(MENU);
  const lang = useLang();
  const [open, setOpen] = useState(!startCollapsed);
  const [report, setReport] = useState<ConnectionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (refresh: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/data/connections${refresh ? '?refresh=1' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport((await res.json()) as ConnectionReport);
    } catch (e) {
      setError(t('dc_cantRun', { detail: e instanceof Error ? e.message : t('dc_noAnswer') }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void run(false);
  }, [run]);

  const c = report?.counts;
  const failed = c ? c.no_answer + c.refused + c.bad_reply : 0;

  return (
    <section aria-labelledby="data-connections" className="ui-panel" data-connections-panel="true">
      <header className="ui-panel-header flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="data-connections" className="ui-section-title">
            {t('dc_title')}
          </h2>
          <p className="ui-label">
            {t('dc_intro')} <code>npm run check:data</code>.{lang !== 'en' && ` ${t('dc_englishNote')}`}
          </p>
          {c && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300" data-connection-summary="true">
              {t('dc_summary', { connected: c.connected, failed, setup: c.needs_setup, off: c.off, optional: c.optional })}
              {report ? t('dc_checkedAt', { time: new Date(report.checkedAt).toLocaleTimeString() }) : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {startCollapsed && (
            <button type="button" className="ui-pill" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-connections-toggle="true">
              {open ? t('dc_hide') : t('dc_show')}
            </button>
          )}
          <button type="button" className="ui-pill inline-flex items-center gap-1.5" onClick={() => void run(true)} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            {loading ? t('dc_checking') : t('dc_again')}
          </button>
        </div>
      </header>
      {error && <p className="px-4 py-3 text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      {!report && loading && <p className="px-4 py-3 text-sm text-slate-500">{t('dc_checkingAll')}</p>}
      {report && open && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 px-4 pb-3">
          {(['free', 'free_key', 'own_account', 'ai'] as ConnectionGroup[]).map((g) => {
            // The own-data CDS row is hidden with CDS for now (src/utils/cdsHidden.ts).
            const rows = report.results.filter((r) => r.group === g && !(CDS_HIDDEN && r.id === 'own_cds'));
            if (!rows.length) return null;
            return (
              <div key={g} className="pt-3">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t(`dc_g_${g}`)}</h3>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((r) => (
                    <Row key={r.id} r={r} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
