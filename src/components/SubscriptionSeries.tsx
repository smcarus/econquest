import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PAID_FREQS, type PaidFreq } from '../engine/paidData';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';
import { PANELS } from '../i18n/messages/panels';

/**
 * Menu > Settings > Your subscriptions, below the switch and sign-in details: the series you map
 * from your own paid data service (src/engine/paidData.ts, data plan G4). Shows codes, your labels,
 * counts and dates, never a figure. Loaded only when the page is opened.
 */

interface VendorInfo {
  id: string;
  name: string;
  plannedIn: string;
  adapterBuilt: boolean;
  memoryOnly: boolean;
  codeExample?: string;
}
interface MappingRow {
  id: string;
  vendor: string;
  vendorName: string;
  code: string;
  iso3: string;
  label: string;
  unit: string;
  freq: PaidFreq;
  active: boolean;
  count: number;
  first: string | null;
  last: string | null;
  status: string;
}
interface Reply {
  on: boolean;
  vendor: VendorInfo | null;
  vendors: VendorInfo[];
  mappings: MappingRow[];
  thisComputer: boolean;
  savedIn: string;
}

const FREQ_KEY: Record<PaidFreq, 'freq_daily' | 'freq_weekly' | 'freq_monthly' | 'freq_quarterly' | 'freq_annual'> = {
  daily: 'freq_daily',
  weekly: 'freq_weekly',
  monthly: 'freq_monthly',
  quarterly: 'freq_quarterly',
  annual: 'freq_annual',
};

const SubscriptionSeries: React.FC<{ canEdit: boolean; vendorSetting?: string }> = ({ canEdit, vendorSetting }) => {
  const t = useT(MENU);
  const p = useT(PANELS);
  const tx = useTx();
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ vendor: '', code: '', iso3: '', label: '', unit: '', freq: 'monthly' as PaidFreq });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/subscriptions');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = (await r.json()) as Reply;
      setReply(body);
      setForm((f) => (f.vendor ? f : { ...f, vendor: body.vendor?.id || body.vendors[0]?.id || '' }));
    } catch (e) {
      setError(t('c_serverDown', { detail: e instanceof Error ? e.message : String(e) }));
    }
  }, [t]);

  // Reload when the switch above changes, so the status line follows it.
  useEffect(() => {
    load();
  }, [load, vendorSetting]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/subscriptions/mappings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, iso3: form.iso3.trim().toUpperCase() }) });
      const body = (await r.json().catch(() => ({}))) as { error?: string; problems?: string[] };
      // Each problem is its own sentence, so each one is shown in the chosen language.
      if (!r.ok) throw new Error(body.problems?.length ? body.problems.map((x) => tx(x)).join(' ') : body.error || `HTTP ${r.status}`);
      setForm((f) => ({ ...f, code: '', label: '', unit: '' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError('');
    const r = await fetch(`/api/subscriptions/mappings/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) setError(((await r.json().catch(() => ({}))) as { error?: string }).error || `HTTP ${r.status}`);
    await load();
  };

  const vendorOf = (id: string) => reply?.vendors.find((v) => v.id === id);
  const example = vendorOf(form.vendor)?.codeExample || '';
  const field = 'mt-0.5 w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';

  return (
    <div className="mt-5" data-subscription-series="true">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('sub_title')}</h4>
      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{t('sub_intro')}</p>
      {!reply && !error && <p className="mt-2 text-xs text-slate-500">{t('c_loading')}</p>}
      {reply && (
        <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300" data-subscription-status="true">
          {reply.vendor ? (
            <p>
              {t('sub_on', { vendor: reply.vendor.name })}{' '}
              {!reply.vendor.adapterBuilt && t('sub_notBuilt', { vendor: reply.vendor.name, plan: reply.vendor.plannedIn })}{' '}
              {reply.vendor.memoryOnly && t('sub_memoryOnly', { vendor: reply.vendor.name })}
            </p>
          ) : (
            <p>{t('sub_off')}</p>
          )}
          {!reply.thisComputer && <p className="text-amber-800 dark:text-amber-300">{t('sub_notThisComputer')}</p>}
        </div>
      )}
      {reply && (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800" data-subscription-list="true">
          {reply.mappings.length === 0 && <li className="py-2 text-xs text-slate-500">{t('sub_none')}</li>}
          {reply.mappings.map((m) => (
            <li key={m.id} className="py-2 flex items-start justify-between gap-2" data-subscription-row={m.id}>
              <div className="min-w-0 text-xs">
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {m.label} <span className="font-normal text-slate-500">({m.iso3}, {tx(m.unit)}, {p(FREQ_KEY[m.freq])})</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {m.vendorName} · <code>{m.code}</code>
                  {m.count ? ` · ${t('sub_figures', { n: m.count, first: m.first ?? '', last: m.last ?? '' })}` : ''}
                </div>
                <div className={m.status === 'Ready' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>{tx(m.status)}</div>
              </div>
              {canEdit && (
                <button type="button" className="ui-btn ui-btn-ghost shrink-0" onClick={() => remove(m.id)} aria-label={t('sub_removeAria', { label: m.label })}>
                  <Trash2 className="w-3.5 h-3.5" aria-hidden /> {t('sub_remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {reply && canEdit && (
        <form onSubmit={add} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" data-subscription-add="true" aria-label={t('sub_add')}>
          <div className="sm:col-span-2 font-semibold text-slate-800 dark:text-slate-100">{t('sub_add')}</div>
          <label>
            {t('sub_vendor')}
            <select className={field} value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })}>
              {reply.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('sub_code')}
            <input className={field} value={form.code} placeholder={example} onChange={(e) => setForm({ ...form, code: e.target.value })} required maxLength={120} />
          </label>
          <label>
            {t('sub_country')}
            <input className={field} value={form.iso3} placeholder="USA" onChange={(e) => setForm({ ...form, iso3: e.target.value })} required maxLength={3} />
          </label>
          <label>
            {t('sub_label')}
            <input className={field} value={form.label} placeholder={t('sub_labelHint')} onChange={(e) => setForm({ ...form, label: e.target.value })} required maxLength={120} />
          </label>
          <label>
            {t('sub_unit')}
            <input className={field} value={form.unit} placeholder={t('sub_unitHint')} onChange={(e) => setForm({ ...form, unit: e.target.value })} required maxLength={120} />
          </label>
          <label>
            {t('sub_freq')}
            <select className={field} value={form.freq} onChange={(e) => setForm({ ...form, freq: e.target.value as PaidFreq })}>
              {PAID_FREQS.map((f) => (
                <option key={f} value={f}>
                  {p(FREQ_KEY[f])}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="ui-btn" disabled={busy}>
              {t('sub_addBtn')}
            </button>
          </div>
        </form>
      )}
      {reply && !canEdit && <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{t('sub_cantEdit')}</p>}
      {error && (
        <p className="mt-2 text-xs text-rose-700 dark:text-rose-400" role="alert">
          {tx(error)}
        </p>
      )}
      {reply && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t('sub_savedIn', { where: reply.savedIn })}</p>}
    </div>
  );
};

export default SubscriptionSeries;
