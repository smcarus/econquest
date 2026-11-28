import React, { useCallback, useEffect, useState } from 'react';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';
import { FEATURE_IDS, FEATURES_CHANGED_EVENT, type FeatureId, type FeatureState } from '../utils/featureSwitches';

type Reply = Record<FeatureId, FeatureState> & { canChange: boolean; by?: string };

/**
 * Menu > Settings > Quests and classes: switch Quests and Classes on or off for this copy of the app
 * (src/utils/featureSwitches.ts). A choice here wins over .env; "Follow .env" removes it. Only the
 * computer running the app, or an administrator when sign-in is on, can change them. Lazy-loaded.
 */
const FeatureSettings: React.FC = () => {
  const t = useT(MENU);
  const tx = useTx();
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState<FeatureId | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/settings/features');
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setReply(body as Reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (id: FeatureId, value: 'on' | 'off' | 'env') => {
    setBusy(id);
    setError('');
    setNote('');
    try {
      const r = await fetch('/api/settings/features', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [id]: value }) });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
      setReply(body as Reply);
      setNote(t('fs_saved'));
      window.dispatchEvent(new Event(FEATURES_CHANGED_EVENT));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const st = (on: boolean) => (on ? t('fs_stOn') : t('fs_stOff'));

  return (
    <div className="space-y-4 text-sm" data-feature-settings>
      <p className="text-slate-600 dark:text-slate-300">{t('fs_intro')}</p>
      {reply && !reply.canChange && <p className="text-amber-800 dark:text-amber-300" data-feature-locked>{t('fs_locked')}</p>}
      {reply &&
        FEATURE_IDS.map((id) => {
          const s = reply[id];
          const current = s.source === 'env' ? 'env' : s.on ? 'on' : 'off';
          return (
            <fieldset key={id} className="border border-slate-200 dark:border-slate-800 p-3" data-feature={id} disabled={!reply.canChange || busy !== null}>
              <legend className="px-1 font-medium">{id === 'quests' ? t('fs_quests') : t('fs_classes')}</legend>
              <p className="text-xs text-slate-600 dark:text-slate-400">{id === 'quests' ? t('fs_questsHelp') : t('fs_classesHelp')}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {(['on', 'off', 'env'] as const).map((v) => (
                  <label key={v} className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name={`feature-${id}`} value={v} checked={current === v} onChange={() => void choose(id, v)} data-feature-choice={`${id}-${v}`} />
                    {v === 'on' ? t('fs_on') : v === 'off' ? t('fs_off') : t('fs_env', { state: st(s.envOn) })}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400" data-feature-now={s.on ? 'on' : 'off'}>
                {s.source === 'app' ? t('fs_nowApp', { state: st(s.on) }) : t('fs_nowEnv', { state: st(s.on) })}
              </p>
            </fieldset>
          );
        })}
      {reply?.by && <p className="text-xs text-slate-500 dark:text-slate-400">{t('fs_last', { by: reply.by })}</p>}
      <p aria-live="polite" className="text-xs text-emerald-700 dark:text-emerald-400">{note}</p>
      {error && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{tx(error)}</p>}
      {!reply && !error && <p className="text-xs text-slate-500">{t('c_loading')}</p>}
    </div>
  );
};

export default FeatureSettings;
