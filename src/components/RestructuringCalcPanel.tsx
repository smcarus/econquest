import React, { useMemo, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Scissors } from 'lucide-react';
import { RC_MAX_RATES, RC_METHOD, RC_REFERENCES, rcCsv, rcSentence, restructuringCalc, type RcField, type RcSide } from '../utils/restructuringCalc';
import { explainInChat } from '../utils/explainHandoff';
import { useT } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Debt restructuring calculator (G29, src/utils/restructuringCalc.ts):
 * the user types the old and new bond terms and up to three discount rates; the panel shows present
 * values, the NPV haircut (Sturzenegger-Zettelmeyer) and the market haircut, year-by-year payments
 * and a CSV. Every field starts blank. Nothing is read from the server.
 */

type Text = Record<string, string>;
const FIELDS: Array<{ key: RcField; label: 'rc_face' | 'rc_coupon' | 'rc_years' | 'rc_grace' }> = [
  { key: 'face', label: 'rc_face' },
  { key: 'couponPct', label: 'rc_coupon' },
  { key: 'years', label: 'rc_years' },
  { key: 'graceYears', label: 'rc_grace' },
];
const SIDES: Array<{ key: RcSide; label: 'rc_old' | 'rc_new' }> = [
  { key: 'oldBond', label: 'rc_old' },
  { key: 'newBond', label: 'rc_new' },
];
const input = 'w-24 px-1.5 py-0.5 tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';
const num = (s: string | undefined): number | null => {
  const t = (s ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

export const RestructuringCalcPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [text, setText] = useState<Text>({});
  const [showFlows, setShowFlows] = useState(false);
  const t = useT(PANELS);

  const out = useMemo(
    () =>
      restructuringCalc({
        oldBond: Object.fromEntries(FIELDS.map((f) => [f.key, num(text[`oldBond.${f.key}`])])),
        newBond: Object.fromEntries(FIELDS.map((f) => [f.key, num(text[`newBond.${f.key}`])])),
        ratesPct: Array.from({ length: RC_MAX_RATES }, (_, i) => num(text[`rate.${i}`])),
      }),
    [text]
  );
  const ok = out.ok ? out : null;
  const set = (k: string, v: string) => setText((x) => ({ ...x, [k]: v }));
  const fieldName = (k: string) => {
    const [side, f] = k.split('.');
    if (side === 'rate') return t('rc_rateN', { n: Number(f) + 1 });
    const s = SIDES.find((x) => x.key === side);
    const l = FIELDS.find((x) => x.key === f);
    return s && l ? `${t(s.label)}: ${t(l.label)}` : k;
  };
  const anyTyped = Object.values(text).some((v) => v.trim() !== '');

  const download = () => {
    if (!ok) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rcCsv(ok)], { type: 'text/csv;charset=utf-8' }));
    a.download = 'restructuring-calculator.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <section className="ui-panel" data-restructuring-calc="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Scissors className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('rc_title')}
          <ValidationBadge id="restructuring_calc" />
          {ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Debt restructuring calculator (terms typed by the user, viewed on ${countryName})`,
                  value: rcSentence(ok),
                  source: 'Terms and discount rates typed by the user; no data',
                  asOf: new Date().toISOString().slice(0, 10),
                  iso3,
                  countryName,
                  detail: [ok.method, ...RC_REFERENCES],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('rc_intro')}</p>
      </header>
      <div className="p-4 space-y-3 text-xs">
        <table className="text-xs" data-rc-inputs="true">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="py-1 pr-3 font-medium" />
              {SIDES.map((s) => (
                <th key={s.key} className="py-1 pr-3 font-medium">
                  {t(s.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map((f) => (
              <tr key={f.key}>
                <td className="py-0.5 pr-3 text-slate-600 dark:text-slate-300">{t(f.label)}</td>
                {SIDES.map((s) => {
                  const k = `${s.key}.${f.key}`;
                  return (
                    <td key={k} className="py-0.5 pr-3">
                      <input className={input} inputMode="decimal" value={text[k] ?? ''} onChange={(e) => set(k, e.target.value)} aria-label={fieldName(k)} data-rc-field={k} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-slate-500 dark:text-slate-400">{t('rc_bulletHint')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600 dark:text-slate-300">{t('rc_rates')}</span>
          {Array.from({ length: RC_MAX_RATES }, (_, i) => (
            <input key={i} className={input} inputMode="decimal" value={text[`rate.${i}`] ?? ''} onChange={(e) => set(`rate.${i}`, e.target.value)} aria-label={t('rc_rateN', { n: i + 1 })} data-rc-field={`rate.${i}`} />
          ))}
        </div>
        {!ok && !out.ok && (
          <div className="text-amber-700 dark:text-amber-400 space-y-0.5" data-missing="true">
            {!anyTyped ? (
              <p>{t('rc_blank')}</p>
            ) : (
              <>
                {out.blank.length > 0 && <p>{t('rc_needs', { list: out.blank.map(fieldName).join('; ') })}</p>}
                {out.noRate && <p>{t('rc_needRate')}</p>}
                {out.invalid.length > 0 && <p>{t('rc_invalid', { list: out.invalid.map(fieldName).join('; ') })}</p>}
              </>
            )}
          </div>
        )}
        {ok && (
          <>
            <table className="w-full text-xs" data-rc-table="true">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('rc_rate')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('rc_pvOld')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('rc_pvNew')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('rc_npvCut')}</th>
                  <th className="py-1 font-medium text-right">{t('rc_marketCut')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {ok.rows.map((r) => (
                  <tr key={r.ratePct} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-0.5 pr-3">{r.ratePct}%</td>
                    <td className="py-0.5 pr-3 text-right">{r.pvOld.toFixed(2)}</td>
                    <td className="py-0.5 pr-3 text-right">{r.pvNew.toFixed(2)}</td>
                    <td className="py-0.5 pr-3 text-right font-medium">{r.npvHaircutPct.toFixed(1)}%</td>
                    <td className="py-0.5 text-right">{r.marketHaircutPct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-slate-900 dark:text-white" data-rc-sentence="true">
              {t('rc_sentence', { face: ok.faceHaircutPct.toFixed(1), rate: ok.rows[0].ratePct, npv: ok.rows[0].npvHaircutPct.toFixed(1), old: ok.totalOld.toFixed(2), neu: ok.totalNew.toFixed(2) })}
            </p>
            <button type="button" className="ui-btn text-xs" onClick={() => setShowFlows((v) => !v)} aria-expanded={showFlows}>
              {showFlows ? t('rc_hideFlows') : t('rc_showFlows')}
            </button>
            {showFlows && (
              <table className="text-xs" data-rc-flows="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('rc_old')}</th>
                    <th className="py-1 font-medium text-right">{t('rc_new')}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {ok.cashflows.map((c) => (
                    <tr key={c.year} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-0.5 pr-3">{c.year}</td>
                      <td className="py-0.5 pr-3 text-right">{c.old.toFixed(2)}</td>
                      <td className="py-0.5 text-right">{c.new.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button type="button" className="ui-btn text-xs" onClick={download} data-rc-csv="true">
              {t('rc_csv')}
            </button>
          </>
        )}
        <p className="text-slate-500 dark:text-slate-400">{t('c_method', { method: ok?.method ?? RC_METHOD })}</p>
        <details className="text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer">{t('c_references')}</summary>
          <ul className="mt-1 space-y-0.5">
            {RC_REFERENCES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
};
