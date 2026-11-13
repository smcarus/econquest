import { CDS_HIDDEN } from '../utils/cdsHidden';
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Bell, Plug, CheckCircle2, CreditCard, Sunrise, Cpu, ExternalLink, Eye, EyeOff, KeyRound, Lock, Settings2, X, XCircle, Wrench } from 'lucide-react';
import type { AIRuntimeConfig } from '../types/council';
import { AiModelSettings } from './AiModelSettings';
import { BackupSettings } from './BackupSettings';
import { MorningBriefSettings } from './MorningBriefSettings';
import { STATE_LABEL, isFailure, type ConnectionResult } from '../utils/connectionCheck';
import type { ApiKeyStatus } from '../utils/userSettings';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

// Your subscriptions page (data plan G4): its series list loads only when the page is opened.
const SubscriptionSeries = lazy(() => import('./SubscriptionSeries'));
const ApiTokenSettings = lazy(() => import('./ApiTokenSettings'));
const HiddenNamesSettings = lazy(() => import('./HiddenNamesSettings'));

/**
 * Settings (Menu > Settings, or Cmd/Ctrl + comma). The "Data API keys" section lets you paste your
 * own key for a data source instead of editing .env. Keys are saved by the app server on this
 * computer only (data/local/settings.json), win over .env, and come back to the browser masked.
 * Each key can be tested before it is saved; the test is the same as the Data connections check.
 */

/**
 * Any part of the app can open Settings with openSettings('ai') (or the raw event, whose detail
 * may name the page: { tab: 'ai' | 'keys' | 'paid' | 'subscriptions' | 'alerts' | 'morning' | 'backup' | 'tokens' | 'hidden' | 'tools' }).
 */
export const OPEN_SETTINGS_EVENT = 'econquest:open-settings';

export function openSettings(tab?: SettingsTab): void {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: tab ? { tab } : undefined }));
}

interface KeysReply {
  keys: ApiKeyStatus[];
  canEdit: boolean;
  savedIn: string;
  requestFrom?: string;
  inDocker?: boolean;
  encryption?: { atRest: boolean; keyFrom: string | null; problem: string | null; unreadable: string[] };
  /** Server alerts: the last alert the server tried to send. */
  lastAlert?: { at: string; title: string; results: Array<{ route: 'webhook' | 'email'; ok: boolean; detail: string }> } | null;
}

type KeySection = ApiKeyStatus['section'];

const SECTIONS: KeySection[] = ['free_key', 'own_account', 'subscription', 'ai', 'alerts'];

function CheckLine({ check }: { check: ConnectionResult }) {
  const t = useT(MENU);
  const tx = useTx();
  const ok = check.state === 'connected';
  const bad = isFailure(check.state) || check.state === 'needs_setup';
  const tone = ok ? 'text-emerald-700 dark:text-emerald-400' : bad ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400';
  return (
    <div className={`mt-2 flex items-start gap-1.5 text-xs ${tone}`} role="status" data-key-check={check.state}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden /> : bad ? <XCircle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden /> : null}
      <span>
        <span className="font-medium">{check.id.startsWith('alert_') ? (ok ? t('st_sent') : t('st_notSent')) : STATE_LABEL[check.state] && t(`st_${check.state}`)}:</span> {tx(ok && check.sample ? check.sample : check.detail)}
      </span>
    </div>
  );
}

