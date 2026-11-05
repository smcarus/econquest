import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cpu, ExternalLink, Eye, EyeOff, KeyRound, Settings2, X, XCircle } from 'lucide-react';
import { STATE_LABEL, isFailure, type ConnectionResult } from '../utils/connectionCheck';
import type { ApiKeyStatus } from '../utils/userSettings';

/**
 * Settings (Menu > Settings, or Cmd/Ctrl + comma). The "Data API keys" section lets you paste your
 * own key for a data source instead of editing .env. Keys are saved by the app server on this
 * computer only (data/local/settings.json), win over .env, and come back to the browser masked.
 * Each key can be tested before it is saved; the test is the same as the Data connections check.
 */

/** Any part of the app can open Settings with window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT)). */
export const OPEN_SETTINGS_EVENT = 'econquest:open-settings';

interface KeysReply {
  keys: ApiKeyStatus[];
  canEdit: boolean;
  savedIn: string;
}

const SOURCE_LABEL: Record<ApiKeyStatus['source'], string> = {
  app: 'Saved in Settings',
  env: 'From .env',
  none: 'Not set',
};

function CheckLine({ check }: { check: ConnectionResult }) {
  const ok = check.state === 'connected';
  const bad = isFailure(check.state) || check.state === 'needs_setup';
  const tone = ok ? 'text-emerald-700 dark:text-emerald-400' : bad ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400';
  return (
    <div className={`mt-2 flex items-start gap-1.5 text-xs ${tone}`} role="status" data-key-check={check.state}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden /> : bad ? <XCircle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden /> : null}
      <span>
        <span className="font-medium">{STATE_LABEL[check.state]}:</span> {ok && check.sample ? check.sample : check.detail}
      </span>
    </div>
  );
}

const KeyRow: React.FC<{ k: ApiKeyStatus; canEdit: boolean; onChanged: (r: KeysReply) => void }> = ({ k, canEdit, onChanged }) => {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<'' | 'test' | 'save' | 'remove'>('');
  const [error, setError] = useState('');
  const [check, setCheck] = useState<ConnectionResult | null>(null);
  const inputId = `settings-key-${k.id}`;

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
      if (!res.ok) throw new Error(body?.error || `The app server answered HTTP ${res.status}.`);
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
          {k.label}
        </label>
        <span className={k.source === 'none' ? 'ui-badge' : 'ui-badge ui-badge-positive'}>
          {SOURCE_LABEL[k.source]}
          {k.masked ? ` ${k.masked}` : ''}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {k.provider}. {k.feeds} {k.withoutIt}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {k.getKeySteps}{' '}
        <a href={k.getKeyUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 hover:underline">
          How to get a key <ExternalLink className="w-3 h-3" aria-hidden />
        </a>
      </p>
      {k.source === 'app' && k.envAlsoSet && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">.env also has a key. The one saved here is used; remove it here to go back to .env.</p>
      )}

      <form
        className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && canEdit && !busy) call('save');
        }}
      >
        <div className="relative flex-1 min-w-[14rem]">
          <input
            id={inputId}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={k.source === 'none' ? 'Paste your key' : 'Paste a new key to replace it'}
            autoComplete="off"
            spellCheck={false}
            disabled={!canEdit}
            className="w-full px-2 py-1.5 pr-8 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide key' : 'Show key'}
            title={show ? 'Hide key' : 'Show key'}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button type="button" className="ui-btn" disabled={!canEdit || !!busy || (!value.trim() && k.source === 'none')} onClick={() => call('test')}>
          {busy === 'test' ? 'Testing…' : value.trim() ? 'Test' : 'Test current key'}
        </button>
        <button type="submit" className="ui-btn ui-btn-primary" disabled={!canEdit || !!busy || !value.trim()}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </button>
        {k.source === 'app' && (
          <button type="button" className="ui-btn ui-btn-danger" disabled={!canEdit || !!busy} onClick={() => call('remove')}>
            {busy === 'remove' ? 'Removing…' : 'Remove'}
          </button>
        )}
      </form>
      {error && (
        <div className="mt-2 text-xs text-rose-700 dark:text-rose-400" role="alert">
          {error}
        </div>
      )}
      {check && <CheckLine check={check} />}
    </li>
  );
};

export const SettingsDialog: React.FC<{ isOpen: boolean; onClose: () => void; onOpenAiModel?: () => void }> = ({ isOpen, onClose, onOpenAiModel }) => {
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
      setError(`The app server did not answer (${e instanceof Error ? e.message : String(e)}).`);
    }
  }, []);

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
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="settings-title" className="ui-title inline-flex items-center gap-2">
            <Settings2 className="w-4 h-4" aria-hidden /> Settings
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close settings" className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row min-h-0 flex-1">
          <nav aria-label="Settings sections" className="sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-800 p-2 flex sm:flex-col gap-1">
            <button type="button" aria-current="page" className="ui-tab inline-flex items-center gap-2 text-left" aria-pressed="true">
              <KeyRound className="w-3.5 h-3.5" aria-hidden /> Data API keys
            </button>
            {onOpenAiModel && (
              <button
                type="button"
                className="ui-tab inline-flex items-center gap-2 text-left"
                onClick={() => {
                  onClose();
                  onOpenAiModel();
                }}
              >
                <Cpu className="w-3.5 h-3.5" aria-hidden /> AI model…
              </button>
            )}
          </nav>

          <section className="flex-1 min-w-0 overflow-y-auto px-4 py-3" aria-labelledby="settings-keys-title">
            <h3 id="settings-keys-title" className="ui-section-title">Data API keys</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Your own keys for data sources. They are saved on this computer only{reply ? ` (${reply.savedIn})` : ''}, sent only to the source they belong to, and shown here masked. A key
              saved here is used instead of the same key in .env.
            </p>
            {reply && !reply.canEdit && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400" role="note">
                Keys can only be changed from the computer running the app. For Docker, set SETTINGS_ALLOW_REMOTE="true" in .env.
              </p>
            )}
            {error && (
              <p className="mt-2 text-xs text-rose-700 dark:text-rose-400" role="alert">
                {error}
              </p>
            )}
            {!reply && !error && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
            {reply && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {reply.keys.map((k) => (
                  <KeyRow key={k.id} k={k} canEdit={reply.canEdit} onChanged={setReply} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
