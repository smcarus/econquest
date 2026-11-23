import React, { useEffect, useState } from 'react';
import { GVAR_CORE, GVAR_VAR_LABEL, type GvarResult, type GvarVar } from '../utils/gvar';

/**
 * How a shock spreads between economies (gap CG16): a small global VAR of the main economies plus
 * this country, with IMF trade weights (src/utils/gvar.ts). Loaded only when the tool is opened.
 */

type Reply = (GvarResult & { dropped: string[]; problems: string[]; source: string; note: string }) | { error: string; problems?: string[]; source?: string };

const pp = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '' : `${v > 0 ? '+' : ''}${v.toFixed(2)}`);

export const GvarPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [shock, setShock] = useState(iso3 === 'USA' ? 'CHN' : 'USA');
  const [variable, setVariable] = useState<GvarVar>('gdp');
  const [size, setSize] = useState(-1);
  const [reply, setReply] = useState<Reply | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setBusy(true);
    fetch(`/api/gvar?iso3=${encodeURIComponent(iso3)}&shock=${encodeURIComponent(shock)}&var=${variable}&size=${size}`)
      .then((r) => r.json())
      .then((j) => live && setReply(j as Reply))
      .catch((e) => live && setReply({ error: String(e?.message || e) }))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [iso3, shock, variable, size]);

  const choices = [...new Set([...GVAR_CORE, iso3])];
  const me = reply && !('error' in reply) ? reply.responses.find((r) => r.iso3 === iso3) : undefined;

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">
        How a surprise in one economy spreads to others, through trade. Each country has a small model of its growth and inflation that also reads its trading partners'. The models are joined into one and the
        surprise traced over five years.
      </p>
      <div className="flex flex-wrap gap-2 items-end text-xs">
        <label className="flex flex-col">
          Where the surprise starts
          <select value={shock} onChange={(e) => setShock(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1">
            {choices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          What moves
          <select value={variable} onChange={(e) => setVariable(e.target.value as GvarVar)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1">
            <option value="gdp">{GVAR_VAR_LABEL.gdp}</option>
            <option value="cpi">{GVAR_VAR_LABEL.cpi}</option>
          </select>
        </label>
        <label className="flex flex-col">
          By (percentage points, in the first year)
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="bg-slate-900 border border-slate-700 rounded px-2 py-1">
            {[-2, -1, 1, 2].map((s) => (
              <option key={s} value={s}>
                {s > 0 ? `+${s}` : s}
              </option>
            ))}
          </select>
        </label>
        {busy && <span className="text-slate-500">Working…</span>}
      </div>

      {reply && 'error' in reply && <p className="text-amber-400 text-xs">Missing: {reply.error}</p>}
      {reply && !('error' in reply) && (
        <>
          {me && shock !== iso3 && (
            <p className="text-slate-200">
              In this model, {countryName}'s growth moves {pp(me.gdp[0])} points in the same year and {pp(me.gdp[1])} the next; inflation {pp(me.cpi[0])} and {pp(me.cpi[1])}.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 text-left">
                  <th className="py-1 pr-2">Country</th>
                  <th className="py-1 pr-2">Trade weight of {shock}</th>
                  <th className="py-1 pr-2 text-right">Growth, year 0 (90% band)</th>
                  <th className="py-1 pr-2 text-right">Growth, year 1</th>
                  <th className="py-1 pr-2 text-right">Growth, year 2</th>
                  <th className="py-1 pr-2 text-right">Inflation, year 0</th>
                  <th className="py-1 text-right">Inflation, year 1</th>
                </tr>
              </thead>
              <tbody>
                {reply.responses.map((r) => (
                  <tr key={r.iso3} className={`border-t border-slate-800 ${r.iso3 === iso3 ? 'text-sky-300' : ''}`}>
                    <td className="py-1 pr-2">{r.iso3}</td>
                    <td className="py-1 pr-2">{r.iso3 === shock ? 'Start' : `${Math.round((reply.exposure.find((e) => e.iso3 === r.iso3)?.weight ?? 0) * 100)}%`}</td>
                    <td className="py-1 pr-2 text-right">
                      {pp(r.gdp[0])}
                      {r.gdpLow && r.iso3 !== shock ? <span className="text-slate-500"> ({pp(r.gdpLow[0])} to {pp(r.gdpHigh![0])})</span> : null}
                    </td>
                    <td className="py-1 pr-2 text-right">{pp(r.gdp[1])}</td>
                    <td className="py-1 pr-2 text-right">{pp(r.gdp[2])}</td>
                    <td className="py-1 pr-2 text-right">{pp(r.cpi[0])}</td>
                    <td className="py-1 text-right">{pp(r.cpi[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            Changes in percentage points from what would have happened otherwise. The same-year moves include surprises that hit many economies at once (2009, 2020), so they are larger than trade alone would give.
            Annual figures {reply.years[0]} to {reply.years[1]}, {reply.countries.length} economies; {reply.stableDraws} of {reply.draws} resampled models were stable and make the bands. One standard deviation of
            the surprise is {reply.shock.oneSd.toFixed(2)} points. {reply.note} The United States sees the others only with a one-year lag. Source: {reply.source}.
          </p>
          {reply.dropped.length > 0 && <p className="text-[11px] text-amber-400">Left out for too few IMF figures since 1996: {reply.dropped.join(', ')}.</p>}
          {reply.problems.length > 0 && <p className="text-[11px] text-amber-400">{reply.problems.join('. ')}.</p>}
        </>
      )}
    </div>
  );
};
