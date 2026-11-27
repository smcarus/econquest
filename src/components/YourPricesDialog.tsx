import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PriceGroup, PriceGroupsOutcome } from '../utils/priceGroups';
import { NO_GROUP_SOURCE } from '../utils/priceGroups';
import { officialShares, personalRate } from '../utils/personalInflation';
import { loanEffect, type CbMove, type LoanInput } from '../utils/loanPayment';
import { clearSaved, readSaved, writeSaved, type SavedLoan, type YourPricesSaved } from '../utils/yourPricesStore';
import { CiteButton } from './CiteButton';
import { ChartNumbers } from './ChartNumbers';
import { useHelpLevel } from './HelpLevel';
import { showGuides } from '../utils/helpLevel';
import { useT } from '../i18n/useLang';
import { YOUR_PRICES } from '../i18n/messages/yourPrices';

/**
 * Menu > What this means for you (plan B4, steps PY1-PY5): your own inflation rate from your split of
 * spending over the official price groups, and what a rate change does to your loan payment, for the
 * country in view. The groups and the central bank's last move come from the server
 * (GET /api/your-prices/:iso3); what you enter is worked out here and kept only in this browser.
 */
type Reply = { iso3: string; countryName: string; groups: PriceGroupsOutcome; cbMove: CbMove | { missing: string } };

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const money = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numOr = (s: string): number | undefined => {
  const v = Number(s.replace(',', '.'));
  return s.trim() === '' || !Number.isFinite(v) ? undefined : v;
};

