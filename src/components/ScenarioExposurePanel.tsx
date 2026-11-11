import React, { useMemo } from 'react';
import type { LiveWatchlistItem } from '../types/council';
import { SCENARIOS, rankScenario } from '../utils/scenarioExposure';
import { useT, useTx } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';

/**
 * Today > Global Spillover Agent: for each scenario, the countries hit hardest and the two that
 * gain most, as a first-round current account effect in % of GDP from official trade shares.
 */
export const ScenarioExposurePanel: React.FC<{
  items: LiveWatchlistItem[];
  onOpenCountry: (item: LiveWatchlistItem) => void;
}> = ({ items, onOpenCountry }) => {
  const t = useT(TOOLS);
  const tx = useTx();
  const ranked = useMemo(() => SCENARIOS.map((sc) => ({ sc, rows: rankScenario(sc.id, items) })), [items]);
  const any = ranked.some((r) => r.rows.length > 0);
  const fmt = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;

  return (
    <section className="ui-panel" data-scenarios="true">
      <header className="ui-panel-header">
        <h3 className="ui-section-title">{t('sx_title')}</h3>
        <p className="ui-label">{t('sx_intro')}</p>
      </header>
      {!any ? (
        <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          {t('sx_noTrade')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y xl:divide-y-0 xl:divide-x divide-slate-100 dark:divide-slate-800">
          {ranked.map(({ sc, rows }) => {
            const hit = rows.filter((r) => r.pctGdp < 0).slice(0, 3);
            // The two that gain most, biggest first (G18: an oil move names who gains as well as who loses).
            const gain = rows.filter((r) => r.pctGdp > 0).slice(-2).reverse();
            return (
              <div key={sc.id} className="px-4 py-3" data-scenario={sc.id}>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{tx(sc.name)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{tx(sc.shock)}</div>
                {rows.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('sx_noFigures')}</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {[...hit, ...gain].map((r) => {
                      const item = items.find((i) => i.iso3 === r.iso3);
                      return (
                        <li key={r.iso3}>
                          <button
                            type="button"
                            title={tx(r.basis)}
                            onClick={() => item && onOpenCountry(item)}
                            className="w-full flex justify-between gap-2 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            <span className="text-slate-800 dark:text-slate-200">{r.countryName}</span>
                            <span className={`tabular-nums ${r.pctGdp < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                              {fmt(r.pctGdp)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        {t('sx_model')}
      </p>
    </section>
  );
};
