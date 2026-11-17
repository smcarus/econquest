import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Layers } from 'lucide-react';
import { gaCsv, type GaPeriod, type GrowthAccounting, type GrowthAccountingOutcome } from '../utils/growthAccounting';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Growth accounting (G27, src/utils/growthAccounting.ts): growth
 * split into capital, hours, human capital and productivity from the Penn World Table, as a stacked
 * chart and a table, with a CSV download.
 */

type Reply = GrowthAccountingOutcome & { iso3: string; sentence?: string };
type Part = 'capital' | 'labour' | 'humanCapital' | 'tfp';

const sg = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
const PARTS: Array<{ key: Part; label: 'ga_capital' | 'ga_labour' | 'ga_human' | 'ga_tfp'; fill: string }> = [
  { key: 'capital', label: 'ga_capital', fill: 'fill-blue-600 dark:fill-blue-400' },
  { key: 'labour', label: 'ga_labour', fill: 'fill-teal-600 dark:fill-teal-400' },
  { key: 'humanCapital', label: 'ga_human', fill: 'fill-amber-500 dark:fill-amber-300' },
  { key: 'tfp', label: 'ga_tfp', fill: 'fill-fuchsia-600 dark:fill-fuchsia-400' },
];
const SWATCH: Record<Part, string> = { capital: 'bg-blue-600 dark:bg-blue-400', labour: 'bg-teal-600 dark:bg-teal-400', humanCapital: 'bg-amber-500 dark:bg-amber-300', tfp: 'bg-fuchsia-600 dark:bg-fuchsia-400' };

/** Positive parts stack up from zero, negative parts down; the dot marks GDP growth. */
const Chart: React.FC<{ periods: GaPeriod[]; label: string }> = ({ periods, label }) => {
  const W = 560;
  const H = 220;
  const pad = { l: 34, r: 8, t: 10, b: 26 };
  let hi = 0;
  let lo = 0;
  for (const p of periods) {
    hi = Math.max(hi, p.gdp, PARTS.reduce((s, x) => s + Math.max(0, p[x.key]), 0));
    lo = Math.min(lo, p.gdp, PARTS.reduce((s, x) => s + Math.min(0, p[x.key]), 0));
  }
  hi = Math.ceil(hi + 0.5);
  lo = Math.floor(lo - 0.5);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo)) * (H - pad.t - pad.b);
  const band = (W - pad.l - pad.r) / periods.length;
  const bw = Math.min(56, band * 0.6);
  const ticks: number[] = [];
  const step = hi - lo > 8 ? 2 : 1;
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={label} data-ga-chart="true">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'stroke-slate-500 dark:stroke-slate-400' : 'stroke-slate-200 dark:stroke-slate-700'} strokeWidth={v === 0 ? 1 : 0.5} />
          <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" className="fill-slate-500 dark:fill-slate-400" fontSize="10">
            {v}
          </text>
        </g>
      ))}
      {periods.map((p, i) => {
        const cx = pad.l + band * i + band / 2;
        let up = 0;
        let down = 0;
        return (
          <g key={p.to}>
            {PARTS.map((x) => {
              const v = p[x.key];
              if (!v) return null;
              const from = v > 0 ? up : down;
              const to = from + v;
              if (v > 0) up = to;
              else down = to;
              return (
                <rect key={x.key} x={cx - bw / 2} width={bw} y={Math.min(y(from), y(to))} height={Math.abs(y(from) - y(to))} className={x.fill}>
                  <title>{`${p.from}–${p.to} ${x.key}: ${sg(v)}`}</title>
                </rect>
              );
            })}
            <circle cx={cx} cy={y(p.gdp)} r={4} className="fill-white stroke-slate-900 dark:fill-slate-900 dark:stroke-white" strokeWidth={1.5}>
              <title>{`${p.from}–${p.to} GDP: ${p.gdp.toFixed(1)}%`}</title>
            </circle>
            <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize="10">
              {`${p.from}–${String(p.to).slice(2)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const GrowthAccountingPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/growth-accounting/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const ok = reply?.ok ? (reply as GrowthAccounting & Reply) : null;
  const last = ok?.periods[ok.periods.length - 1];

  const download = () => {
    if (!ok) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([gaCsv(iso3, ok)], { type: 'text/csv;charset=utf-8' }));
    a.download = `growth-accounting-${iso3.toLowerCase()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <section className="ui-panel" data-growth-accounting="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ga_title', { country: countryName })}
          <ValidationBadge id="growth_accounting" />
          {ok && last && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Growth accounting, ${countryName}`,
                  value: `${last.from}-${last.to}: GDP ${last.gdp}% a year = capital ${sg(last.capital)}, hours ${sg(last.labour)}, human capital ${sg(last.humanCapital)}, TFP ${sg(last.tfp)}`,
                  source: ok.sources.join('; '),
                  asOf: String(ok.lastYear),
                  iso3,
                  countryName,
                  detail: [ok.sentence || '', ok.method, ...ok.missing],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('ga_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('ga_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: tx(reply.reason) })}
          </p>
        )}
        {ok && last && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-ga-sentence="true">
              {t('ga_sentence', { country: countryName, from: last.from, to: last.to, gdp: last.gdp.toFixed(1), k: sg(last.capital), l: sg(last.labour), h: sg(last.humanCapital), tfp: sg(last.tfp) })}
            </p>
            <Chart periods={ok.periods} label={t('ga_chartLabel')} />
            <ul className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
              {PARTS.map((x) => (
                <li key={x.key} className="flex items-center gap-1">
                  <span className={`inline-block w-3 h-3 rounded-sm ${SWATCH[x.key]}`} />
                  {t(x.label)}
                </li>
              ))}
              <li className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full border-2 border-slate-900 dark:border-white" />
                {t('ga_gdp')}
              </li>
            </ul>
            <table className="w-full text-xs" data-ga-table="true">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('ga_period')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('ga_gdp')}</th>
                  {PARTS.map((x) => (
                    <th key={x.key} className="py-1 pr-3 font-medium text-right">
                      {t(x.label)}
                    </th>
                  ))}
                  <th className="py-1 font-medium text-right">{t('ga_share')}</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...ok.periods].reverse().map((p) => (
                  <tr key={p.to} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-0.5 pr-3">{`${p.from}–${p.to}`}</td>
                    <td className="py-0.5 pr-3 text-right font-medium">{p.gdp.toFixed(1)}</td>
                    {PARTS.map((x) => (
                      <td key={x.key} className="py-0.5 pr-3 text-right">
                        {sg(p[x.key])}
                        {x.key === 'labour' && p.personsOnly ? ` (${t('ga_persons')})` : ''}
                      </td>
                    ))}
                    <td className="py-0.5 text-right">{p.capitalShare.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ok.missing.map((m) => (
              <p key={m} className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">
                {t('c_missingReason', { reason: tx(m) })}
              </p>
            ))}
            <button type="button" className="ui-btn text-xs" onClick={download} data-ga-csv="true">
              {t('ga_csv')}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('ga_edition', { edition: ok.edition, year: ok.lastYear })} {t('c_method', { method: ok.method })} {t('c_sources', { sources: ok.sources.join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
