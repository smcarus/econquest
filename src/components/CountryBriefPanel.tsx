import { PanelValidationBadge } from './ValidationBadge';
import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import { economistBrief, type CountryBrief } from '../utils/countryNotes';
import { bankerBrief } from '../utils/bankerNote';
import { officialBrief } from '../utils/officialNote';
import { explainInChat } from '../utils/explainHandoff';
import type { BriefGroup } from '../utils/countryNotes';
import { figureHelp, panelIntro, type GlossaryEntry } from '../data/glossary';
import { splitMeaning } from '../utils/countryNotes';
import { useHelpLevel } from './HelpLevel';
import { showFigureHelp, showGuides, showMissingHelp } from '../utils/helpLevel';
import { useT, useTx } from '../i18n/useLang';
import { BRIEF } from '../i18n/messages/brief';

export type BriefView = 'economist' | 'banker' | 'official';

const VIEWS: BriefView[] = ['economist', 'banker', 'official'];

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
  const t = useT(BRIEF);

  return (
    <div className="space-y-3">
      <section className="ui-panel">
        <header className="ui-panel-header flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="ui-section-title">{t(`title_${view}`)}</h2>
            <p className="ui-label">{t(`note_${view}`)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <div role="tablist" aria-label={t('viewAria')} className="flex gap-1">
              {VIEWS.map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className="ui-pill" onClick={() => setView(v)}>
                  {t(`view_${v}`)}
                </button>
              ))}
            </div>
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => onWriteNote(view)}>
              <FileText className="w-3.5 h-3.5" /> {t(`cta_${view}`)}
            </button>
          </div>
        </header>
        <BriefSummary brief={brief} />
      </section>
      <BriefGroups brief={brief} country={run} />
    </div>
  );
};

