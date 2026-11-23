import React, { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OpenDataSnapshot } from '../types/council';
import { getSnapshotDataStatus } from '../utils/dataStatus';
import { adAs, debtPath } from '../utils/macroLab';

/**
 * Country Research > Learn > Macro lab (PD2, CG14; src/utils/macroLab.ts): aggregate demand and
 * supply, and the debt equation, with sliders. No data except the optional "start from this
 * country's saved figures" button, which copies live figures with their source.
 */

function Slider({ label, value, min, max, step, onChange, id }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; id: string }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-xs">
      <span className="w-56 shrink-0">{label}</span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-12 text-right tabular-nums">{value}</span>
    </label>
  );
}

export const MacroLabPanel: React.FC<{ iso3: string; countryName: string; snapshot: OpenDataSnapshot }> = ({ countryName, snapshot }) => {
  const [b, setB] = useState(1);
  const [c, setC] = useState(0.5);
  const [d, setD] = useState(0);
  const [s, setS] = useState(0);
  const [d0, setD0] = useState(0);
  const [r, setR] = useState(0);
  const [g, setG] = useState(0);
  const [pb, setPb] = useState(0);
  const [filled, setFilled] = useState<string | null>(null);
  const ad = useMemo(() => adAs({ b, c, d, s }), [b, c, d, s]);
  const debt = useMemo(() => debtPath({ d0, r, g, pb, years: 20 }), [d0, r, g, pb]);
  const fill = () => {
    const st = getSnapshotDataStatus(snapshot);
    const debtNow = st.live('imf.debtToGdpPct');
    const prim = st.live('imf.primaryFiscalBalancePct');
    const got: string[] = [];
    const miss: string[] = [];
    if (debtNow !== undefined) (setD0(Math.round(debtNow)), got.push(`debt ${Math.round(debtNow)}% of GDP`));
    else miss.push('debt');
    if (prim !== undefined) (setPb(Math.round(prim * 10) / 10), got.push(`primary balance ${Math.round(prim * 10) / 10}%`));
    else miss.push('primary balance');
    const src = snapshot.liveFields?.['imf.debtToGdpPct'] || 'IMF World Economic Outlook';
    setFilled(`${got.length ? `From ${src}: ${got.join(', ')}.` : ''}${miss.length ? ` Missing: ${miss.join(' and ')} (no live figure saved).` : ''} Set the interest rate and nominal growth yourself.`);
  };
  return (
    <section className="ui-panel" data-macro-lab="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Macro lab
        </h2>
      </header>
      <div className="p-3 space-y-5">
        <p className="text-xs text-slate-500 dark:text-slate-400">Two textbook models to try ideas on. Move the sliders and read what happens. Not a forecast and not any country's figures, except where you press the button below.</p>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Aggregate demand and supply</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Output and the price level are on a teaching index: potential output and the expected price level are both 100.</p>
          <Slider id="ml-b" label="Slope of demand (b)" value={b} min={0.2} max={3} step={0.1} onChange={setB} />
          <Slider id="ml-c" label="Slope of short-run supply (c)" value={c} min={0} max={3} step={0.1} onChange={setC} />
          <Slider id="ml-d" label="Demand shock (spending up = right)" value={d} min={-10} max={10} step={0.5} onChange={setD} />
          <Slider id="ml-s" label="Supply shock (costs up = up)" value={s} min={-10} max={10} step={0.5} onChange={setS} />
          {'error' in ad ? (
            <p className="text-xs text-rose-600">{ad.error}</p>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="y" type="number" domain={[80, 120]} allowDataOverflow tick={{ fontSize: 10 }} label={{ value: 'Output', position: 'insideBottomRight', fontSize: 10 }} />
                    <YAxis type="number" domain={[80, 120]} allowDataOverflow tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line data={ad.ad} dataKey="p" name="Demand (AD)" stroke="#2563eb" dot={false} isAnimationActive={false} />
                    <Line data={ad.sras} dataKey="p" name="Short-run supply (SRAS)" stroke="#dc2626" dot={false} isAnimationActive={false} />
                    <Line data={[{ y: 100, p: 80 }, { y: 100, p: 120 }]} dataKey="p" name="Long-run supply" stroke="#64748b" strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm">{ad.reading}</p>
            </>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Debt equation</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Next year's debt = this year's debt x (1 + interest rate) / (1 + nominal growth) - primary balance. All in % of GDP or % a year.</p>
          <button type="button" className="ui-pill" onClick={fill} data-macro-fill="true">
            Start from {countryName}'s saved figures
          </button>
          {filled && <p className="text-xs text-slate-600 dark:text-slate-400">{filled}</p>}
          <Slider id="ml-d0" label="Debt now, % of GDP" value={d0} min={0} max={250} step={1} onChange={setD0} />
          <Slider id="ml-r" label="Average interest rate on debt, %" value={r} min={-5} max={30} step={0.5} onChange={setR} />
          <Slider id="ml-g" label="Nominal GDP growth, %" value={g} min={-10} max={40} step={0.5} onChange={setG} />
          <Slider id="ml-pb" label="Primary balance, % of GDP (surplus +)" value={pb} min={-10} max={10} step={0.1} onChange={setPb} />
          {'error' in debt ? (
            <p className="text-xs text-rose-600">{debt.error}</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={debt.path} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="t" tick={{ fontSize: 10 }} label={{ value: 'Years', position: 'insideBottomRight', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line dataKey="d" name="Debt, % of GDP" stroke="#7c3aed" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm">{debt.reading}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
