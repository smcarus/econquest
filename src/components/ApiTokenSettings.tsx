import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Plus } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { MENU, type MenuT } from '../i18n/messages/menu';
import { SCOPES, type PublicTokenView, type Scope } from '../utils/apiTokenScopes';

/**
 * Menu > Settings > API tokens (console integration item 2). Make a named token with only the
 * scopes another system needs, copy its secret once, and revoke it when it is no longer used.
 * Lazy-loaded with Settings' other pages.
 */
const SCOPE_KEY: Record<Scope, Parameters<MenuT>[0]> = {
  'read:data': 'tk_scope_read_data',
  'read:council': 'tk_scope_read_council',
  'read:events': 'tk_scope_read_events',
  'write:holdings': 'tk_scope_write_holdings',
  'write:exclusions': 'tk_scope_write_exclusions',
  'run:scenarios': 'tk_scope_run_scenarios',
};

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const ApiTokenSettings: React.FC = () => {
  const t = useT(MENU);
  const tx = useTx();
  const [tokens, setTokens] = useState<PublicTokenView[] | null>(null);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(['read:data']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/api-tokens');
      const body = (await res.json().catch(() => ({}))) as { tokens?: PublicTokenView[]; error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setTokens(body.tokens || []);
    } catch (e) {
      setError(t('c_serverDown', { detail: e instanceof Error ? e.message : String(e) }));
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);

  const send = async (url: string, payload?: unknown) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload ?? {}) });
      const body = (await res.json().catch(() => ({}))) as { tokens?: PublicTokenView[]; secret?: string; error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setTokens(body.tokens || []);
      return body;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setSecret('');
    setCopied(false);
    const body = await send('/api/settings/api-tokens', { name, scopes });
    if (body?.secret) {
      setSecret(body.secret);
      setName('');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      /* the secret stays on screen to copy by hand */
    }
  };

  const toggle = (s: Scope) => setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="space-y-5" data-api-tokens="true">
      <p className="text-xs text-slate-600 dark:text-slate-400">{t('tk_intro')}</p>

      <div className="space-y-2">
        <label className="block text-xs">
          <span className="block text-slate-700 dark:text-slate-300">{t('tk_name')}</span>
          <input className="mt-1 w-full max-w-sm px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={name} maxLength={60} placeholder={t('tk_namePh')} onChange={(e) => setName(e.target.value)} data-token-name />
        </label>
        <fieldset className="text-xs">
          <legend className="text-slate-700 dark:text-slate-300">{t('tk_scopes')}</legend>
          <div className="mt-1 grid gap-1 sm:grid-cols-2">
            {SCOPES.map((s) => (
              <label key={s} className="inline-flex items-center gap-2">
                <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggle(s)} data-token-scope={s} />
                <span>
                  {t(SCOPE_KEY[s])} <code className="text-[11px] text-slate-500">{s}</code>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" className="ui-btn ui-btn-primary inline-flex items-center gap-1.5" disabled={busy || !name.trim() || scopes.length === 0} onClick={() => void create()}>
          <Plus className="w-3.5 h-3.5" aria-hidden /> {busy ? t('tk_creating') : t('tk_create')}
        </button>
        {secret && (
          <div className="p-3 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40" role="status" data-token-secret>
            <p className="text-xs text-slate-800 dark:text-slate-100">{t('tk_secretOnce')}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="text-xs break-all select-all">{secret}</code>
              <button type="button" className="ui-btn inline-flex items-center gap-1" onClick={() => void copy()}>
                <Copy className="w-3.5 h-3.5" aria-hidden /> {copied ? t('tk_copied') : t('tk_copy')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('tk_list')}</h4>
        {tokens === null ? (
          <p className="mt-1 text-xs text-slate-500">{error ? '' : t('c_loading')}</p>
        ) : tokens.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">{t('tk_none')}</p>
        ) : (
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {tokens.map((tk) => (
              <li key={tk.id} className="py-2 text-xs" data-token-row={tk.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className={`font-medium ${tk.active ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 line-through'}`}>
                    {tk.name} <code className="font-normal text-slate-500">{tk.hint}…</code>
                  </span>
                  {tk.active &&
                    (confirming === tk.id ? (
                      <button type="button" className="ui-btn ui-btn-danger" disabled={busy} onClick={() => void send(`/api/settings/api-tokens/${tk.id}/revoke`).then(() => setConfirming(null))}>
                        {t('tk_revokeNow')}
                      </button>
                    ) : (
                      <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirming(tk.id)}>
                        {t('tk_revoke')}
                      </button>
                    ))}
                </div>
                <p className="text-slate-500 dark:text-slate-400">{tk.scopes.join(', ')}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {t('tk_made', { when: when(tk.createdAt), who: tk.createdBy })} · {tk.revokedAt ? t('tk_revokedOn', { when: when(tk.revokedAt) }) : tk.lastUsedAt ? t('tk_lastUsed', { when: when(tk.lastUsedAt) }) : t('tk_neverUsed')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{t('tk_legacy')}</p>

      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-400" role="alert">
          {tx(error)}
        </p>
      )}
    </div>
  );
};

export default ApiTokenSettings;
