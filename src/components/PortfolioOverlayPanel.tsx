import React, { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';
import type { LiveWatchlistItem } from '../types/council';
import { ASSET_CLASS_LABEL, type Holding } from '../utils/holdings';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';
import { portfolioOverlay, rowLeaning, YIELD_MOVE_BPS, type Leaning } from '../utils/portfolioOverlay';

/**
 * Portfolio > Signals on your holdings: each imported holding beside the app's signals that bear on
 * it, marked with or against the position. Stated rules on live figures; no advice, no odds.
 */

const LEAN_CLS: Record<Leaning, string> = {
  with: 'text-emerald-700 dark:text-emerald-400',
  against: 'text-red-700 dark:text-red-400',
  neutral: 'text-slate-500 dark:text-slate-400',
};
const mm = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 1 })}mm`;

export const PortfolioOverlayPanel: React.FC<{ holdings: Holding[]; watchlist: LiveWatchlistItem[]; onManageHoldings?: () => void }> = ({ holdings, watchlist, onManageHoldings }) => {
  const overlay = useMemo(() => portfolioOverlay(holdings, watchlist), [holdings, watchlist]);
  const [open, setOpen] = useState<string | null>(null);
  const t = useT(TOOLS);
  const tx = useTx();

  return (
    <section className="ui-panel" data-portfolio-overlay="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ov_title')}
        </h2>
        <p className="ui-label">{t('ov_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {holdings.length === 0 ? (
          <p className="ui-body">
            {t('ov_none')}{' '}
            {onManageHoldings && (
              <button type="button" className="text-blue-700 dark:text-blue-300 hover:underline" onClick={onManageHoldings}>
                {t('ov_importLink')}
              </button>
            )}{' '}
            {t('ov_noneTail')}
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-900 dark:text-white tabular-nums" data-overlay-summary="true">
              {t('ov_summary', { against: mm(overlay.againstUsdMm), mixed: mm(overlay.mixedUsdMm), with: mm(overlay.withUsdMm), quiet: mm(overlay.quietUsdMm) })}
            </p>
            {overlay.uncovered.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">{t('ov_uncovered', { list: overlay.uncovered.join(', ') })}</p>
            )}
            <ul className="space-y-1.5">
              {overlay.rows.map((r) => {
                const k = rowLeaning(r);
                const isOpen = open === r.holding.id;
                return (
                  <li key={r.holding.id} className="border border-slate-200 dark:border-slate-700" data-overlay-row={k}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : r.holding.id)}
                      className="w-full text-left px-2 py-1.5 flex flex-wrap items-baseline justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="text-sm text-slate-900 dark:text-white">
                        {r.holding.instrument} <span className="text-xs text-slate-500 dark:text-slate-400">({r.countryName}, {tx(ASSET_CLASS_LABEL[r.holding.assetClass])}, {t(r.holding.side === 'LONG' ? 'ov_side_long' : 'ov_side_short')}, {mm(r.holding.notionalUsdMm)})</span>
                      </span>
                      <span className={`text-xs ${k === 'against' ? LEAN_CLS.against : k === 'with' ? LEAN_CLS.with : LEAN_CLS.neutral}`}>
                        {r.notMarked ? t('ov_notMarked') : t(`ov_row_${k}`)}
                        {r.signals.length ? t('ov_counts', { a: r.signals.filter((s) => s.leaning === 'against').length, w: r.signals.filter((s) => s.leaning === 'with').length }) : ''}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-2 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        {r.notMarked && <p className="text-xs text-slate-500 dark:text-slate-400">{tx(r.notMarked)}</p>}
                        {r.signals.map((s) => (
                          <div key={s.kind} className="text-xs">
                            <span className={`font-medium ${LEAN_CLS[s.leaning]}`}>{t(`ov_lean_${s.leaning}`)}</span> <span className="text-slate-900 dark:text-white">{tx(s.label)}:</span>{' '}
                            <span className="text-slate-700 dark:text-slate-300">{tx(s.reading)}</span> <span className="text-slate-400">({s.source})</span>
                          </div>
                        ))}
                        {r.missing.length > 0 && (
                          <p className="text-xs text-slate-400" data-missing="true">
                            {t('c_missingReason', { reason: r.missing.map(tx).join('; ') })}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 space-y-0.5">
              <li>{t('ov_rule1', { bps: YIELD_MOVE_BPS })}</li>
              <li>{t('ov_rule2')}</li>
              <li>{t('ov_rule3')}</li>
            </ul>
          </>
        )}
      </div>
    </section>
  );
};
