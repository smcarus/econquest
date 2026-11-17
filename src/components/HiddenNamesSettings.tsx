import React, { useCallback, useEffect, useState } from 'react';
import { EyeOff } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';
import { HIDDEN_KINDS, type HiddenKind, type HiddenView } from '../utils/exclusions';
import { HIDDEN_CHANGED_EVENT } from '../utils/hiddenNamesClient';

/**
 * Menu > Settings > Hidden names (console integration item 8). Countries and securities on the
 * list never appear in the app or its API; this page shows only how many there are, because the
 * app keeps fingerprints, not names. Lazy-loaded with Settings' other pages.
 */
const HiddenNamesSettings: React.FC = () => {
  const t = useT(MENU);
  const tx = useTx();
  const [view, setView] = useState<HiddenView | null>(null);
  const [kind, setKind] = useState<HiddenKind>('country');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const kindLabel = (k: HiddenKind) => (k === 'country' ? t('hn_k_country') : k === 'ticker' ? t('hn_k_ticker') : k === 'entity_id' ? t('hn_k_entity') : k.toUpperCase());

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/settings/hidden-names');
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setView(body as HiddenView);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const send = async (path: string, payload: unknown) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((body.errors && body.errors[0]) || body.error || body.message || `HTTP ${r.status}`);
      setView({ count: body.count, byKind: body.byKind, fingerprints: body.fingerprints });
      window.dispatchEvent(new Event(HIDDEN_CHANGED_EVENT));
      return body as { added?: number; removed?: number };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const hide = async () => {
    const r = await send('/api/settings/hidden-names', { names: [{ kind, value }] });
    if (r) {
      setValue('');
      setNote(t('hn_added', { n: r.added ?? 0 }));
    }
  };
  const show = async () => {
    const r = await send('/api/settings/hidden-names/remove', { names: [{ kind, value }] });
    if (r) {
      setValue('');
      setNote(r.removed ? t('hn_removed', { n: r.removed }) : t('hn_notOn'));
    }
  };
  const clear = async () => {
    if (await send('/api/settings/hidden-names/clear', {})) setConfirming(false);
  };

  const count = view?.count ?? 0;
  const parts = view ? HIDDEN_KINDS.filter((k) => view.byKind[k]).map((k) => `${kindLabel(k)}: ${view.byKind[k]}`) : [];

  return (
    <div className="space-y-4" data-hidden-names="true">
      <p className="text-xs text-slate-600 dark:text-slate-400">{t('hn_intro')}</p>

      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 inline-flex items-center gap-1.5" data-hidden-count={count}>
        <EyeOff className="w-4 h-4" aria-hidden />
        {view === null ? t('c_loading') : count === 0 ? t('hn_countNone') : count === 1 ? t('hn_countOne') : t('hn_countMany', { n: count })}
        {parts.length > 0 && <span className="font-normal text-xs text-slate-500"> ({parts.join(', ')})</span>}
      </p>

      <div className="flex flex-wrap items-end gap-2 text-xs">
        <label className="block">
          <span className="block text-slate-700 dark:text-slate-300">{t('hn_kind')}</span>
          <select className="mt-1 px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={kind} onChange={(e) => setKind(e.target.value as HiddenKind)} data-hidden-kind>
            {HIDDEN_KINDS.map((k) => (
              <option key={k} value={k}>
                {kindLabel(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-slate-700 dark:text-slate-300">{t('hn_value')}</span>
          {/* autoComplete off: the browser must not remember hidden names either. */}
          <input className="mt-1 w-56 px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={value} maxLength={128} autoComplete="off" spellCheck={false} placeholder={t('hn_valuePh')} onChange={(e) => setValue(e.target.value)} data-hidden-value />
        </label>
        <button type="button" className="ui-btn ui-btn-primary" disabled={busy || !value.trim()} onClick={() => void hide()}>
          {t('hn_add')}
        </button>
        <button type="button" className="ui-btn" disabled={busy || !value.trim()} onClick={() => void show()}>
          {t('hn_remove')}
        </button>
      </div>

      {note && (
        <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">
          {note}
        </p>
      )}
      {error && (
        <p className="text-xs text-rose-700 dark:text-rose-400" role="alert">
          {tx(error)}
        </p>
      )}

      {count > 0 &&
        (confirming ? (
          <button type="button" className="ui-btn ui-btn-danger" disabled={busy} onClick={() => void clear()}>
            {t('hn_clearNow')}
          </button>
        ) : (
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setConfirming(true)}>
            {t('hn_clear')}
          </button>
        ))}

      <p className="text-xs text-slate-500 dark:text-slate-400">{t('hn_audit')}</p>
    </div>
  );
};

export default HiddenNamesSettings;
