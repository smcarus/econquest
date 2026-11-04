import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { economistBrief, type CountryBrief } from '../utils/countryNotes';
import { bankerBrief } from '../utils/bankerNote';
import { officialBrief } from '../utils/officialNote';

export type BriefView = 'economist' | 'banker' | 'official';

const VIEW_INFO: Record<BriefView, { label: string; title: string; note: string; cta: string }> = {
  economist: {
    label: 'Economy',
    title: 'Economist brief',
    note: 'Growth, inflation and policy, the fiscal path and the external position.',
    cta: 'Write the country note',
  },
  banker: {
    label: 'Issuer',
    title: 'Issuer brief',
    note: 'Market access, financing need, when to go to market, and pricing against peers.',
    cta: 'Write the issuer note',
  },
  official: {
    label: 'Sustainability',
    title: 'Debt sustainability brief',
    note: 'Debt path, a five-year projection with standard shocks, the adjustment that would stabilise debt, and the external position.',
    cta: 'Write the assessment',
  },
};

/**
 * The start view for a role on the Country page: the figures that role works from, each with
 * its source, a few plain observations, and a button into the matching report template.
 * The role picks the view that opens first; either can be switched to.
 */
export const CountryBriefPanel: React.FC<{
  run: CouncilAssessmentRun;
  peers: WatchlistItem[];
  view: BriefView;
  onWriteNote: (view: BriefView) => void;
}> = ({ run, peers, view: initialView, onWriteNote }) => {
  const [view, setView] = useState<BriefView>(initialView);
  const brief: CountryBrief = useMemo(
    () => (view === 'banker' ? bankerBrief(run, peers) : view === 'official' ? officialBrief(run) : economistBrief(run)),
    [run, peers, view]
  );
  const info = VIEW_INFO[view];

  return (
    <div className="space-y-3" data-no-stat-ref="true" data-no-provenance-overlay="true">
      <section className="ui-panel">
        <header className="ui-panel-header flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ui-section-title">{info.title}</h2>
            <p className="ui-label">{info.note}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div role="tablist" aria-label="Brief view" className="flex gap-1">
              {(Object.keys(VIEW_INFO) as BriefView[]).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className="ui-pill" onClick={() => setView(v)}>
                  {VIEW_INFO[v].label}
                </button>
              ))}
            </div>
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => onWriteNote(view)}>
              <FileText className="w-3.5 h-3.5" /> {info.cta}
            </button>
          </div>
        </header>
        <div className="p-4 space-y-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{brief.headline}</p>
          {brief.sampleWarning && (
            <p className="text-xs px-2 py-1.5 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
              {brief.sampleWarning}
            </p>
          )}
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
            {brief.judgements.map((j) => (
              <li key={j}>{j}</li>
            ))}
          </ul>
          <p className="ui-label">These observations are simple rules on the figures below, not a forecast.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {brief.groups.map((g) => (
          <section key={g.title} className="ui-panel">
            <header className="ui-panel-header">
              <h3 className="ui-section-title">{g.title}</h3>
            </header>
            <table className="w-full text-sm">
              <caption className="sr-only">{g.title}</caption>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={`${r.label}-${r.value}`} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <th scope="row" className="px-4 py-1.5 text-left font-normal text-slate-600 dark:text-slate-400">
                      {r.label}
                      <span
                        className={`block text-xs ${
                          r.verified ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {r.source}
                      </span>
                    </th>
                    <td className="px-4 py-1.5 text-right align-top font-medium text-slate-900 dark:text-white [font-variant-numeric:tabular-nums]">
                      {r.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </div>
  );
};
