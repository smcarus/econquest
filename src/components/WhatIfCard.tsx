import React, { useState } from 'react';
import type { LiveWatchlistItem } from '../types/council';
import { COFOG_SECTORS } from '../utils/govSpending';
import { runWhatIf, whatIfSetup, type WhatIfChoices, type WhatIfQuestion, type WhatIfUse } from '../utils/fiscalWhatIf';
import { useT, useTx } from '../i18n/useLang';
import { itemFromWhatIf } from '../utils/tradeOff';
import { keepWhatIf } from '../utils/tradeOffStore';
import { CHAT } from '../i18n/messages/chat';

/**
 * The scenario card under a what-if answer (Sam, 2026-11-08): the scenario as read from the question,
 * every input editable, and the app's own debt and output numbers re-run on the spot. The numbers
 * here are the calculator's (src/utils/fiscalWhatIf.ts), shown whether or not the AI summary used them.
 */

const sgn = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
const range = (a: number, b: number, unit = '%', to = 'to') => (a === b ? `${sgn(a)}${unit}` : `${sgn(a)} ${to} ${sgn(b)}${unit}`);
const field = 'px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';

type Where = 'investment' | 'other' | 'deficit' | 'both';

export const WhatIfCard: React.FC<{ question: WhatIfQuestion; item: LiveWatchlistItem }> = ({ question, item }) => {
  const [sectorCode, setSectorCode] = useState(question.sector.code);
  const [sharePct, setSharePct] = useState(Math.round(question.share * 100));
  const initialWhere: Where = question.uses.length > 1 ? 'both' : question.uses[0] === 'deficit' ? 'deficit' : question.destination;
  const [where, setWhere] = useState<Where>(initialWhere);
  const [own, setOwn] = useState(false);
  const [cutOwn, setCutOwn] = useState({ low: 0.4, high: 0.6 });
  const [respendOwn, setRespendOwn] = useState({ low: 0.4, high: 0.6 });
  const [keptIds, setKeptIds] = useState<string[]>([]);
  const t = useT(CHAT);
  const tx = useTx();
  const to = t('wi_to2');

  const choices: WhatIfChoices = {
    sectorCode,
    share: sharePct / 100,
    uses: (where === 'both' ? ['respend', 'deficit'] : where === 'deficit' ? ['deficit'] : ['respend']) as WhatIfUse[],
    destination: where === 'investment' ? 'investment' : 'other',
    ...(own ? { cutOwn, respendOwn } : {}),
  };
  const setup = whatIfSetup(item, question, choices);
  const result = setup.inputs ? runWhatIf(setup.inputs) : null;
  const sectors = COFOG_SECTORS.filter((s) => item.govSpending?.[s.code] || (s.code === 'GF02' && item.fiscal?.defencePctGdp) || s.code === question.sector.code);
  const num = (v: string, fallback: number) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : fallback);

  return (
    <div className="border border-slate-200 dark:border-slate-700 p-3 space-y-3" data-whatif-card={item.iso3}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="ui-label">{t('wi_scenario', { country: item.countryName })}</div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('wi_readFrom')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
        <label className="flex items-center gap-1">
          {t('wi_cut')}
          <select className={field} value={sectorCode} onChange={(e) => setSectorCode(e.target.value)} aria-label={t('wi_line')}>
            {sectors.map((s) => (
              <option key={s.code} value={s.code}>
                {tx(s.label).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          {t('wi_by')}
          <input className={`${field} w-16`} type="number" min={-100} max={100} step={5} value={sharePct} onChange={(e) => setSharePct(num(e.target.value, sharePct))} aria-label={t('wi_share')} />%
        </label>
        <label className="flex items-center gap-1">
          {t('wi_goesTo')}
          <select className={field} value={where} onChange={(e) => setWhere(e.target.value as Where)} aria-label={t('wi_where')}>
            <option value="investment">{t('wi_investment')}</option>
            <option value="other">{t('wi_other')}</option>
            <option value="deficit">{t('wi_deficit')}</option>
            <option value="both">{t('wi_both')}</option>
          </select>
        </label>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <div>
          {t('wi_spendNow')}{' '}
          {setup.spend ? t('wi_spendVal', { pct: setup.spend.pct.toFixed(1), source: setup.spend.source, year: setup.spend.year }) : <span className="text-amber-700 dark:text-amber-400">{t('wi_missing')}</span>}
          {result && t('wi_spendNew', { pct: result.newSpendPct.toFixed(1), pts: sgn(-result.cutPp) })}
        </div>
        <div>{t('wi_cutEffect', { source: setup.cut?.source || t('wi_missing') })}</div>
        {choices.uses?.includes('respend') && <div>{t('wi_respendEffect', { source: setup.sameRespend ? t('wi_sameRange') : setup.respend?.source || t('wi_missing') })}</div>}
        <div>{t('wi_budgetResp', { text: setup.semiElasticity ? t('wi_semi', { value: setup.semiElasticity.value, source: setup.semiElasticity.source }) : t('wi_noSemi') })}</div>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> {t('wi_own')}
        </label>
        {own && (
          <div className="flex flex-wrap items-center gap-2 pl-5">
            {t('wi_cutLower')}
            <input className={`${field} w-14`} type="number" step={0.1} value={cutOwn.low} onChange={(e) => setCutOwn({ ...cutOwn, low: num(e.target.value, cutOwn.low) })} aria-label={t('wi_cutLow')} />
            {t('wi_to')}
            <input className={`${field} w-14`} type="number" step={0.1} value={cutOwn.high} onChange={(e) => setCutOwn({ ...cutOwn, high: num(e.target.value, cutOwn.high) })} aria-label={t('wi_cutHigh')} />
            {t('wi_spent')}
            <input className={`${field} w-14`} type="number" step={0.1} value={respendOwn.low} onChange={(e) => setRespendOwn({ ...respendOwn, low: num(e.target.value, respendOwn.low) })} aria-label={t('wi_respLow')} />
            {t('wi_to')}
            <input className={`${field} w-14`} type="number" step={0.1} value={respendOwn.high} onChange={(e) => setRespendOwn({ ...respendOwn, high: num(e.target.value, respendOwn.high) })} aria-label={t('wi_respHigh')} />
            <span className="text-slate-500 dark:text-slate-400">{t('wi_yourSetting')}</span>
          </div>
        )}
      </div>

      {!result ? (
        <p className="text-sm text-amber-800 dark:text-amber-300" data-whatif-missing="true">
          {t('wi_cannot', { why: tx(setup.cannotRun?.replace(/^[^:]+: /, '') || '') || t('wi_inputsMissing') })}
        </p>
      ) : (
        <div className="space-y-3">
          {result.runs.map((r) => (
            <div key={r.use} className="space-y-1" data-whatif-run={r.use}>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {t('wi_runLine', {
                  run: r.use === 'respend' ? t('wi_runRespend', { label: tx(setup.respendLabel ?? '') }) : t('wi_runDeficit'),
                  growth: range(r.growth.low, r.growth.high, '%', to),
                  level: range(r.level.low, r.level.high, '%', to),
                  year: r.level.year,
                  debt: `${r.debtEnd.low.toFixed(1)}${r.debtEnd.low !== r.debtEnd.high ? `-${r.debtEnd.high.toFixed(1)}` : ''}`,
                  debtYear: r.debtEnd.year,
                  baseline: r.debtEnd.baseline.toFixed(1),
                })}
              </div>
              <div>
                {(() => {
                  const sectorLabel = tx(COFOG_SECTORS.find((s) => s.code === sectorCode)?.label ?? sectorCode).toLowerCase();
                  const id = `wi-${sectorCode}-${sharePct}-${r.use}-${where}-${own ? `${cutOwn.low}-${cutOwn.high}-${respendOwn.low}-${respendOwn.high}` : 'pub'}`;
                  const label = t('wi_keptLabel', { line: sectorLabel, pct: String(sharePct), use: r.use === 'respend' ? t('wi_runRespend', { label: tx(setup.respendLabel ?? '') }) : t('wi_runDeficit') });
                  const done = keptIds.includes(id);
                  return (
                    <button
                      type="button"
                      className="ui-btn ui-btn-ghost text-xs"
                      data-whatif-keep={r.use}
                      disabled={done}
                      onClick={() => {
                        keepWhatIf(item.iso3, itemFromWhatIf(id, label, r));
                        setKeptIds((k) => [...k, id]);
                      }}
                    >
                      {done ? t('wi_kept') : t('wi_keep')}
                    </button>
                  );
                })()}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="font-normal pr-2">{t('wi_year')}</th>
                      {r.years.map((y) => (
                        <th key={y.year} className="font-normal text-right px-1">
                          {y.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-800 dark:text-slate-200">
                    <tr>
                      <td className="pr-2">{t('wi_debtBase')}</td>
                      {r.years.map((y) => (
                        <td key={y.year} className="text-right px-1">
                          {y.debtBaseline.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-2">{t('wi_debtChange')}</td>
                      {r.years.map((y) => (
                        <td key={y.year} className="text-right px-1">
                          {y.debtLow === y.debtHigh ? y.debtLow.toFixed(1) : `${y.debtLow.toFixed(1)}-${y.debtHigh.toFixed(1)}`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-2">{t('wi_level')}</td>
                      {r.years.map((y) => (
                        <td key={y.year} className="text-right px-1">
                          {range(y.levelLow, y.levelHigh, '', to)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <details className="text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer">{t('wi_how')}</summary>
            <p className="mt-1">{tx(result.method)}</p>
          </details>
        </div>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('wi_note')}</p>
    </div>
  );
};