const KeyRow: React.FC<{ k: ApiKeyStatus; canEdit: boolean; onChanged: (r: KeysReply) => void }> = ({ k, canEdit, onChanged }) => {
  const t = useT(MENU);
  const tx = useTx();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<'' | 'test' | 'save' | 'remove'>('');
  const [error, setError] = useState('');
  const [check, setCheck] = useState<ConnectionResult | null>(null);
  const inputId = `settings-key-${k.id}`;
  // A pick-one setting shows its current choice (Off when nothing is set).
  const current = k.choices ? k.masked || 'off' : '';

  const call = async (kind: 'test' | 'save' | 'remove') => {
    setBusy(kind);
    setError('');
    setCheck(null);
    try {
      const url = kind === 'test' ? `/api/settings/keys/${k.id}/test` : `/api/settings/keys/${k.id}`;
      const method = kind === 'test' ? 'POST' : kind === 'save' ? 'PUT' : 'DELETE';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: kind === 'remove' ? undefined : JSON.stringify({ value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || t('c_http', { status: res.status }));
      if (body.check) setCheck(body.check);
      if (kind !== 'test') {
        onChanged(body as KeysReply);
        setValue('');
        setShow(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
    }
  };

  return (
    <li className="py-4" data-settings-key={k.id} data-source={k.source}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label htmlFor={inputId} className="font-medium text-sm text-slate-900 dark:text-white">
          {tx(k.label)}
        </label>
        <span className={k.source === 'none' ? 'ui-badge' : 'ui-badge ui-badge-positive'}>
          {t(`set_src_${k.source}`)}
          {k.masked ? ` ${tx(k.choices?.find((c) => c.value === k.masked)?.label || k.masked)}` : ''}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {k.section === 'own_account' ? '' : `${k.provider}. `}
        {tx(k.feeds)} {tx(k.withoutIt)}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {tx(k.getKeySteps)}{' '}
        <a href={k.getKeyUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 hover:underline">
          {k.section === 'alerts' ? t('set_howSetup') : k.secret ? t('set_howKey') : t('set_whereFind')} <ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      </p>
      {k.source === 'app' && k.envAlsoSet && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('set_envAlso')}</p>
      )}

      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && canEdit && !busy) call('save');
        }}
      >
        {k.choices ? (
          <select
            id={inputId}
            value={value || current}
            onChange={(e) => setValue(e.target.value === current ? '' : e.target.value)}
            disabled={!canEdit}
            className="flex-1 min-w-[14rem] px-2 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60"
          >
            {k.choices.map((c) => (
              <option key={c.value} value={c.value}>
                {tx(c.label)}
              </option>
            ))}
          </select>
        ) : (
          <div className="relative flex-1 min-w-[14rem]">
            <input
              id={inputId}
              type={show || !k.secret ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={!canEdit ? t('set_ph_locked') : k.placeholder && k.source === 'none' ? tx(k.placeholder) : !k.secret ? (k.source === 'none' ? t('set_ph_type') : t('set_ph_replace')) : k.source === 'none' ? t('set_ph_paste') : t('set_ph_pasteNew')}
              autoComplete="off"
              spellCheck={false}
              disabled={!canEdit}
              className="w-full px-2 py-1.5 pr-8 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60"
            />
            {k.secret && (<button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? t('set_hideKey') : t('set_showKey')}
              title={show ? t('set_hideKey') : t('set_showKey')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>)}
          </div>
        )}
        <button type="button" className="ui-btn" disabled={!canEdit || !!busy || (!value.trim() && k.source === 'none' && !k.choices)} onClick={() => call('test')}>
          {busy === 'test' ? t('set_testing') : value.trim() ? t('set_test') : k.choices ? t('set_testSetting') : k.secret && k.section !== 'alerts' ? t('set_testKey') : t('set_testSetting')}
        </button>
        <button type="submit" className="ui-btn ui-btn-primary" disabled={!canEdit || !!busy || !value.trim()}>
          {busy === 'save' ? t('c_saving') : t('c_save')}
        </button>
        {k.source === 'app' && (
          <button type="button" className="ui-btn ui-btn-danger" disabled={!canEdit || !!busy} onClick={() => call('remove')}>
            {busy === 'remove' ? t('c_removing') : t('c_remove')}
          </button>
        )}
      </form>
      {error && (
        <div className="mt-2 text-xs text-rose-700 dark:text-rose-400" role="alert">
          {tx(error)}
        </div>
      )}
      {check && <CheckLine check={check} />}
    </li>
  );
};

export type SettingsTab = 'ai' | 'keys' | 'paid' | 'subscriptions' | 'alerts' | 'morning' | 'backup' | 'tokens' | 'hidden' | 'tools';

