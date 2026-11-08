import React, { useState } from 'react';
import type { LiveWatchlistItem } from '../types/council';
import { COFOG_SECTORS } from '../utils/govSpending';
import { runWhatIf, whatIfSetup, type WhatIfChoices, type WhatIfQuestion, type WhatIfUse } from '../utils/fiscalWhatIf';

/**
 * The scenario card under a what-if answer (Sam, 2026-11-08): the scenario as read from the question,
 * every input editable, and the app's own debt and output numbers re-run on the spot. The numbers
 * here are the calculator's (src/utils/fiscalWhatIf.ts), shown whether or not the AI summary used them.
 */

const sgn = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
const range = (a: number, b: number, unit = '%') => (a === b ? `${sgn(a)}${unit}` : `${sgn(a)} to ${sgn(b)}${unit}`);
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
        <div className="ui-label">Scenario: {item.countryName}</div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Read from your question; change anything and the numbers re-run.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
        <label className="flex items-center gap-1">
          Cut
          <select className={field} value={sectorCode} onChange={(e) => setSectorCode(e.target.value)} aria-label="Spending line">
            {sectors.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          by
          <input className={`${field} w-16`} type="number" min={-100} max={100} step={5} value={sharePct} onChange={(e) => setSharePct(num(e.target.value, sharePct))} aria-label="Share cut, percent" />%
        </label>
        <label className="flex items-center gap-1">
          and the money goes to
          <select className={field} value={where} onChange={(e) => setWhere(e.target.value as Where)} aria-label="Where the money goes">
            <option value="investment">public investment</option>
            <option value="other">other spending</option>
            <option value="deficit">cutting the deficit</option>
            <option value="both">compare spending and deficit</option>
          </select>
        </label>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <div>
          Spending now:{' '}
          {setup.spend ? `${setup.spend.pct.toFixed(1)}% of GDP (${setup.spend.source}, ${setup.spend.year})` : <span className="text-amber-700 dark:text-amber-400">Missing</span>}
          {result && ` → ${result.newSpendPct.toFixed(1)}% (${sgn(-result.cutPp)} pts of GDP)`}
        </div>
        <div>Output effect of the cut: {setup.cut?.source || 'Missing'}</div>
        {choices.uses?.includes('respend') && <div>Output effect of the money spent: {setup.sameRespend ? 'the same range as the cut, so it nets to zero' : setup.respend?.source || 'Missing'}</div>}
        <div>Budget response to output: {setup.semiElasticity ? `${setup.semiElasticity.value} x the output change (${setup.semiElasticity.source})` : 'left out: no published semi-elasticity in the app for this country'}</div>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> Use my own first-year multipliers instead
        </label>
        {own && (
          <div className="flex flex-wrap items-center gap-2 pl-5">
            cut
            <input className={`${field} w-14`} type="number" step={0.1} value={cutOwn.low} onChange={(e) => setCutOwn({ ...cutOwn, low: num(e.target.value, cutOwn.low) })} aria-label="Cut multiplier, low" />
            to
            <input className={`${field} w-14`} type="number" step={0.1} value={cutOwn.high} onChange={(e) => setCutOwn({ ...cutOwn, high: num(e.target.value, cutOwn.high) })} aria-label="Cut multiplier, high" />
            · money spent
            <input className={`${field} w-14`} type="number" step={0.1} value={respendOwn.low} onChange={(e) => setRespendOwn({ ...respendOwn, low: num(e.target.value, respendOwn.low) })} aria-label="Respend multiplier, low" />
            to
            <input className={`${field} w-14`} type="number" step={0.1} value={respendOwn.high} onChange={(e) => setRespendOwn({ ...respendOwn, high: num(e.target.value, respendOwn.high) })} aria-label="Respend multiplier, high" />
            <span className="text-slate-500 dark:text-slate-400">labelled "your setting"</span>
          </div>
        )}
      </div>

      {!result ? (
        <p className="text-sm text-amber-800 dark:text-amber-300" data-whatif-missing="true">
          Cannot run: {setup.cannotRun?.replace(/^[^:]+: /, '') || 'inputs missing'}.
        </p>
      ) : (
        <div className="space-y-3">
          {result.runs.map((r) => (
            <div key={r.use} className="space-y-1" data-whatif-run={r.use}>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {r.use === 'respend' ? `Money spent on ${setup.respendLabel}` : 'Money kept to cut the deficit'}: first-year growth {range(r.growth.low, r.growth.high)}, output {range(r.level.low, r.level.high)} by {r.level.year}, debt {r.debtEnd.low.toFixed(1)}
                {r.debtEnd.low !== r.debtEnd.high ? `-${r.debtEnd.high.toFixed(1)}` : ''}% of GDP in {r.debtEnd.year} (IMF baseline {r.debtEnd.baseline.toFixed(1)}%)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="font-normal pr-2">Year</th>
                      {r.years.map((y) => (
                        <th key={y.year} className="font-normal text-right px-1">
                          {y.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-800 dark:text-slate-200">
                    <tr>
                      <td className="pr-2">Debt, IMF baseline (% of GDP)</td>
                      {r.years.map((y) => (
                        <td key={y.year} className="text-right px-1">
                          {y.debtBaseline.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-2">Debt with the change</td>
                      {r.years.map((y) => (
                        <td key={y.year} className="text-right px-1">
                          {y.debtLow === y.debtHigh ? y.debtLow.toFixed(1) : `${y.debtLow.toFixed(1)}-${y.debtHigh.toFixed(1)}`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-2">Output level change (%)</td>
                      {r.years.map((y) => (
                        <td key={y.year} className="text-right px-1">
                          {range(y.levelLow, y.levelHigh, '')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <details className="text-xs text-slate-500 dark:text-slate-400">
            <summary className="cursor-pointer">How this is worked out</summary>
            <p className="mt-1">{result.method}</p>
          </details>
        </div>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">The app's own calculation on IMF inputs and published ranges, not a forecast.</p>
    </div>
  );
};
