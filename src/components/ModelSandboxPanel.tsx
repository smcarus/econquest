import React, { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';
import type { SeriesPoint } from '../utils/seriesHistory';
import { debtSandbox, filterSandbox, taylorSandbox, SANDBOX_METHOD } from '../utils/modelSandboxes';

/**
 * Country Research > History & data > Model sandboxes (src/utils/modelSandboxes.ts): debt
 * dynamics, the Taylor rule and HP against Hamilton, with sliders starting from the latest figures.
 */

type Reply = {
  debt: { year: string; debt: number; i?: number; g: number; pi: number; pb: number } | null;
  taylor: { pi?: { value: number; year: string }; gap?: { value: number; year: string }; target?: { value: number; bank: string } };
  growth: SeriesPoint[];
  missing: string[];
};

type Num = number | null;
const r1 = (v: number) => Math.round(v * 10) / 10;

const Slider: React.FC<{ label: string; value: Num; set: (v: Num) => void; min: number; max: number; step: number; start?: string }> = ({ label, value, set, min, max, step, start }) => {
  const t = useT(TOOLS);
  return (
  <label className="flex items-center gap-2 text-xs">
    <span className="w-44 text-slate-500 dark:text-slate-400">{label}</span>
    <input type="range" min={min} max={max} step={step} value={value ?? min} disabled={value === null} onChange={(e) => set(Number(e.target.value))} className="flex-1" aria-label={label} />
    <input
      className="w-20 px-1.5 py-0.5 tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
      inputMode="decimal"
      value={value === null ? '' : String(value)}
      placeholder={t('c_missing')}
      onChange={(e) => {
        const t = e.target.value.trim();
        const n = Number(t.replace(',', '.'));
        set(t === '' ? null : Number.isFinite(n) ? n : value);
      }}
      aria-label={t('sb_valueAria', { label })}
    />
    <span className="w-28 text-slate-400">{start || ''}</span>
  </label>
  );
};

export const ModelSandboxPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [d, setD] = useState<Record<'debt' | 'i' | 'g' | 'pi' | 'pb', Num>>({ debt: null, i: null, g: null, pi: null, pb: null });
  const [years, setYears] = useState(5);
  const [t, setT] = useState<Record<'rStar' | 'pi' | 'target' | 'gap' | 'aPi' | 'aGap', Num>>({ rStar: 2, pi: null, target: null, gap: null, aPi: 0.5, aGap: 0.5 });
  const [lambda, setLambda] = useState(100);
  const tt = useT(TOOLS);
  const tx = useTx();
  const M = tt('c_missing');
  const [h, setH] = useState(2);

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/sandboxes/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => {
        if (!live) return;
        setReply(b);
        setD({ debt: b.debt?.debt ?? null, i: b.debt?.i ?? null, g: b.debt?.g ?? null, pi: b.debt?.pi ?? null, pb: b.debt?.pb ?? null });
        setT((x) => ({ ...x, pi: b.taylor.pi?.value ?? null, target: b.taylor.target?.value ?? null, gap: b.taylor.gap?.value ?? null }));
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const debtOut = useMemo(() => (Object.values(d).every((v) => v !== null) ? debtSandbox({ debt: d.debt!, i: d.i!, g: d.g!, pi: d.pi!, pb: d.pb!, years }) : null), [d, years]);
  const taylorOut = useMemo(() => (Object.values(t).every((v) => v !== null) ? taylorSandbox({ rStar: t.rStar!, pi: t.pi!, target: t.target!, gap: t.gap!, aPi: t.aPi!, aGap: t.aGap! }) : null), [t]);
  const filterOut = useMemo(() => (reply ? filterSandbox(reply.growth, lambda, h) : null), [reply, lambda, h]);
  const y = reply?.debt?.year;

  return (
    <section className="ui-panel" data-model-sandbox="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {tt('sb_title', { country: countryName })}
        </h2>
        <p className="ui-label">{tt('sb_intro', { country: countryName })}</p>
      </header>
      <div className="p-4 space-y-4 text-xs">
        {!reply && !error && <p className="ui-body">{tt('c_loading')}</p>}
        {error && <p className="text-amber-700 dark:text-amber-400">{tt('c_couldNotRead', { what: tt('sb_what'), error })}</p>}
        {reply && (
          <>
            <div data-sandbox="debt" className="space-y-1">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">{tt('sb_debtTitle')}</h3>
              <Slider label={tt('sb_debt')} value={d.debt} set={(v) => setD({ ...d, debt: v })} min={0} max={250} step={1} start={y ? `${y}: ${reply.debt?.debt}` : M} />
              <Slider label={tt('sb_i')} value={d.i} set={(v) => setD({ ...d, i: v })} min={-2} max={40} step={0.1} start={reply.debt?.i !== undefined ? `${y}: ${r1(reply.debt.i)}` : M} />
              <Slider label={tt('sb_g')} value={d.g} set={(v) => setD({ ...d, g: v })} min={-10} max={12} step={0.1} start={y ? `${y}: ${reply.debt?.g}` : M} />
              <Slider label={tt('sb_pi')} value={d.pi} set={(v) => setD({ ...d, pi: v })} min={-2} max={80} step={0.1} start={y ? `${y}: ${reply.debt?.pi}` : M} />
              <Slider label={tt('sb_pb')} value={d.pb} set={(v) => setD({ ...d, pb: v })} min={-10} max={10} step={0.1} start={y ? `${y}: ${reply.debt?.pb}` : M} />
              <Slider label={tt('sb_years')} value={years} set={(v) => setYears(Math.max(1, Math.min(30, Math.round(v ?? 5))))} min={1} max={30} step={1} />
              {debtOut ? (
                <p className="text-slate-900 dark:text-white" data-sandbox-result="debt">
                  {tt('sb_debtOut', { from: debtOut.path[0], end: debtOut.end, years, n: debtOut.nominalGrowth, gap: debtOut.iMinusN, pb: debtOut.stabilisingPb, path: debtOut.path.join(', ') })}
                </p>
              ) : (
                <p className="text-amber-700 dark:text-amber-400">{tt('sb_debtMissing')}</p>
              )}
            </div>
            <div data-sandbox="taylor" className="space-y-1">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">{tt('sb_taylorTitle')}</h3>
              <Slider label={tt('sb_rStar')} value={t.rStar} set={(v) => setT({ ...t, rStar: v })} min={-2} max={6} step={0.1} start="Taylor 1993: 2" />
              <Slider label={tt('sb_pi')} value={t.pi} set={(v) => setT({ ...t, pi: v })} min={-2} max={80} step={0.1} start={reply.taylor.pi ? `${reply.taylor.pi.year}: ${r1(reply.taylor.pi.value)}` : M} />
              <Slider label={tt('sb_target')} value={t.target} set={(v) => setT({ ...t, target: v })} min={0} max={10} step={0.1} start={reply.taylor.target ? `${reply.taylor.target.bank}` : M} />
              <Slider label={tt('sb_gap')} value={t.gap} set={(v) => setT({ ...t, gap: v })} min={-10} max={10} step={0.1} start={reply.taylor.gap ? `${reply.taylor.gap.year}: ${r1(reply.taylor.gap.value)}` : M} />
              <Slider label={tt('sb_aPi')} value={t.aPi} set={(v) => setT({ ...t, aPi: v })} min={0} max={2} step={0.05} start="Taylor 1993: 0.5" />
              <Slider label={tt('sb_aGap')} value={t.aGap} set={(v) => setT({ ...t, aGap: v })} min={0} max={2} step={0.05} start="Taylor 1993: 0.5" />
              {taylorOut ? (
                <p className="text-slate-900 dark:text-white" data-sandbox-result="taylor">
                  {tt('sb_taylorOut', { rate: taylorOut.rate, terms: taylorOut.terms.map((x) => `${tx(x.label)} ${x.value}`).join(' + ') })}
                </p>
              ) : (
                <p className="text-amber-700 dark:text-amber-400">{tt('sb_taylorMissing')}</p>
              )}
            </div>
            <div data-sandbox="filters" className="space-y-1">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">{tt('sb_filterTitle')}</h3>
              <Slider label={tt('sb_lambda')} value={lambda} set={(v) => setLambda(Math.max(0.1, v ?? 100))} min={1} max={1600} step={1} start={tt('sb_lambdaStart')} />
              <Slider label={tt('sb_h')} value={h} set={(v) => setH(Math.max(1, Math.min(8, Math.round(v ?? 2))))} min={1} max={8} step={1} start={tt('sb_hStart')} />
              {filterOut && 'reason' in filterOut ? (
                <p className="text-amber-700 dark:text-amber-400">{tt('c_missingReason', { reason: tx(filterOut.reason) })}</p>
              ) : filterOut?.latest ? (
                <p className="text-slate-900 dark:text-white" data-sandbox-result="filters">
                  {tt('sb_filterOut', {
                    year: filterOut.latest.year,
                    hp: filterOut.latest.hp,
                    ham: filterOut.latest.hamilton !== undefined ? tt('sb_hamGap', { v: filterOut.latest.hamilton }) : '',
                    n: filterOut.outturns,
                    list: filterOut.years
                      .slice(-5)
                      .map((x) => `${x.year} ${x.hp}${x.hamilton !== undefined ? ` / ${x.hamilton}` : ''}`)
                      .join('; '),
                  })}
                </p>
              ) : null}
            </div>
            <p className="text-slate-500 dark:text-slate-400" data-sandbox="restructuring">
              {tt('sb_rsMoved')}
            </p>
            {reply.missing.length > 0 && <p className="text-amber-700 dark:text-amber-400" data-missing="true">{tt('sb_missingList', { list: reply.missing.map(tx).join('; ') })}</p>}
            <p className="text-slate-500 dark:text-slate-400">{tt('c_method', { method: SANDBOX_METHOD })}</p>
          </>
        )}
      </div>
    </section>
  );
};
