import React, { useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';
import {
  ASSET_CLASS_LABEL,
  HOLDINGS_TEMPLATE_CSV,
  type CountryLookup,
  type Holding,
  type HoldingAssetClass,
  type HoldingSide,
  holdingsToCsv,
  newHoldingId,
  parseHoldingsCsv,
} from '../utils/holdings';
import { idsLabel } from '../utils/securityIds';

interface HoldingsPanelProps {
  holdings: Holding[];
  countries: CountryLookup[];
  onChange: (next: Holding[]) => void;
  onClose: () => void;
  /** Positions left out because they are on the hidden-names list (only the count shows). */
  hiddenCount?: number;
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const inputCls =
  'px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-0';

export const HoldingsPanel: React.FC<HoldingsPanelProps> = ({ holdings, countries, onChange, onClose, hiddenCount = 0 }) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pasted, setPasted] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>(holdings.length ? 'append' : 'replace');
  const [confirmClear, setConfirmClear] = useState(false);
  const [messages, setMessages] = useState<{ ok?: string; errors: string[] }>({ errors: [] });
  const t = useT(TOOLS);
  const tx = useTx();
  const [draft, setDraft] = useState({
    iso3: countries[0]?.iso3 || '',
    instrument: '',
    assetClass: 'HC_BOND' as HoldingAssetClass,
    side: 'LONG' as HoldingSide,
    notional: '',
    duration: '',
  });

  const importText = (text: string) => {
    const { holdings: parsed, errors } = parseHoldingsCsv(text, countries);
    if (parsed.length) onChange(mode === 'replace' ? parsed : [...holdings, ...parsed]);
    setMessages({
      ok: parsed.length ? t('ho_imported', { n: parsed.length }) : undefined,
      errors: errors.slice(0, 8).concat(errors.length > 8 ? [t('ho_more', { n: errors.length - 8 })] : []),
    });
    if (parsed.length) setPasted('');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    importText(await f.text());
    if (fileRef.current) fileRef.current.value = '';
  };

  const addDraft = () => {
    const n = Number(draft.notional);
    const d = Number(draft.duration);
    if (!draft.iso3 || !Number.isFinite(n) || n <= 0) {
      setMessages({ errors: [t('ho_needNotional')] });
      return;
    }
    onChange([
      ...holdings,
      {
        id: newHoldingId(),
        iso3: draft.iso3,
        instrument: draft.instrument.trim() || t('ho_position', { iso3: draft.iso3 }),
        assetClass: draft.assetClass,
        side: draft.side,
        notionalUsdMm: n,
        durationYears: draft.duration && Number.isFinite(d) && d > 0 ? d : undefined,
      },
    ]);
    setDraft({ ...draft, instrument: '', notional: '', duration: '' });
    setMessages({ ok: t('ho_added'), errors: [] });
  };

  return (
    <section className="ui-panel" aria-label={t('ho_title')}>
      <header className="ui-panel-header flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="ui-section-title">{t('ho_title')}</h2>
          <p className="ui-label">{t('ho_intro')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="ui-btn" onClick={() => downloadText('econquest-holdings-template.csv', HOLDINGS_TEMPLATE_CSV)}>
            <Download className="w-3.5 h-3.5" /> {t('ho_template')}
          </button>
          {holdings.length > 0 && (
            <button type="button" className="ui-btn" onClick={() => downloadText('econquest-holdings.csv', holdingsToCsv(holdings))}>
              <Download className="w-3.5 h-3.5" /> {t('ho_export')}
            </button>
          )}
          <button type="button" className="ui-btn ui-btn-ghost" onClick={onClose}>
            {t('ho_done')}
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="ui-section-title">{t('ho_import')}</div>
            <p className="ui-label">
              {t('ho_columns')}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="ui-label inline-flex items-center gap-1.5">
                <input type="radio" name="hold-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} /> {t('ho_replace')}
              </label>
              <label className="ui-label inline-flex items-center gap-1.5">
                <input type="radio" name="hold-mode" checked={mode === 'append'} onChange={() => setMode('append')} /> {t('ho_append')}
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                className="sr-only"
                id="holdings-file"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <label htmlFor="holdings-file" className="ui-btn ui-btn-primary cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> {t('ho_upload')}
              </label>
            </div>
            <label htmlFor="holdings-paste" className="ui-label block">
              {t('ho_paste')}
            </label>
            <textarea
              id="holdings-paste"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={4}
              placeholder={HOLDINGS_TEMPLATE_CSV}
              className={`${inputCls} w-full font-code text-xs`}
            />
            <button type="button" className="ui-btn" disabled={!pasted.trim()} onClick={() => importText(pasted)}>
              {t('ho_importPasted')}
            </button>
          </div>

          <div className="space-y-2">
            <div className="ui-section-title">{t('ho_addOne')}</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="ui-label space-y-0.5">
                <span className="block">{t('ho_country')}</span>
                <select className={`${inputCls} w-full`} value={draft.iso3} onChange={(e) => setDraft({ ...draft, iso3: e.target.value })}>
                  {countries.map((c) => (
                    <option key={c.iso3} value={c.iso3}>
                      {c.countryName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ui-label space-y-0.5">
                <span className="block">{t('ho_type')}</span>
                <select
                  className={`${inputCls} w-full`}
                  value={draft.assetClass}
                  onChange={(e) => setDraft({ ...draft, assetClass: e.target.value as HoldingAssetClass })}
                >
                  {(Object.keys(ASSET_CLASS_LABEL) as HoldingAssetClass[]).map((k) => (
                    <option key={k} value={k}>
                      {tx(ASSET_CLASS_LABEL[k])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ui-label space-y-0.5 col-span-2">
                <span className="block">{t('ho_instrument')}</span>
                <input
                  className={`${inputCls} w-full`}
                  value={draft.instrument}
                  placeholder={t('ho_instrumentPh')}
                  onChange={(e) => setDraft({ ...draft, instrument: e.target.value })}
                />
              </label>
              <label className="ui-label space-y-0.5">
                <span className="block">{t('ho_side')}</span>
                <select className={`${inputCls} w-full`} value={draft.side} onChange={(e) => setDraft({ ...draft, side: e.target.value as HoldingSide })}>
                  <option value="LONG">{t('ho_long')}</option>
                  <option value="SHORT">{t('ho_short')}</option>
                </select>
              </label>
              <label className="ui-label space-y-0.5">
                <span className="block">{t('ho_notional')}</span>
                <input
                  className={`${inputCls} w-full`}
                  inputMode="decimal"
                  value={draft.notional}
                  onChange={(e) => setDraft({ ...draft, notional: e.target.value })}
                />
              </label>
              <label className="ui-label space-y-0.5">
                <span className="block">{t('ho_duration')}</span>
                <input
                  className={`${inputCls} w-full`}
                  inputMode="decimal"
                  value={draft.duration}
                  onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
                />
              </label>
              <div className="flex items-end">
                <button type="button" className="ui-btn w-full" onClick={addDraft}>
                  <Plus className="w-3.5 h-3.5" /> {t('ho_add')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {(messages.ok || messages.errors.length > 0) && (
          <div role="status" className="space-y-1">
            {messages.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">{messages.ok}</p>}
            {messages.errors.map((e) => (
              <p key={e} className="text-sm text-rose-700 dark:text-rose-300">
                {tx(e)}
              </p>
            ))}
          </div>
        )}

        {hiddenCount > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400" data-holdings-hidden={hiddenCount}>
            {hiddenCount === 1 ? t('ho_hiddenOne') : t('ho_hiddenMany', { n: hiddenCount })}
          </p>
        )}

        {holdings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="ui-label text-left pb-1">{t('ho_positions', { n: holdings.length })}</caption>
              <thead>
                <tr className="ui-label text-left border-b border-slate-100 dark:border-slate-800">
                  <th className="py-1.5 pr-3 font-normal">{t('ho_country')}</th>
                  <th className="py-1.5 pr-3 font-normal">{t('ho_instrument')}</th>
                  <th className="py-1.5 pr-3 font-normal">{t('ho_type')}</th>
                  <th className="py-1.5 pr-3 font-normal">{t('ho_side')}</th>
                  <th className="py-1.5 pr-3 font-normal text-right">{t('ho_notionalCol')}</th>
                  <th className="py-1.5 pr-3 font-normal text-right">{t('ho_durationCol')}</th>
                  <th className="py-1.5 font-normal" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.id} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{countries.find((c) => c.iso3 === h.iso3)?.countryName || h.iso3}</td>
                    <td className="py-1.5 pr-3">
                      {h.instrument}
                      {idsLabel(h) && <span className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 break-all">{idsLabel(h)}</span>}
                      {h.fromName && <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t('ho_fromApi', { name: h.fromName })}</span>}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">{tx(ASSET_CLASS_LABEL[h.assetClass])}</td>
                    <td className="py-1.5 pr-3">{h.side === 'LONG' ? t('ho_long') : t('ho_short')}</td>
                    <td className="py-1.5 pr-3 text-right ui-num">{h.notionalUsdMm.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-1.5 pr-3 text-right ui-num">{h.durationYears ? h.durationYears.toFixed(1) : '–'}</td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost"
                        aria-label={t('ho_remove', { name: h.instrument })}
                        onClick={() => onChange(holdings.filter((x) => x.id !== h.id))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="ui-btn ui-btn-ghost mt-2 text-rose-700 dark:text-rose-300"
              onClick={() => {
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                onChange([]);
                setConfirmClear(false);
              }}
              onBlur={() => setConfirmClear(false)}
            >
              {confirmClear ? t('ho_clearConfirm') : t('ho_clear')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
