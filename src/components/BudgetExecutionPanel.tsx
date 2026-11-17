import React, { useCallback, useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import type { BudgetView, Pace } from '../engine/budgetExecution';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Budget execution (R4, src/engine/budgetExecution.ts): your
 * approved budget and monthly spending by line, from a file you load, against the share of the
 * fiscal year gone. Kept on this computer only.
 */

type Reply = ({ loaded: false } | ({ loaded: true; sentence: string } & BudgetView)) & { iso3: string; folder: string };

const PACE_CLASS: Record<Pace, string> = {
  behind: 'text-amber-700 dark:text-amber-400',
  on_pace: 'text-slate-600 dark:text-slate-300',
  ahead: 'text-blue-700 dark:text-blue-400',
};
const PACE_KEY: Record<Pace, 'be_behind' | 'be_onPace' | 'be_ahead'> = { behind: 'be_behind', on_pace: 'be_onPace', ahead: 'be_ahead' };
const MONTHS = ['be_m1', 'be_m2', 'be_m3', 'be_m4', 'be_m5', 'be_m6', 'be_m7', 'be_m8', 'be_m9', 'be_m10', 'be_m11', 'be_m12'] as const;

const amount = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en') : v.toLocaleString('en', { maximumFractionDigits: 1 }));
const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`;

export const BudgetExecutionPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [unit, setUnit] = useState('');
  const [source, setSource] = useState('');
  const [fyStart, setFyStart] = useState(1);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const t = useT(PANELS);
  const tx = useTx();

  const load = useCallback(() => {
    let live = true;
    setError(null);
    fetch(`/api/budget-execution/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => {
        if (!live) return;
        setReply(b);
        if (b.loaded) {
          setUnit(b.meta.unit);
          setSource(b.meta.source);
          setFyStart(b.meta.fyStart);
        }
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  useEffect(() => {
    setReply(null);
    setForm(false);
    setCsv('');
    setFileName('');
    setProblems([]);
    return load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    setProblems([]);
    try {
      const r = await fetch(`/api/budget-execution/${encodeURIComponent(iso3)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, meta: { unit, source, fyStart } }),
      });
      const b = (await r.json()) as { problems?: string[]; error?: string };
      if (!r.ok) setProblems(b.problems?.length ? b.problems : [b.error || `HTTP ${r.status}`]);
      else {
        setForm(false);
        setCsv('');
        setFileName('');
        load();
      }
    } catch (e) {
      setProblems([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await fetch(`/api/budget-execution/${encodeURIComponent(iso3)}`, { method: 'DELETE' });
      load();
    } finally {
      setBusy(false);
    }
  };

  const v = reply && reply.loaded ? reply : null;

  return (
    <section className="ui-panel" data-budget-execution="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('be_title', { country: countryName })}
          <ValidationBadge id="budget_execution" />
          {v?.total && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Budget execution (your file), ${countryName}`,
                  value: v.sentence,
                  source: `Your file: ${v.meta.source}`,
                  asOf: v.latest || '',
                  iso3,
                  countryName,
                  detail: [t('be_methodText')],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('be_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('be_what'), error })}</p>}
        {reply && !reply.loaded && !form && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: t('be_noFile') })}
          </p>
        )}
        {v && (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400" data-be-file={v.csvSha256.slice(0, 12)}>
              {t('be_yourFile', { source: v.meta.source, unit: v.meta.unit, saved: v.savedAt.slice(0, 10) })}
            </p>
            {v.missing && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_missingReason', { reason: tx(v.missing) })}</p>}
            {v.total && v.timePct !== undefined && (
              <p className="ui-body" data-be-total={String(v.total.spentPct)}>
                {t('be_summary', { pct: String(v.total.spentPct), approved: amount(v.total.approved), unit: v.meta.unit, latest: v.latest || '', time: String(v.timePct), first: v.fyFirst || '' })}
                {v.total.yearEndPct !== undefined && ` ${t('be_yearEnd', { pct: String(v.total.yearEndPct) })}`}
              </p>
            )}
            {v.outside > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{t('be_outside', { n: String(v.outside) })}</p>}
            {v.timePct !== undefined && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-be-table="true">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-3 font-medium">{t('be_tLine')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('be_tApproved')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('be_tSpent')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('be_tPct')}</th>
                      <th className="py-1 pr-3 font-medium text-right">{t('be_tGap')}</th>
                      <th className="py-1 pr-3 font-medium">{t('be_tPace')}</th>
                      <th className="py-1 font-medium text-right">{t('be_tYearEnd')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...v.lines, ...(v.total ? [v.total] : [])].map((l, i) => (
                      <tr key={`${l.line}-${i}`} className={`border-t border-slate-100 dark:border-slate-800 align-top ${i === v.lines.length ? 'font-semibold' : ''}`} data-be-line={l.line}>
                        <td className="py-0.5 pr-3">
                          {i === v.lines.length ? t('be_total') : l.line}
                          {l.missingMonths.length > 0 && <span className="block text-amber-700 dark:text-amber-400 font-normal">{t('be_missingMonths', { months: l.missingMonths.join(', ') })}</span>}
                        </td>
                        <td className="py-0.5 pr-3 text-right">{amount(l.approved)}</td>
                        <td className="py-0.5 pr-3 text-right">{amount(l.spent)}</td>
                        <td className="py-0.5 pr-3 text-right">{l.spentPct !== undefined ? l.spentPct.toFixed(1) : '–'}</td>
                        <td className="py-0.5 pr-3 text-right">{l.gap !== undefined ? signed(l.gap) : '–'}</td>
                        <td className={`py-0.5 pr-3 ${l.pace ? PACE_CLASS[l.pace] : ''}`}>{l.pace ? t(PACE_KEY[l.pace]) : '–'}</td>
                        <td className="py-0.5 text-right">{l.yearEndPct !== undefined ? `${l.yearEndPct.toFixed(1)}%` : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('be_paceNote')}</p>
          </>
        )}
        {reply && !form && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn text-xs" onClick={() => setForm(true)} data-be-open-form="true">
              {v ? t('be_replace') : t('be_load')}
            </button>
            {v && (
              <button type="button" className="ui-btn text-xs" disabled={busy} onClick={() => void remove()} data-be-delete="true">
                {t('be_delete')}
              </button>
            )}
            <a className="ui-btn text-xs" href="/api/budget-execution-template.csv" download data-be-template="true">
              {t('be_template')}
            </a>
          </div>
        )}
        {form && (
          <div className="space-y-2 border border-slate-200 dark:border-slate-700 rounded p-3" data-be-form="true">
            <p className="text-xs">{t('be_formatHelp')}</p>
            <label className="block text-xs">
              {t('be_file')}
              <input
                type="file"
                accept=".csv,.tsv,.txt,text/csv"
                className="block text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFileName(f.name);
                  void f.text().then(setCsv);
                }}
                data-be-file-input="true"
              />
            </label>
            {fileName && <p className="text-xs text-slate-500 dark:text-slate-400">{fileName}</p>}
            <label className="block text-xs">
              {t('be_unit')}
              <input className="ui-input block w-full text-sm" value={unit} maxLength={40} onChange={(e) => setUnit(e.target.value)} placeholder={t('be_unitHint')} data-be-unit="true" />
            </label>
            <label className="block text-xs">
              {t('be_source')}
              <input className="ui-input block w-full text-sm" value={source} maxLength={300} onChange={(e) => setSource(e.target.value)} placeholder={t('be_sourceHint')} data-be-source="true" />
            </label>
            <label className="block text-xs">
              {t('be_fyStart')}
              <select className="ui-input block text-sm" value={fyStart} onChange={(e) => setFyStart(Number(e.target.value))} data-be-fy="true">
                {MONTHS.map((k, i) => (
                  <option key={k} value={i + 1}>
                    {t(k)}
                  </option>
                ))}
              </select>
            </label>
            {problems.length > 0 && (
              <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4" data-be-problems="true">
                {problems.map((p) => (
                  <li key={p}>{tx(p)}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button type="button" className="ui-btn text-xs" disabled={busy || !csv} onClick={() => void save()} data-be-save="true">
                {t('be_save')}
              </button>
              <button type="button" className="ui-btn text-xs" onClick={() => setForm(false)}>
                {t('be_cancel')}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('be_privacy', { folder: reply?.folder || 'data/local/budget-execution' })}</p>
          </div>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('be_methodText')}</p>
      </div>
    </section>
  );
};
