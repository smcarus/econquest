import React, { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import type { AsOfRow } from '../utils/asOf';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History > As of: pick a past day and see the figures the app held then (from
 * the pull archive, data/archive/) beside today's, each with its own source and period. The
 * archive gains a day with each saved pull, so early on there are only a few days to pick from.
 */

type Reply = { date: string; pulledAt: string; incomplete: boolean; nowPulledAt: string | null; rows: AsOfRow[] };

function fmt(v: number | null, unit: string, missing = 'Missing'): string {
  if (v === null || !Number.isFinite(v)) return missing;
  const abs = Math.abs(v);
  const n = abs >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : abs >= 100 ? v.toFixed(1) : v.toFixed(2);
  return unit.startsWith('%') ? `${n}%` : n;
}

function change(v: number | null, unit: string): string {
  if (v === null) return '';
  const pts = unit.startsWith('%');
  const n = Math.abs(v) >= 100 ? v.toFixed(1) : v.toFixed(2);
  return `${v > 0 ? '+' : ''}${n}${pts ? ' pts' : ''}`;
}

export const AsOfPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [days, setDays] = useState<string[] | null>(null);
  const [date, setDate] = useState('');
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveFailed, setArchiveFailed] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setDays(null);
    setReply(null);
    fetch(`/api/as-of/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: { days: string[] }) => {
        if (!live) return;
        setDays(b.days || []);
        // Start on the oldest day, the most useful comparison with today.
        setDate((b.days || [])[0] || '');
      })
      .catch((e: Error) => live && (setArchiveFailed(true), setError(e.message)));
    return () => {
      live = false;
    };
  }, [iso3]);

  useEffect(() => {
    if (!date) return;
    let live = true;
    setError(null);
    fetch(`/api/as-of/${encodeURIComponent(iso3)}?date=${encodeURIComponent(date)}`)
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({})))?.message || `HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && (setReply(null), setError(e.message)));
    return () => {
      live = false;
    };
  }, [iso3, date]);

  const first = days?.[0];
  const last = days?.[days.length - 1];

  return (
    <section className="ui-panel" data-as-of-panel="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('asof_title', { country: countryName })}
        </h2>
        <p className="ui-label">{t('asof_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {days === null && !error && <p className="ui-body">{t('c_loading')}</p>}
        {days !== null && days.length === 0 && (
          <p className="ui-body">{t('asof_none', { country: countryName })}</p>
        )}
        {days !== null && days.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="ui-label" htmlFor={`asof-${iso3}`}>
              {t('asof_asOf')}
            </label>
            <input
              id={`asof-${iso3}`}
              type="date"
              value={date}
              min={first}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t(days.length === 1 ? 'asof_days1' : 'asof_daysN', { n: days.length, first: first ?? '', last: last && last !== first ? t('asof_toLast', { last }) : '' })}
            </span>
            {reply && (
              <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/figures.csv?asOf=${encodeURIComponent(reply.date)}`} download>
                {t('asof_download')}
              </a>
            )}
            {reply && (
              <a className="ui-btn inline-flex" href={`/api/export/${encodeURIComponent(iso3)}/figures.xlsx?asOf=${encodeURIComponent(reply.date)}`} download>
                {t('c_excel')}
              </a>
            )}
          </div>
        )}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{archiveFailed ? t('c_couldNotRead', { what: t('asof_what'), error }) : tx(error)}</p>}
        {reply && (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('asof_pull', {
                date: reply.date,
                saved: reply.pulledAt.slice(0, 16).replace('T', ' '),
                latest: reply.date !== date ? t('asof_latestBefore', { date }) : '',
                incomplete: reply.incomplete ? t('asof_incomplete') : t('asof_complete'),
                today: reply.nowPulledAt ? t('asof_today', { date: reply.nowPulledAt.slice(0, 10) }) : '',
              })}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-normal">{t('asof_figure')}</th>
                    <th className="py-1 pr-3 font-normal text-right">{t('asof_asOfDate', { date: reply.date })}</th>
                    <th className="py-1 pr-3 font-normal text-right">{t('asof_todayCol')}</th>
                    <th className="py-1 font-normal text-right">{t('asof_change')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reply.rows.map((r) => (
                    <tr key={r.field} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 text-slate-900 dark:text-white">
                        {tx(r.figure)}
                        <div className="text-xs text-slate-400">{tx(r.unit)}</div>
                      </td>
                      {[r.then, r.now].map((s, i) => (
                        <td
                          key={i}
                          className={`py-1.5 pr-3 text-right whitespace-nowrap ${s.status === 'Missing' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}
                          title={s.status === 'Missing' ? t('c_missingReason', { reason: tx(s.reason || '') }) : `${s.source}${s.period ? `, ${s.period}` : ''}`}
                          data-missing={s.status === 'Missing' ? 'true' : undefined}
                        >
                          {fmt(s.value, r.unit, t('c_missing'))}
                          <div className="text-xs text-slate-400">{s.status === 'Missing' ? tx(s.reason || '') : s.period}</div>
                        </td>
                      ))}
                      <td className="py-1.5 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">{change(r.change, r.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('asof_note')}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
