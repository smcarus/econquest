import React, { useEffect, useState } from 'react';
import type { IndexPoint } from '../utils/dataSurprises';
import { useT } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/** Today > Inflation surprise index (R10): the latest reading for Brazil, the euro area and the United States. Loads on its own. */
export const SurpriseIndexCard: React.FC = () => {
  const [rows, setRows] = useState<Array<{ iso3: 'BRA' | 'DEU' | 'USA'; place: string; last: IndexPoint | null }> | null>(null);
  const t = useT(PANELS);
  useEffect(() => {
    let live = true;
    fetch('/api/surprise-index')
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => live && setRows(b?.rows ?? []))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, []);
  if (!rows) return null;
  return (
    <section className="ui-panel" data-surprise-index-card="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title">{t('sp_indexTitle')}</h2>
      </header>
      <ul className="p-3 text-sm space-y-1">
        {rows.map((r) => (
          <li key={r.iso3} className="flex justify-between gap-2">
            <span>{t(`sp_place_${r.iso3}`)}</span>
            {r.last ? (
              <span className="tabular-nums">{r.last.value > 0 ? '+' : ''}{r.last.value.toFixed(2)} <span className="text-xs text-slate-500 dark:text-slate-400">({r.last.date})</span></span>
            ) : (
              <span className="text-xs text-amber-700 dark:text-amber-400" data-missing="true">{t('sp_indexShort')}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="px-3 pb-3 text-xs text-slate-500 dark:text-slate-400">{t('sp_indexNote')}</p>
    </section>
  );
};