export function YourPricesDialog({ iso3, countryName, onClose }: { iso3: string; countryName: string; onClose: () => void }) {
  const t = useT(YOUR_PRICES);
  const guides = showGuides(useHelpLevel());
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<YourPricesSaved>(() => readSaved());
  const [kept, setKept] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/your-prices/${encodeURIComponent(iso3)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error || `The app answered ${r.status}.`);
        return body as Reply;
      })
      .then((b) => live && setReply(b))
      .catch((e) => live && setError(String(e?.message || e)));
    return () => {
      live = false;
    };
  }, [iso3]);

  const save = (next: YourPricesSaved) => {
    setSaved(next);
    setKept(writeSaved(next));
    setNote(null);
  };

  const groups: PriceGroup[] = reply?.groups.ok ? reply.groups.groups : [];
  const official = useMemo(() => officialShares(groups), [groups]);
  const shares: Record<string, number> = saved.shares[iso3] ?? official ?? {};
  const label = (g: PriceGroup) => {
    if (!reply?.groups.ok || reply.groups.classification === 'imf') return g.label;
    if (reply.groups.classification === 'ecoicop' && ['CP08', 'CP09', 'CP11', 'CP12'].includes(g.id)) return t(`e_${g.id}` as 'e_CP08');
    return t(`g_${g.id}` as 'g_CP01');
  };
  const labels = Object.fromEntries(groups.map((g) => [g.id, label(g)]));
  const result = reply?.groups.ok ? personalRate(groups, reply.groups.headline, shares, labels) : null;
  const setShare = (id: string, v: string) => {
    const n = numOr(v);
    const mine = { ...shares };
    if (n === undefined || n < 0) delete mine[id];
    else mine[id] = n;
    save({ ...saved, shares: { ...saved.shares, [iso3]: mine } });
  };
  const resetOfficial = () => {
    const rest = { ...saved.shares };
    delete rest[iso3];
    save({ ...saved, shares: rest });
  };
  const clearAll = () => {
    clearSaved();
    setSaved({ shares: {}, loan: {} });
    setNote(t('cleared'));
  };

  const loan = saved.loan;
  const setLoan = (patch: Partial<SavedLoan>) => save({ ...saved, loan: { ...loan, ...patch } });
  const loanIn: LoanInput | null =
    loan.balance !== undefined && loan.ratePct !== undefined && loan.years !== undefined
      ? { balance: loan.balance, ratePct: loan.ratePct, years: loan.years, type: loan.type ?? 'variable', kind: loan.kind ?? 'repayment', ...(loan.fixedYearsLeft !== undefined ? { fixedYearsLeft: loan.fixedYearsLeft } : {}) }
      : null;
  const loanOut = loanIn ? loanEffect(loanIn, loan.changePts ?? 1, reply?.cbMove ?? null) : null;
  const entered = Object.values(shares).reduce((a, b) => a + (b > 0 ? b : 0), 0);
  const dir = (v: number, up: string, down: string) => (v > 0 ? up : v < 0 ? down : t('sameAs'));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="your-prices-title" data-your-prices className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="your-prices-title" className="ui-title inline-flex items-center gap-2">
            <Wallet className="w-4 h-4" aria-hidden /> {t('title', { country: countryName })}
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t('closeAria')} className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto ui-body">
          {guides && <p>{t('intro')}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400" data-your-prices-privacy>
            {kept ? t('privacy') : t('privacyBlocked')} {t('otherCountry')}
          </p>

          <section className="space-y-2" aria-labelledby="yp-prices">
            <h3 id="yp-prices" className="ui-section-title">{t('sec_prices')}</h3>
            {guides && <p className="text-xs text-slate-600 dark:text-slate-300">{t('helpPrices')}</p>}
            {!reply && !error && <p>{t('loading')}</p>}
            {error && <p className="text-amber-700 dark:text-amber-400">{t('failed', { reason: error })}</p>}
            {reply && !reply.groups.ok && (
              <p className="text-amber-700 dark:text-amber-400" data-your-prices-missing>
                {reply.groups.reason === NO_GROUP_SOURCE ? t('noSource') : reply.groups.reason}
              </p>
            )}
            {reply?.groups.ok && (
              <>
                <p className="text-xs">{official ? t('startOfficial', { source: reply.groups.weightsSource ?? '' }) : t('startEmpty')} {t('splitHelp')}</p>
                <table className="w-full text-xs" data-your-prices-groups>
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1 pr-2 font-normal">{t('colGroup')}</th>
                      <th className="py-1 pr-2 font-normal text-right">{t('colOfficial')}</th>
                      <th className="py-1 pr-2 font-normal text-right">{t('colYours')}</th>
                      <th className="py-1 pr-2 font-normal text-right">{t('colRate')}</th>
                      <th className="py-1 font-normal text-right">{t('colPush')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => {
                      const at = result?.ok ? g.rates.find((p) => p.period === result.period) : g.rates[g.rates.length - 1];
                      const push = result?.ok ? result.pushes.find((p) => p.id === g.id) : undefined;
                      return (
                        <tr key={g.id} data-group={g.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-1 pr-2">{labels[g.id]}</td>
                          <td className="py-1 pr-2 text-right tabular-nums">{g.weightPct !== undefined ? `${f1(g.weightPct)}%` : <span className="text-amber-700 dark:text-amber-400">{t('noFigure')}</span>}</td>
                          <td className="py-1 pr-2 text-right">
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              inputMode="decimal"
                              aria-label={`${t('colYours')}: ${labels[g.id]}`}
                              value={shares[g.id] ?? ''}
                              onChange={(e) => setShare(g.id, e.target.value)}
                              className="w-20 text-right px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                            />
                          </td>
                          <td className="py-1 pr-2 text-right tabular-nums">{at ? `${f1(at.value)}%` : <span className="text-amber-700 dark:text-amber-400">{t('noFigure')}</span>}</td>
                          <td className="py-1 text-right tabular-nums">{push ? f2(push.push) : ''}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-slate-300 dark:border-slate-700 font-semibold">
                      <td className="py-1 pr-2">{t('total')}</td>
                      <td />
                      <td className="py-1 pr-2 text-right tabular-nums">{f1(entered)}%</td>
                      <td />
                      <td className="py-1 text-right tabular-nums">{result?.ok ? f2(result.ratePct) : ''}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="flex flex-wrap gap-2">
                  {official && (
                    <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={resetOfficial}>
                      {t('resetOfficial')}
                    </button>
                  )}
                </div>
                {result && !result.ok && <p className="text-amber-700 dark:text-amber-400">{result.reason}</p>}
                {result?.ok && (
                  <div className="space-y-2" data-your-rate={result.ratePct}>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {t('yourRate', { rate: f1(result.ratePct), month: result.period })}
                      {result.headlinePct !== undefined && result.gapPts !== undefined && ` ${t('vsHeadline', { headline: f1(result.headlinePct), gap: f1(Math.abs(result.gapPts)), dir: dir(result.gapPts, t('higher'), t('lower')) })}`}
                    </p>
                    {result.pushes[0] && <p className="text-xs">{t('biggest', { group: labels[result.pushes[0].id], push: f2(result.pushes[0].push) })}</p>}
                    {result.scaled && <p className="text-xs">{t('scaled', { total: f1(result.enteredTotal) })}</p>}
                    {result.months.length > 1 && (
                      <>
                        <h4 className="text-xs font-semibold">{t('chartTitle')}</h4>
                        <div className="h-56" aria-hidden>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={result.months} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} width={40} unit="%" />
                              <Tooltip formatter={(v: unknown) => `${f2(v as number)}%`} />
                              <Legend wrapperStyle={{ fontSize: 12 }} />
                              <Line dataKey="you" name={t('you')} stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                              <Line dataKey="headline" name={t('headline')} stroke="#64748b" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <ChartNumbers
                          caption={t('caption', { country: countryName })}
                          columns={[t('colMonth'), t('you'), t('headline')]}
                          rows={result.months.map((m) => [m.period, f2(m.you), m.headline !== undefined ? f2(m.headline) : null])}
                        />
                      </>
                    )}
                    {result.officialPct !== undefined && result.headlinePct !== undefined && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('officialCheck', { official: f1(result.officialPct), headline: f1(result.headlinePct) })}</p>
                    )}
                    <CiteButton kind="chart" title={t('caption', { country: countryName })} sources={reply.groups.sources} asOf={result.period} />
                  </div>
                )}
                <details className="text-xs text-slate-600 dark:text-slate-300">
                  <summary className="cursor-pointer">{t('method')}</summary>
                  <p className="mt-1">{reply.groups.method}</p>
                  <p className="mt-1">{t('sources', { list: reply.groups.sources.join('; ') })}</p>
                </details>
                {reply.groups.missing.length > 0 && (
                  <details className="text-xs text-slate-600 dark:text-slate-300">
                    <summary className="cursor-pointer">{t('missingTitle')}</summary>
                    <ul className="mt-1 list-disc pl-4 space-y-1">
                      {reply.groups.missing.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </section>

          <section className="space-y-2" aria-labelledby="yp-loan" data-your-loan>
            <h3 id="yp-loan" className="ui-section-title">{t('sec_loan')}</h3>
            {guides && <p className="text-xs text-slate-600 dark:text-slate-300">{t('helpLoan')}</p>}
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              {(
                [
                  ['balance', t('balance'), '1000'],
                  ['ratePct', t('rate'), '0.01'],
                  ['years', t('years'), '1'],
                  ['changePts', t('change'), '0.25'],
                ] as const
              ).map(([k, l, step]) => (
                <label key={k} className="flex flex-col gap-1">
                  <span>{l}</span>
                  <input
                    type="number"
                    step={step}
                    inputMode="decimal"
                    data-loan-field={k}
                    value={loan[k] ?? (k === 'changePts' ? 1 : '')}
                    onChange={(e) => setLoan({ [k]: numOr(e.target.value) })}
                    className="px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </label>
              ))}
              <label className="flex flex-col gap-1">
                <span>{t('type')}</span>
                <select value={loan.type ?? 'variable'} onChange={(e) => setLoan({ type: e.target.value as 'variable' | 'fixed' })} className="px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700">
                  <option value="variable">{t('variable')}</option>
                  <option value="fixed">{t('fixed')}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span>{t('kind')}</span>
                <select value={loan.kind ?? 'repayment'} onChange={(e) => setLoan({ kind: e.target.value as 'repayment' | 'interest_only' })} className="px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700">
                  <option value="repayment">{t('repayment')}</option>
                  <option value="interest_only">{t('interestOnly')}</option>
                </select>
              </label>
              {loan.type === 'fixed' && (
                <label className="flex flex-col gap-1">
                  <span>{t('fixedYears')}</span>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    data-loan-field="fixedYearsLeft"
                    value={loan.fixedYearsLeft ?? ''}
                    onChange={(e) => setLoan({ fixedYearsLeft: numOr(e.target.value) })}
                    className="px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </label>
              )}
            </div>
            {loanOut && !loanOut.ok && <p className="text-amber-700 dark:text-amber-400">{loanOut.reason}</p>}
            {loanOut?.ok && (
              <div className="space-y-1" data-loan-result>
                <p className="font-semibold text-slate-900 dark:text-white">{t('paymentNow', { pay: money(loanOut.payment) })}</p>
                <p>
                  {loanOut.startsAfterMonths > 0
                    ? t('withChangeFixed', { months: loanOut.startsAfterMonths, change: f2(loanOut.changePts), pay: money(loanOut.withChange), diff: money(Math.abs(loanOut.diff)), dir: dir(loanOut.diff, t('more'), t('less')) })
                    : t('withChange', { change: f2(loanOut.changePts), pay: money(loanOut.withChange), diff: money(Math.abs(loanOut.diff)), dir: dir(loanOut.diff, t('more'), t('less')) })}
                </p>
                {loanOut.cb && (
                  <p data-loan-cb>
                    {t('cbMove', { date: loanOut.cb.move.period, from: loanOut.cb.move.fromPct, to: loanOut.cb.move.toPct, source: loanOut.cb.move.source, pay: money(loanOut.cb.payment), diff: money(Math.abs(loanOut.cb.diff)), dir: dir(loanOut.cb.diff, t('more'), t('less')) })}
                  </p>
                )}
                {loanOut.cbMissing && <p className="text-amber-700 dark:text-amber-400" data-loan-cb-missing>{t('cbMissing', { reason: loanOut.cbMissing })}</p>}
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('loanNote')}</p>
              </div>
            )}
          </section>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={clearAll} data-your-prices-clear>
              {t('clearAll')}
            </button>
            {note && <span className="text-xs">{note}</span>}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('notForecast')}</p>
        </div>
      </div>
    </div>
  );
}