/** The pages of Settings, in order, and which key sections each one shows. */
const PAGES: Array<{ id: SettingsTab; sections: KeySection[] }> = [
  { id: 'ai', sections: [] },
  { id: 'keys', sections: ['free_key'] },
  // Holds only the own-data CDS switch, hidden for now (src/utils/cdsHidden.ts).
  ...(CDS_HIDDEN ? [] : [{ id: 'paid' as const, sections: ['own_account' as const] }]),
  // Your paid data subscription (src/engine/paidData.ts): the switch, sign-in details and your series.
  { id: 'subscriptions', sections: ['subscription'] },
  { id: 'alerts', sections: ['alerts'] },
  { id: 'morning', sections: [] },
  { id: 'backup', sections: [] },
  // Tokens for outside systems (console integration item 2, src/utils/apiTokens.ts).
  { id: 'tokens', sections: [] },
  // Hidden names (console integration item 8, src/utils/exclusions.ts).
  { id: 'hidden', sections: [] },
  { id: 'tools', sections: [] },
];
const PAGE_ICON: Record<SettingsTab, React.ReactNode> = {
  ai: <Cpu className="w-3.5 h-3.5" aria-hidden />,
  keys: <KeyRound className="w-3.5 h-3.5" aria-hidden />,
  paid: <Lock className="w-3.5 h-3.5" aria-hidden />,
  subscriptions: <CreditCard className="w-3.5 h-3.5" aria-hidden />,
  alerts: <Bell className="w-3.5 h-3.5" aria-hidden />,
  morning: <Sunrise className="w-3.5 h-3.5" aria-hidden />,
  backup: <Archive className="w-3.5 h-3.5" aria-hidden />,
  tokens: <Plug className="w-3.5 h-3.5" aria-hidden />,
  hidden: <EyeOff className="w-3.5 h-3.5" aria-hidden />,
  tools: <Wrench className="w-3.5 h-3.5" aria-hidden />,
};

