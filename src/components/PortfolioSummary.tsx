import { CDS_HIDDEN } from '../utils/cdsHidden';
import React, { useMemo } from 'react';
import { Upload } from 'lucide-react';
import type { LiveWatchlistItem } from '../types/council';
import { yieldSourceHelp, yieldSourceNote } from '../utils/watchlistYield';
import { summariseBook, type Holding } from '../utils/holdings';
import { bookView, type BookLine } from '../utils/bookNote';
import { missingReason, type FigureKey } from '../utils/liveFigures';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';


/**
 * Top of the Portfolio page: what the book holds, with weights and live figures by country.
 * With holdings imported, weights are by gross notional. Without them, the book is the
 * watchlist at equal weight, and the page says so. Rows arrive with built-in figures removed
 * (toLive): a figure without a real source reads Missing with the reason, and averages use only the
 * countries that have it.
 */

interface PortfolioSummaryProps {
  watchlistItems: LiveWatchlistItem[];
  /** Watchlist plus the full catalogue, for the figures of held countries. */
  riskLookup: LiveWatchlistItem[];
  holdings: Holding[];
  onOpenCountry: (item: LiveWatchlistItem) => void;
  onManageHoldings: () => void;
}

const Stat: React.FC<{ label: string; value: string; note?: string; missing?: boolean; help?: string }> = ({ label, value, note, missing, help }) => (
  <div className="min-w-0" title={help}>
    <div className="ui-label">{label}</div>
    <div className={`text-lg font-semibold ui-num ${missing ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{value}</div>
    {note && <div className={missing ? 'text-xs text-amber-700 dark:text-amber-400' : 'ui-label'}>{note}</div>}
  </div>
);

const fmtMm = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: v >= 100 ? 0 : 1 })}mm`;
const signed = (v: number, f: (x: number) => string) => (v < 0 ? `−${f(-v)}` : f(v));

type Row = BookLine;

/** A grey Missing with the short reason underneath and the fix in the tooltip. */
const MissingCell: React.FC<{ k: FigureKey; iso3: string }> = ({ k, iso3 }) => {
  const r = missingReason(k, iso3);
  const t = useT(TOOLS);
  const tx = useTx();
  return (
    <span title={tx(r.help)}>
      <span className="text-slate-400 dark:text-slate-500">{t('c_missing')}</span>
      <span className="block text-xs whitespace-nowrap text-amber-700 dark:text-amber-400">{tx(r.short)}</span>
    </span>
  );
};

/** Weighted average of a figure over the rows that have it, with the share of weight covered. */
function coveredAvg(rows: Row[], get: (i: LiveWatchlistItem) => number | undefined): { value: number; share: number } | undefined {
  const covered = rows.filter((r) => r.item);
  const have = covered.filter((r) => get(r.item!) !== undefined);
  const w = have.reduce((a, r) => a + r.weight, 0);
  const wAll = covered.reduce((a, r) => a + r.weight, 0);
  if (!w || !wAll) return undefined;
  return { value: have.reduce((a, r) => a + get(r.item!)! * r.weight, 0) / w, share: w / wAll };
}


export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  watchlistItems,
  riskLookup,
  holdings,
  onOpenCountry,
  onManageHoldings,
}) => {
  const hasHoldings = holdings.length > 0;
  const t = useT(TOOLS);
  const tx = useTx();
  const coverNote = (c: { share: number }) => (c.share >= 0.999 ? undefined : t('ps_cover', { pct: (c.share * 100).toFixed(0) }));

  const s = useMemo(() => {
    const v = bookView(holdings, riskLookup, watchlistItems);
    return {
      rows: v.lines,
      book: hasHoldings ? summariseBook(holdings, riskLookup) : null,
      avgCds: coveredAvg(v.lines, (i) => i.cds5YBps),
      countries: v.lines.length,
    };
  }, [hasHoldings, holdings, riskLookup, watchlistItems]);

  if (!hasHoldings && watchlistItems.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="ui-body">{t('ps_empty')}</p>
        <button type="button" className="ui-btn ui-btn-primary" onClick={onManageHoldings}>
          <Upload className="w-3.5 h-3.5" /> {t('ps_importHoldings')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="ui-label">
          {hasHoldings
            ? holdings.length === 1
              ? t('ps_yoursOne')
              : t('ps_yours', { n: holdings.length })
            : t('ps_equal')}
        </p>
        <button type="button" className="ui-btn" onClick={onManageHoldings}>
          <Upload className="w-3.5 h-3.5" /> {hasHoldings ? t('ps_editHoldings') : t('ps_importHoldings')}
        </button>
      </div>

      {hasHoldings && s.book ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <Stat label={t('ps_gross')} value={fmtMm(s.book.grossUsdMm)} note={t('ps_countries', { n: s.countries })} />
          <Stat
            label={t('ps_netCredit')}
            value={signed(s.book.netCreditUsdMm, fmtMm)}
            note={t('ps_netCreditNote')}
          />
          <Stat
            label={t('ps_dv01')}
            value={`${signed(s.book.dv01UsdK, (v) => `$${v.toFixed(1)}k`)} / bp`}
            note={s.book.missingDuration ? t('ps_noDuration', { n: s.book.missingDuration }) : t('ps_dv01Note')}
          />
          {/* CDS hidden for now (src/utils/cdsHidden.ts). */}
          {CDS_HIDDEN ? null : s.avgCds ? (
            <Stat label={t('ps_cds')} value={`${s.avgCds.value.toFixed(0)} bps`} note={coverNote(s.avgCds) || t('ps_cdsYours')} />
          ) : (
            <Stat label={t('ps_cds')} value={t('c_missing')} note={tx(missingReason('cds', '').short)} help={tx(missingReason('cds', '').help)} missing />
          )}
        </div>
      ) : null}

      {s.book && s.book.uncovered.length > 0 && (
        <p className="ui-label">
          {t('ps_uncovered', { list: s.book.uncovered.join(', ') })}
        </p>
      )}

      <div>
        <div className="min-w-0">
          {/* Phones: one tappable card per country instead of a table that scrolls sideways. */}
          <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
            {s.rows.map((r) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{r.countryName}</span>
                    {!r.item && <span className="ui-badge">{t('ps_noData')}</span>}
                  </div>
                  <dl className="mt-1 grid grid-cols-2 gap-x-3 text-sm ui-num">
                    <div>
                      <dt className="ui-label">{t('ps_weight')}</dt>
                      <dd>{(r.weight * 100).toFixed(0)}%</dd>
                    </div>
                    <div title={r.item?.yield10YPct !== undefined ? tx(yieldSourceHelp(r.item)) : undefined}>
                      <dt className="ui-label">{t('ps_yield')}</dt>
                      <dd>{r.item?.yield10YPct !== undefined ? `${r.item.yield10YPct.toFixed(2)}%` : r.item ? <MissingCell k="yield" iso3={r.iso3} /> : '–'}</dd>
                      {r.item?.yield10YPct !== undefined && (
                        <dd
                          className={`text-xs ${
                            r.item.yield10YSource === 'official'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {tx(yieldSourceNote(r.item))}
                        </dd>
                      )}
                    </div>
                    {hasHoldings && (
                      <div className="mt-1">
                        <dt className="ui-label">{t('ps_netCreditCol')}</dt>
                        <dd>{signed(r.netCreditUsdMm ?? 0, fmtMm)}</dd>
                      </div>
                    )}
                    {hasHoldings && (
                      <div className="mt-1">
                        <dt className="ui-label">{t('ps_dv01Col')}</dt>
                        <dd>{signed(r.dv01UsdK ?? 0, (v) => v.toFixed(1))}</dd>
                      </div>
                    )}
                  </dl>
                </>
              );
              return (
                <li key={r.iso3}>
                  {r.item ? (
                    <button
                      type="button"
                      onClick={() => onOpenCountry(r.item!)}
                      className="w-full text-left py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="py-2.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t('ps_caption')}</caption>
            <thead>
              <tr className="ui-label text-left border-b border-slate-100 dark:border-slate-800">
                <th className="py-1.5 pr-3 font-normal">{t('ho_country')}</th>
                {hasHoldings && <th className="py-1.5 pr-3 font-normal text-right">{t('ps_netCreditCol')}</th>}
                {hasHoldings && <th className="py-1.5 pr-3 font-normal text-right">{t('ps_dv01Col')}</th>}
                <th className="py-1.5 pr-3 font-normal text-right">{t('ps_yield')}</th>
                <th className="py-1.5 pr-3 font-normal text-right">{t('ps_weight')}</th>
                <th className="py-1.5 font-normal w-1/4 hidden sm:table-cell" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr
                  key={r.iso3}
                  className={`border-b border-slate-50 dark:border-slate-800/60 ${r.item ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer' : ''}`}
                  onClick={() => r.item && onOpenCountry(r.item)}
                >
                  <td className="py-1.5 pr-3 text-slate-900 dark:text-white whitespace-nowrap">
                    {r.countryName}
                    {!r.item && <span className="ui-badge ml-2">{t('ps_noData')}</span>}
                  </td>
                  {hasHoldings && (
                    <td className="py-1.5 pr-3 text-right ui-num whitespace-nowrap">{signed(r.netCreditUsdMm ?? 0, fmtMm)}</td>
                  )}
                  {hasHoldings && (
                    <td className="py-1.5 pr-3 text-right ui-num">{signed(r.dv01UsdK ?? 0, (v) => v.toFixed(1))}</td>
                  )}
                  <td className="py-1.5 pr-3 text-right" title={r.item?.yield10YPct !== undefined ? tx(yieldSourceHelp(r.item)) : undefined}>
                    {r.item && r.item.yield10YPct === undefined ? (
                      <MissingCell k="yield" iso3={r.iso3} />
                    ) : r.item ? (
                      <>
                        <span className="ui-num">{r.item.yield10YPct!.toFixed(2)}%</span>
                        <span
                          className={`block text-xs whitespace-nowrap ${
                            r.item.yield10YSource === 'official'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {tx(yieldSourceNote(r.item))}
                        </span>
                      </>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right ui-num">{(r.weight * 100).toFixed(0)}%</td>
                  <td className="py-1.5 hidden sm:table-cell">
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-1.5 bg-slate-500 dark:bg-slate-400"
                        style={{ width: `${Math.round(r.weight * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <p className="ui-label mt-1">
            {(() => {
              const items = s.rows.filter((r) => r.item);
              const have = items.filter((r) => r.item!.yield10YPct !== undefined).length;
              return t('ps_yieldsNote', { have, n: items.length });
            })()}{' '}
            {t('ps_tap')}
          </p>
        </div>
      </div>
    </div>
  );
};
