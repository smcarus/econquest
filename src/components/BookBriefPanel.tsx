import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import type { LiveWatchlistItem } from '../types/council';
import type { Holding } from '../utils/holdings';
import { bookView, clientBrief, pmBookBrief } from '../utils/bookNote';
import { BriefGroups, BriefSummary } from './CountryBriefPanel';
import { useT } from '../i18n/useLang';
import { TOOLS } from '../i18n/messages/tools';


export type BookBriefView = 'pm' | 'client';

const VIEWS: BookBriefView[] = ['pm', 'client'];

/**
 * Start view for the portfolio manager and the private wealth adviser under Research > My holdings > History & data:
 * the whole book, not one country. Either view can be switched to; the button opens the
 * matching report template.
 */
export const BookBriefPanel: React.FC<{
  holdings: Holding[];
  riskLookup: LiveWatchlistItem[];
  watchlist: LiveWatchlistItem[];
  view: BookBriefView;
  onWriteReport: (view: BookBriefView) => void;
}> = ({ holdings, riskLookup, watchlist, view: initialView, onWriteReport }) => {
  const [view, setView] = useState<BookBriefView>(initialView);
  const brief = useMemo(() => {
    const v = bookView(holdings, riskLookup, watchlist);
    return view === 'client' ? clientBrief(v) : pmBookBrief(v);
  }, [holdings, riskLookup, watchlist, view]);
  const t = useT(TOOLS);
  const info = { title: t(`bb_${view}_title`), note: t(`bb_${view}_note`), cta: t(`bb_${view}_cta`) };

  return (
    <div className="space-y-3">
      <section className="ui-panel">
        <header className="ui-panel-header flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ui-section-title">{info.title}</h2>
            <p className="ui-label">{info.note}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div role="tablist" aria-label={t('bb_view')} className="flex gap-1">
              {VIEWS.map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className="ui-pill" onClick={() => setView(v)}>
                  {t(`bb_${v}_label`)}
                </button>
              ))}
            </div>
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => onWriteReport(view)}>
              <FileText className="w-3.5 h-3.5" /> {info.cta}
            </button>
          </div>
        </header>
        <BriefSummary brief={brief} />
      </section>
      <BriefGroups brief={brief} />
    </div>
  );
};