export const SettingsDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  /** Opens the full (advanced) AI set-up window. */
  onOpenAiModel?: () => void;
  /** Which page is showing (Sam, 2026-11-05: one Settings window, each link opens its page). */
  tab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
  /** The Tools page, drawn when the Tools part is open. */
  tools?: React.ReactNode;
  /** The AI model choice (Menu > Settings > AI model), for the AI model page. */
  aiConfig?: AIRuntimeConfig;
  onAiConfigChange?: (next: AIRuntimeConfig) => void;
}> = ({ isOpen, onClose, onOpenAiModel, tab = 'ai', onTabChange, tools, aiConfig, onAiConfigChange }) => {
  const t = useT(MENU);
  const tx = useTx();
  const showTools = tab === 'tools' && !!tools;
  const showAi = tab === 'ai' && !!aiConfig && !!onAiConfigChange;
  const page = PAGES.find((p) => p.id === tab) || PAGES[1];
  const [reply, setReply] = useState<KeysReply | null>(null);
  const [error, setError] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/settings/keys');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReply((await res.json()) as KeysReply);
    } catch (e) {
      setError(t('c_serverDown', { detail: e instanceof Error ? e.message : String(e) }));
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen) return;
    load();
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, load, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className={`w-full ${showTools ? 'max-w-6xl' : 'max-w-3xl'} max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="settings-title" className="ui-title inline-flex items-center gap-2">
            <Settings2 className="w-4 h-4" aria-hidden /> {t('set_title')}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('set_closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row min-h-0 flex-1">
          <nav aria-label={t('set_navAria')} className="sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-2 flex sm:flex-col gap-1 overflow-x-auto">
            {PAGES.filter((p) => (p.id === 'tools' ? !!tools : p.id === 'ai' ? !!aiConfig : true)).map((p) => (
              <button
                key={p.id}
                type="button"
                aria-current={tab === p.id ? 'page' : undefined}
                aria-pressed={tab === p.id}
                className="ui-tab inline-flex items-center gap-2 text-left whitespace-nowrap"
                onClick={() => onTabChange?.(p.id)}
                data-settings-tab={p.id}
                {...(p.id === 'tools' ? { 'data-settings-tools-tab': 'true' } : {})}
              >
                {PAGE_ICON[p.id]} {t(`set_p_${p.id}`)}
              </button>
            ))}
          </nav>

          {showTools ? (
            <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-label={t('set_p_tools')} data-settings-tools="true">
              {tools}
            </section>
          ) : tab === 'morning' ? (
            <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-labelledby="settings-morning-title">
              <h3 id="settings-morning-title" className="ui-section-title">{t('set_p_morning')}</h3>
              <div className="mt-3">
                <MorningBriefSettings />
              </div>
            </section>
          ) : tab === 'backup' ? (
            <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-labelledby="settings-backup-title">
              <h3 id="settings-backup-title" className="ui-section-title">{t('set_p_backup')}</h3>
              <div className="mt-3">
                <BackupSettings />
              </div>
            </section>
          ) : tab === 'tokens' ? (
            <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-labelledby="settings-tokens-title">
              <h3 id="settings-tokens-title" className="ui-section-title">{t('set_p_tokens')}</h3>
              <div className="mt-3">
                <Suspense fallback={<p className="text-xs text-slate-500">{t('c_loading')}</p>}>
                  <ApiTokenSettings />
                </Suspense>
              </div>
            </section>
          ) : tab === 'hidden' ? (
            <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-labelledby="settings-hidden-title">
              <h3 id="settings-hidden-title" className="ui-section-title">{t('set_p_hidden')}</h3>
              <div className="mt-3">
                <Suspense fallback={<p className="text-xs text-slate-500">{t('c_loading')}</p>}>
                  <HiddenNamesSettings />
                </Suspense>
              </div>
            </section>
          ) : showAi ? (
            <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-labelledby="settings-ai-title">
              <h3 id="settings-ai-title" className="ui-section-title">{t('set_p_ai')}</h3>
              <div className="mt-3">
                <AiModelSettings
                  config={aiConfig!}
                  onChange={onAiConfigChange!}
                  geminiKeySet={reply ? reply.keys.some((k) => k.section === 'ai' && k.source !== 'none') : undefined}
                  geminiKey={
                    reply ? (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {reply.keys
                          .filter((k) => k.section === 'ai')
                          .map((k) => (
                            <KeyRow key={k.id} k={k} canEdit={reply.canEdit} onChanged={setReply} />
                          ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">{error || t('c_loading')}</p>
                    )
                  }
                  onOpenAdvanced={
                    onOpenAiModel
                      ? () => {
                          onClose();
                          onOpenAiModel();
                        }
                      : undefined
                  }
                />
              </div>
            </section>
          ) : (
          <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-labelledby="settings-keys-title">
            <h3 id="settings-keys-title" className="ui-section-title">{t(`set_p_${page.id}`)}</h3>
            {page.id === 'alerts' && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400" data-alerts-intro>
                {t('set_alertsIntro')}
              </p>
            )}
            {page.id === 'alerts' && reply && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400" data-last-alert>
                {reply.lastAlert
                  ? t('set_lastAlert', {
                      at: reply.lastAlert.at.slice(0, 16).replace('T', ' '),
                      title: reply.lastAlert.title,
                      list: reply.lastAlert.results.map((r) => (r.ok ? t('set_alertSent', { route: r.route }) : t('set_alertNotSent', { route: r.route, detail: tx(r.detail) }))).join('; '),
                    })
                  : t('set_noAlert')}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {t(page.id === 'alerts' ? 'set_keysNoteAlerts' : 'set_keysNote', { where: reply ? ` (${reply.savedIn})` : '' })}
            </p>
            {reply?.encryption && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400" data-key-encryption>
                {reply.encryption.atRest
                  ? t('set_encrypted', { from: reply.encryption.keyFrom || '' })
                  : t('set_notEncrypted')}
                {reply.encryption.problem ? ` ${tx(reply.encryption.problem)}` : ''}
                {reply.encryption.unreadable.length ? t('set_unreadable', { n: reply.encryption.unreadable.length }) : ''}
              </p>
            )}
            {reply && !reply.canEdit && (
              <p className="mt-2 px-2 py-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900" role="note">
                {t('set_locked', { from: reply.requestFrom || t('set_otherAddress') })}{' '}
                {reply.inDocker ? t('set_lockedDocker') : t('set_lockedOther')}
              </p>
            )}
            {error && (
              <p className="mt-2 text-xs text-rose-700 dark:text-rose-400" role="alert">
                {error}
              </p>
            )}
            {!reply && !error && <p className="mt-3 text-sm text-slate-500">{t('c_loading')}</p>}
            {reply &&
              SECTIONS.filter((sec) => page.sections.includes(sec)).map((sec) => {
                const keys = reply.keys.filter((k) => (k.section || 'free_key') === sec);
                if (!keys.length) return null;
                return (
                  <div key={sec} id={`settings-section-${sec}`} className="mt-4">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t(`set_sec_${sec}`)}</h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t(`set_secNote_${sec}`)}</p>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {keys.map((k) => (
                        <KeyRow key={k.id} k={k} canEdit={reply.canEdit} onChanged={setReply} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            {reply && page.id === 'subscriptions' && (
              <Suspense fallback={<p className="mt-3 text-xs text-slate-500">{t('c_loading')}</p>}>
                <SubscriptionSeries canEdit={reply.canEdit} vendorSetting={reply.keys.find((k) => k.id === 'PAID_DATA_VENDOR')?.masked} />
              </Suspense>
            )}
          </section>
          )}
        </div>
      </div>
    </div>
  );
};
