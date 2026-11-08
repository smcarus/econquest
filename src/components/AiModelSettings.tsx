import { isSmallModel, largestModel } from '../utils/refereeModel';
import React, { useState } from 'react';
import { CheckCircle2, Loader2, Search, XCircle } from 'lucide-react';
import type { AIRuntimeConfig } from '../types/council';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

/**
 * Settings > AI model: the plain version of the AI setup. Which model writes the council's
 * summaries, where Ollama runs, which installed model to use, and a Test that goes through the
 * same path (and waits as long) as the chat summary. The full setup stays under "Advanced".
 */

type Provider = AIRuntimeConfig['providerMode'];

const PROVIDERS = ['ollama', 'gemini', 'hybrid'] as const;

const PLACES = [
  { url: 'http://localhost:11434', title: 'ai_place_local' },
  { url: 'http://host.docker.internal:11434', title: 'ai_place_docker' },
  { url: 'http://ollama:11434', title: 'ai_place_bundled' },
] as const;

interface OllamaStatus {
  connected: boolean;
  endpoint: string;
  models: string[];
}

interface TryReply {
  ok: boolean;
  ms: number;
  provider?: string;
  reason?: string;
}

const usesOllama = (p: Provider) => p === 'ollama' || p === 'hybrid';

export const AiModelSettings: React.FC<{
  config: AIRuntimeConfig;
  onChange: (next: AIRuntimeConfig) => void;
  /** The Gemini key row(s), drawn by Settings so the key stays in one place. */
  geminiKey?: React.ReactNode;
  geminiKeySet?: boolean;
  onOpenAdvanced?: () => void;
}> = ({ config, onChange, geminiKey, geminiKeySet, onOpenAdvanced }) => {
  const t = useT(MENU);
  const tx = useTx();
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [finding, setFinding] = useState(false);
  const [tryReply, setTryReply] = useState<TryReply | null>(null);
  const [refereeReply, setRefereeReply] = useState<TryReply | null>(null);
  const [trying, setTrying] = useState(false);

  const update = (patch: Partial<AIRuntimeConfig>) => {
    const next = { ...config, ...patch };
    onChange(next);
    setTryReply(null);
    // The server keeps a copy for steps that run without the browser's settings.
    void fetch('/api/ai/runtime-config-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runtimeConfig: patch }),
    }).catch(() => undefined);
  };

  const findOllama = async () => {
    setFinding(true);
    try {
      const r = await fetch('/api/ai/ollama-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ollamaBaseUrl: config.ollamaBaseUrl }),
      });
      const s = (await r.json()) as OllamaStatus;
      setStatus(s);
      // Use the address that answered, so the app does not try a dead one first every time.
      if (s.connected && s.endpoint && s.endpoint !== config.ollamaBaseUrl) update({ ollamaBaseUrl: s.endpoint });
    } catch {
      setStatus({ connected: false, endpoint: config.ollamaBaseUrl, models: [] });
    } finally {
      setFinding(false);
    }
  };

  const tryOne = async (referee: boolean): Promise<TryReply> => {
    try {
      const r = await fetch('/api/ai/try-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtimeConfig: config, ...(referee ? { referee: true } : {}) }),
      });
      return r.ok ? ((await r.json()) as TryReply) : { ok: false, ms: 0, reason: t('ai_serverHttp', { status: r.status }) };
    } catch {
      return { ok: false, ms: 0, reason: t('ai_serverDown') };
    }
  };
  /** Tests the fast model, then (with Ollama) the referee model, the way the council calls each. */
  const tryModel = async () => {
    setTrying(true);
    setTryReply(null);
    setRefereeReply(null);
    try {
      setTryReply(await tryOne(false));
      if (config.providerMode !== 'gemini') setRefereeReply(await tryOne(true));
    } finally {
      setTrying(false);
    }
  };

  const installed = status?.connected ? status.models : [];
  const modelChoices = (current: string) => (installed.includes(current) || !current ? installed : [current, ...installed]);
  const place = PLACES.find((p) => p.url === config.ollamaBaseUrl);

  return (
    <div className="space-y-5" data-settings-ai="true">
      <div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('ai_which')}</h4>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {t('ai_whichNote')}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('ai_aria')}>
          {PROVIDERS.map((p) => {
            const on = config.providerMode === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => update({ providerMode: p })}
                className={`text-left border p-2.5 ${on ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}
              >
                <div className="text-sm font-medium text-slate-900 dark:text-white">{p === 'gemini' ? 'Google Gemini' : t(`ai_p_${p}`)}</div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{t(`ai_pn_${p}`)}</div>
              </button>
            );
          })}
        </div>
        {config.providerMode === 'openai_compatible' && (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('ai_openaiNote')}</p>
        )}
      </div>

      {usesOllama(config.providerMode) && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Ollama</h4>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[16rem] text-xs text-slate-600 dark:text-slate-400">
              {t('ai_where')}
              <select
                className="mt-1 block w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                value={place ? place.url : 'custom'}
                onChange={(e) => e.target.value !== 'custom' && update({ ollamaBaseUrl: e.target.value })}
              >
                {PLACES.map((p) => (
                  <option key={p.url} value={p.url}>
                    {t(p.title)}
                  </option>
                ))}
                <option value="custom">{t('ai_another', { url: place ? '' : config.ollamaBaseUrl })}</option>
              </select>
            </label>
            <button type="button" className="ui-btn inline-flex items-center gap-1.5" onClick={findOllama} disabled={finding} data-settings-find-ollama="true">
              {finding ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Search className="w-3.5 h-3.5" aria-hidden />} {t('ai_find')}
            </button>
          </div>
          {!place && (
            <input
              aria-label={t('ai_addrAria')}
              className="block w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
              value={config.ollamaBaseUrl}
              onChange={(e) => update({ ollamaBaseUrl: e.target.value.trim() })}
            />
          )}
          {status && (
            <p className={`text-xs ${status.connected ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} role="status">
              {status.connected
                ? `${t(status.models.length === 1 ? 'ai_found1' : 'ai_foundN', { url: status.endpoint, n: status.models.length })}${status.models.length ? '' : t('ai_pullHint')}`
                : t('ai_notFound')}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { key: 'ollamaQuickModel', label: t('ai_fast'), hint: t('ai_fastHint') },
                { key: 'ollamaDeepModel', label: t('ai_ref'), hint: t('ai_refHint') },
              ] as const
            ).map((m) => (
              <label key={m.key} className="text-xs text-slate-600 dark:text-slate-400">
                {m.label}
                {installed.length ? (
                  <select
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                    value={config[m.key]}
                    onChange={(e) => update({ [m.key]: e.target.value } as Partial<AIRuntimeConfig>)}
                  >
                    {modelChoices(config[m.key]).map((name) => (
                      <option key={name} value={name}>
                        {name}
                        {installed.includes(name) ? '' : t('ai_notDownloaded')}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="mt-1 block w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                    value={config[m.key]}
                    onChange={(e) => update({ [m.key]: e.target.value.trim() } as Partial<AIRuntimeConfig>)}
                  />
                )}
                <span className="mt-0.5 block text-slate-500">{m.hint}</span>
              </label>
            ))}
          </div>
          {isSmallModel(config.ollamaDeepModel) && (
            <p className="text-xs text-amber-800 dark:text-amber-300 flex flex-wrap items-center gap-2" data-settings-small-referee="true">
              <span>{t('ai_small', { model: config.ollamaDeepModel })}</span>
              {largestModel(installed) && (
                <button type="button" className="ui-btn" onClick={() => update({ ollamaDeepModel: largestModel(installed)! })}>
                  {t('ai_use', { model: largestModel(installed)! })}
                </button>
              )}
            </p>
          )}
          {!installed.length && <p className="text-xs text-slate-500 dark:text-slate-400">{t('ai_pressFind')}</p>}
        </div>
      )}

      {(config.providerMode === 'gemini' || config.providerMode === 'hybrid') && (
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('ai_geminiKey')}</h4>
          {geminiKeySet === false && config.providerMode === 'gemini' && (
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">{t('ai_noGemini')}</p>
          )}
          {geminiKey}
        </div>
      )}

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="ui-btn ui-btn-primary inline-flex items-center gap-1.5" onClick={tryModel} disabled={trying} data-settings-try-model="true">
            {trying && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />} {t('ai_test')}
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {trying ? t('ai_asking') : t('ai_testNote')}
          </span>
        </div>
        {tryReply && (
          <p className={`mt-2 text-xs inline-flex items-start gap-1.5 ${tryReply.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} role="status" data-settings-try-result={tryReply.ok ? 'ok' : 'failed'}>
            {tryReply.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden /> : <XCircle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />}
            {tryReply.ok
              ? t('ai_fastOk', { provider: tryReply.provider || '', s: Math.max(1, Math.round(tryReply.ms / 1000)) })
              : t('ai_fastBad', { reason: tx(tryReply.reason || '') })}
          </p>
        )}
        {refereeReply && (
          <p className={`mt-1 text-xs flex items-start gap-1.5 ${refereeReply.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} role="status" data-settings-try-referee={refereeReply.ok ? 'ok' : 'failed'}>
            {refereeReply.ok ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden /> : <XCircle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden />}
            {refereeReply.ok
              ? t('ai_refOk', { provider: refereeReply.provider || '', s: Math.max(1, Math.round(refereeReply.ms / 1000)) })
              : t('ai_refBad', { reason: tx(refereeReply.reason || '') })}
          </p>
        )}
      </div>

      {onOpenAdvanced && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('ai_advanced', { link: '\u0000' }).split('\u0000')[0]}
          <button type="button" className="text-blue-700 dark:text-blue-300 underline" onClick={onOpenAdvanced}>
            {t('ai_advancedLink')}
          </button>
          {t('ai_advanced', { link: '\u0000' }).split('\u0000')[1]}
        </p>
      )}
    </div>
  );
};