/** Headline, sample warning and observations, inside a brief panel. */
export const BriefSummary: React.FC<{ brief: CountryBrief }> = ({ brief }) => {
  const level = useHelpLevel();
  const t = useT(BRIEF);
  const tx = useTx();
  return (
  <div className="p-4 space-y-2">
    <p className="text-sm font-medium text-slate-900 dark:text-white">{tx(brief.headline)}</p>
    {brief.sampleWarning && (
      <p className="text-xs px-2 py-1.5 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
        {tx(brief.sampleWarning)}
      </p>
    )}
    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
      {brief.judgements.map((j) => {
        const { fact, meaning } = splitMeaning(j);
        return (
          <li key={j}>
            {tx(fact)}
            {meaning && showGuides(level) && (
              <span className="block text-slate-600 dark:text-slate-400" data-meaning="true">
                <span className="font-medium">{t('whatItMeans')}</span>
                {tx(meaning)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
    <p className="ui-label">
      {t('rulesNote')}
      {showGuides(level) ? t('rulesGuides') : t('rulesHover')}
    </p>
  </div>
  );
};

type BriefRow = BriefGroup['rows'][number];

/** "Explain": asks Council chat what a figure or a whole panel means, with each value as shown and its source. */
function explainRow(r: BriefRow, c: { iso3: string; countryName: string }) {
  explainInChat({ kind: 'figure', label: r.label, value: r.value, source: r.source, iso3: c.iso3, countryName: c.countryName });
}
function explainPanel(g: BriefGroup, c: { iso3: string; countryName: string }) {
  const shown = g.rows.filter((r) => !r.missing);
  explainInChat({
    kind: 'panel',
    label: g.title,
    iso3: c.iso3,
    countryName: c.countryName,
    detail: shown.slice(0, 8).map((r) => `${r.label}: ${r.value.slice(0, 160)} [${r.source}]`),
  });
}

const EXPLAIN_LINK = 'text-xs text-blue-700 dark:text-blue-300 hover:underline sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100';
const EXPLAIN_ROW_LINK = 'text-xs text-blue-700 dark:text-blue-300 hover:underline sm:opacity-0 sm:group-hover/row:opacity-100 focus:opacity-100';

/**
 * "What is this?" under a figure label: the plain-words glossary entry for the figure (what it is,
 * why it matters, how to read it). Closed by default so the table stays short; tap to open.
 */
/** "Why missing?" under a Missing value: the reason in full, visible on a phone as well as on hover. */
export const MissingHelp: React.FC<{ help?: string }> = ({ help }) => {
  const t = useT(BRIEF);
  const tx = useTx();
  return help ? (
    <details className="mt-0.5 text-xs font-normal text-left" data-missing-help="true">
      <summary className="cursor-pointer text-amber-700 dark:text-amber-400 hover:underline w-fit ml-auto">{t('whyMissing')}</summary>
      <p className="mt-1 max-w-prose text-slate-600 dark:text-slate-300">{tx(help)}</p>
    </details>
  ) : null;
};

export const FigureHelp: React.FC<{ entry: GlossaryEntry }> = ({ entry }) => {
  const t = useT(BRIEF);
  return (
  <details className="mt-0.5 text-xs font-normal" data-figure-help={entry.id}>
    <summary className="cursor-pointer text-blue-700 dark:text-blue-300 hover:underline w-fit">{t('whatIsThis')}</summary>
    <div className="mt-1 space-y-1 text-slate-600 dark:text-slate-300 max-w-prose text-left">
      <p>
        <strong className="font-medium text-slate-800 dark:text-slate-100">{entry.term}.</strong> {entry.what}
      </p>
      <p>{entry.why}</p>
      {entry.read && (
        <p>
          <span className="font-medium text-slate-800 dark:text-slate-100">{t('howToRead')}</span>
          {entry.read}
        </p>
      )}
      {entry.limits && <p className="text-slate-500 dark:text-slate-400">{entry.limits}</p>}
    </div>
  </details>
  );
};

/**
 * The figure tables of a brief, each row with its source under the label. With a country, each
 * figure and each panel gets an Explain link (shown on hover on a wide screen) into Council chat.
 */
export const BriefGroups: React.FC<{ brief: CountryBrief; country?: { iso3: string; countryName: string } }> = ({ brief, country }) => {
  const level = useHelpLevel();
  const t = useT(BRIEF);
  const tx = useTx();
  const help = (label: string) => {
    const e = figureHelp(label);
    return e && showFigureHelp(e, level) ? <FigureHelp entry={e} /> : null;
  };
  return (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    {brief.groups.map((g) => (
      <section key={g.title} className="ui-panel group">
        <header className="ui-panel-header flex items-start justify-between gap-2">
          <h3 className="ui-section-title flex flex-wrap items-center gap-2">
            {tx(g.title)}
            <PanelValidationBadge title={g.title} />
          </h3>
          {country && g.rows.some((r) => !r.missing) && (
            <button type="button" className={EXPLAIN_LINK} onClick={() => explainPanel(g, country)} title={t('explainPanelTitle')} data-explain-panel={g.title}>
              {t('explain')}
            </button>
          )}
        </header>
        {showGuides(level) && panelIntro(g.title) && <p className="px-4 pt-2 ui-label" data-panel-intro="true">{panelIntro(g.title)}</p>}
        <table className="w-full text-sm">
          <caption className="sr-only">{tx(g.title)}</caption>
          <tbody>
            {g.rows.map((r) =>
              r.value.length > 60 ? (
                // A sentence, not a figure: label, then the text under it, left-aligned.
                <tr key={`${r.label}-${r.value}`} className="border-b border-slate-100 dark:border-slate-800 last:border-0" title={r.help ? tx(r.help) : undefined} data-missing={r.missing ? 'true' : undefined}>
                  <td colSpan={2} className="px-4 py-1.5 text-left">
                    <span className="text-slate-600 dark:text-slate-400">{tx(r.label)}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{tx(r.source)}</span>
                    <span className={`block mt-0.5 ${r.missing ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{tx(r.value)}</span>
                    {r.missing && showMissingHelp(level) && <MissingHelp help={r.help} />}
                    {help(r.label)}
                  </td>
                </tr>
              ) : (
              <tr key={`${r.label}-${r.value}`} className="group/row border-b border-slate-100 dark:border-slate-800 last:border-0" title={r.help ? tx(r.help) : undefined} data-missing={r.missing ? 'true' : undefined}>
                <th scope="row" className="px-4 py-1.5 text-left font-normal text-slate-600 dark:text-slate-400">
                  {tx(r.label)}
                  <span
                    className={`block text-xs ${
                      r.verified ? 'text-emerald-700 dark:text-emerald-400' : r.missing ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tx(r.source)}
                  </span>
                  {help(r.label)}
                </th>
                <td className={`px-4 py-1.5 text-right align-top [font-variant-numeric:tabular-nums] ${r.missing ? 'text-slate-400 dark:text-slate-500' : 'font-medium text-slate-900 dark:text-white'}`}>
                  {tx(r.value)}
                  {r.missing && showMissingHelp(level) && <MissingHelp help={r.help} />}
                  {country && !r.missing && (
                    <button type="button" className={`block ml-auto font-normal ${EXPLAIN_ROW_LINK}`} onClick={() => explainRow(r, country)} title={t('explainRowTitle')} data-explain-row={r.label}>
                      {t('explain')}
                    </button>
                  )}
                </td>
              </tr>
              ),
            )}
          </tbody>
        </table>
      </section>
    ))}
  </div>
);
};
