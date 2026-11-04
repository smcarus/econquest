import React, { useMemo, useState } from 'react';
import { Copy, Download, Printer } from 'lucide-react';
import type { CouncilAssessmentRun, WatchlistItem } from '../types/council';
import type { StagedTradeTicketSpec } from '../utils/nssYieldCurveAndCatalystEngine';
import { getSnapshotDataStatus, DATA_MODE_LABEL, formatAsOf } from '../utils/dataStatus';
import { summariseBook, type Holding } from '../utils/holdings';
import { upcomingOfficialEvents } from '../data/officialCalendar';
import { toDisplayCase } from '../utils/displayCase';

/**
 * One builder for the investment committee memo. It pulls the current country view,
 * staged tickets, imported holdings and the official calendar into a draft the user can
 * edit, then copy, download as Markdown, or print to PDF. Every figure carries its data status.
 */

interface IcMemoBuilderProps {
  run: CouncilAssessmentRun;
  stagedTickets: StagedTradeTicketSpec[];
  holdings: Holding[];
  riskLookup: WatchlistItem[];
}

type SectionId = 'recommendation' | 'figures' | 'thesis' | 'trades' | 'portfolio' | 'risks' | 'calendar' | 'sources';

const SECTION_LABEL: Record<SectionId, string> = {
  recommendation: 'Recommendation',
  figures: 'Key figures',
  thesis: 'Thesis',
  trades: 'Proposed trades',
  portfolio: 'Portfolio impact',
  risks: 'Risks and kill switch',
  calendar: 'Coming up',
  sources: 'Data and sources',
};

const VERDICT_LABEL: Record<string, string> = {
  EXECUTE_TRADES: 'Act: put on the proposed trades',
  DEFENSIVE_HEDGE: 'Defensive: hedge or reduce',
  HOLD_AND_MONITOR: 'Hold and monitor',
};

interface MemoSection {
  id: SectionId;
  heading: string;
  lines: string[]; // each line is a paragraph, or a bullet when it starts with "- "
}

function buildSections(
  p: IcMemoBuilderProps,
  include: Record<SectionId, boolean>,
  ticketScope: 'country' | 'all'
): MemoSection[] {
  const { run, stagedTickets, holdings, riskLookup } = p;
  const open = run.openData;
  const mkt = open.monetaryAndMarket;
  const sc = run.supremeCouncil;
  const status = getSnapshotDataStatus(open);
  const sampleNote = status.mode === 'live' ? '' : ` (${DATA_MODE_LABEL[status.mode].toLowerCase()})`;
  const priceNote = status.isFeedLive('ai_market') ? ' (AI estimate from web search)' : sampleNote;
  const tickets = ticketScope === 'country' ? stagedTickets.filter((t) => t.iso3 === run.iso3) : stagedTickets;
  const out: MemoSection[] = [];

  if (include.recommendation) {
    const lines = sc
      ? [
          `**${VERDICT_LABEL[sc.decisionVerdict] || sc.decisionVerdict}.** Stance: ${toDisplayCase(sc.marketTranslationLayer.regimeStance)}.`,
          `Composite risk score ${(sc.compositeRiskScore * 100).toFixed(0)} / 100; council agreement ${(sc.globalCoherenceScore * 100).toFixed(0)}%. Risk check: ${sc.marketTranslationLayer.riskGuardianCheck.approvalStatus.replace(/_/g, ' ').toLowerCase()}.`,
        ]
      : ['No council run yet for this country. Run the council before taking this memo to committee.'];
    out.push({ id: 'recommendation', heading: SECTION_LABEL.recommendation, lines });
  }

  if (include.figures) {
    out.push({
      id: 'figures',
      heading: SECTION_LABEL.figures,
      lines: [
        `- Debt / GDP: ${open.imfIndicators.debtToGdpPct.toFixed(1)}%${sampleNote}`,
        `- FX reserves: ${open.worldBankIndicators.fxReservesMonthsImport.toFixed(1)} months of imports${sampleNote}`,
        `- 5Y CDS: ${Math.round(mkt.cds5YSpreadBps)} bps${priceNote}`,
        `- 10Y yield: ${mkt.sovereign10YBondYieldPct.toFixed(2)}%${priceNote}`,
        `- Policy rate: ${mkt.policyRatePct.toFixed(2)}%${priceNote}`,
      ],
    });
  }

  if (include.thesis) {
    const lines: string[] = [];
    // Drop the inline formula references ("(Ref: ...)") used on screen; the memo is for people.
    const clean = (t: string) => t.replace(/\s*\(Ref:[^)]*\)/g, '').trim();
    if (sc?.executiveSummary) lines.push(clean(sc.executiveSummary));
    const vul = sc?.policyResearcherReport.structuralVulnerabilities || [];
    if (vul.length) lines.push(...vul.slice(0, 4).map((v) => `- ${clean(v)}`));
    if (!lines.length) lines.push('No thesis yet. Run the council or write the thesis here.');
    out.push({ id: 'thesis', heading: SECTION_LABEL.thesis, lines });
  }

  if (include.trades) {
    const lines = tickets.length
      ? tickets.map(
          (t) =>
            `- **${t.strategyTitle}** (${t.countryName}). Entry ${t.entrySpreadOrYieldBps} bps, target ${t.targetSpreadOrYieldBps}, stop ${t.stopLossSpreadOrYieldBps}. Expected 12M carry and roll ${t.expected12MCarryRollBps} bps; conviction ${t.convictionScore0To100}/100.`
        )
      : [
          ticketScope === 'country'
            ? `No staged trade tickets for ${run.countryName}. Stage one from a desk, or switch to all tickets.`
            : 'No staged trade tickets.',
        ];
    out.push({ id: 'trades', heading: SECTION_LABEL.trades, lines });
  }

  if (include.portfolio) {
    if (!holdings.length) {
      out.push({
        id: 'portfolio',
        heading: SECTION_LABEL.portfolio,
        lines: ['No holdings imported. Import holdings on the Portfolio page to show the book exposure here.'],
      });
    } else {
      const book = summariseBook(holdings, riskLookup);
      const row = book.rows.find((r) => r.iso3 === run.iso3);
      out.push({
        id: 'portfolio',
        heading: SECTION_LABEL.portfolio,
        lines: [
          `Book: $${book.grossUsdMm.toFixed(0)}mm gross, $${book.netCreditUsdMm.toFixed(0)}mm net credit, credit DV01 $${book.dv01UsdK.toFixed(1)}k per bp.`,
          row
            ? `${run.countryName}: $${row.grossUsdMm.toFixed(1)}mm gross (${(row.weight * 100).toFixed(0)}% of the book), $${row.netCreditUsdMm.toFixed(1)}mm net credit, DV01 $${row.dv01UsdK.toFixed(1)}k per bp, ${(row.riskShare * 100).toFixed(0)}% of book risk.`
            : `No current holdings in ${run.countryName}.`,
        ],
      });
    }
  }

  if (include.risks) {
    const lines: string[] = [];
    const rg = sc?.marketTranslationLayer.riskGuardianCheck;
    if (rg) {
      lines.push(`- Estimated maximum drawdown ${rg.maxDrawdownEstimatePct}%; liquidity haircut ${rg.liquidityHaircutPct}%.`);
      if (rg.tailRiskHedgeInstrument) lines.push(`- Tail hedge: ${rg.tailRiskHedgeInstrument}.`);
      if (rg.factorCrowdingWarning) lines.push(`- Crowding: ${rg.factorCrowdingWarning}`);
    }
    tickets.forEach((t) => t.preMortemKillSwitchRule && lines.push(`- Kill switch, ${t.strategyTitle}: ${t.preMortemKillSwitchRule}`));
    if (!lines.length) lines.push('No risk notes yet.');
    out.push({ id: 'risks', heading: SECTION_LABEL.risks, lines });
  }

  if (include.calendar) {
    const events = upcomingOfficialEvents([run.iso3], 90);
    out.push({
      id: 'calendar',
      heading: SECTION_LABEL.calendar,
      lines: events.length
        ? events.map((e) => `- ${e.date}: ${e.title} (source: ${e.sourceName})`)
        : [`No official dates on file for ${run.countryName} in the next 90 days.`],
    });
  }

  if (include.sources) {
    out.push({
      id: 'sources',
      heading: SECTION_LABEL.sources,
      lines: [
        `Data status: ${DATA_MODE_LABEL[status.mode]}${status.asOf ? `, as of ${formatAsOf(status.asOf)}` : ''}.`,
        status.liveFeeds.length ? `Live feeds: ${status.liveFeeds.join('; ')}.` : 'No live feeds answered; figures are built-in sample values.',
        'Model output for discussion. Not investment advice, and not validated for client use.',
      ],
    });
  }
  return out;
}

function toMarkdown(title: string, author: string, sections: MemoSection[]): string {
  const date = new Date().toISOString().slice(0, 10);
  return [
    `# ${title}`,
    `${date}${author ? ` · ${author}` : ''}`,
    '',
    ...sections.flatMap((s) => [`## ${s.heading}`, '', ...s.lines.flatMap((l) => (l.startsWith('- ') ? [l] : [l, ''])), '']),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Tiny Markdown-to-HTML for the memo's own subset: #, ##, - bullets, **bold**. Input is escaped first. */
function memoMarkdownToHtml(md: string): string {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const html: string[] = [];
  let inList = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('- ')) {
      if (!inList) html.push('<ul>');
      inList = true;
      html.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    if (line.startsWith('## ')) html.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith('# ')) html.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.trim()) html.push(`<p>${inline(line)}</p>`);
  }
  if (inList) html.push('</ul>');
  return html.join('\n');
}

export const IcMemoBuilder: React.FC<IcMemoBuilderProps> = (props) => {
  const { run } = props;
  const [include, setInclude] = useState<Record<SectionId, boolean>>({
    recommendation: true,
    figures: true,
    thesis: true,
    trades: true,
    portfolio: true,
    risks: true,
    calendar: true,
    sources: true,
  });
  const [ticketScope, setTicketScope] = useState<'country' | 'all'>('country');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [edited, setEdited] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const memoTitle = title.trim() || `${run.countryName}: IC memo`;
  const generated = useMemo(
    () => toMarkdown(memoTitle, author.trim(), buildSections(props, include, ticketScope)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.run, props.stagedTickets, props.holdings, props.riskLookup, include, ticketScope, memoTitle, author]
  );
  const memo = edited ?? generated;
  const html = useMemo(() => memoMarkdownToHtml(memo), [memo]);

  const download = () => {
    const blob = new Blob([memo], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${run.iso3}-ic-memo-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${memoTitle.replace(/</g, '&lt;')}</title>
<style>body{font-family:'Public Sans',-apple-system,Segoe UI,sans-serif;max-width:720px;margin:40px auto;color:#0f172a;line-height:1.5;font-size:14px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:22px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
p{margin:6px 0}ul{margin:6px 0;padding-left:20px}li{margin:3px 0}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3" data-no-stat-ref="true" data-no-provenance-overlay="true">
      <section className="ui-panel" aria-label="Memo settings">
        <header className="ui-panel-header">
          <h2 className="ui-section-title">Build the memo</h2>
          <p className="ui-label">Pulls the current country, your tickets, holdings and the official calendar.</p>
        </header>
        <div className="p-4 space-y-4">
          <label className="block ui-label space-y-0.5">
            <span className="block">Title</span>
            <input
              className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder={`${run.countryName}: IC memo`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block ui-label space-y-0.5">
            <span className="block">Author (optional)</span>
            <input
              className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>
          <fieldset className="space-y-1.5">
            <legend className="ui-label mb-1">Sections</legend>
            {(Object.keys(SECTION_LABEL) as SectionId[]).map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                <input type="checkbox" checked={include[id]} onChange={(e) => setInclude({ ...include, [id]: e.target.checked })} />
                {SECTION_LABEL[id]}
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-1.5">
            <legend className="ui-label mb-1">Trade tickets</legend>
            <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
              <input type="radio" name="memo-scope" checked={ticketScope === 'country'} onChange={() => setTicketScope('country')} />
              {run.countryName} only
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
              <input type="radio" name="memo-scope" checked={ticketScope === 'all'} onChange={() => setTicketScope('all')} />
              All staged tickets
            </label>
          </fieldset>
          <p className="ui-label">To write a memo on another country, switch country from the Countries page, then come back.</p>
        </div>
      </section>

      <section className="ui-panel xl:col-span-2" aria-label="Memo">
        <header className="ui-panel-header flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="ui-section-title">Memo</h2>
            <p className="ui-label">{edited !== null ? 'Edited by you. Settings changes are paused until you reset.' : 'Edit the text below before you share it.'}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {edited !== null && (
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setEdited(null)}>
                Reset to generated
              </button>
            )}
            <button type="button" className="ui-btn" onClick={copy}>
              <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="ui-btn" onClick={download}>
              <Download className="w-3.5 h-3.5" /> Markdown
            </button>
            <button type="button" className="ui-btn ui-btn-primary" onClick={print}>
              <Printer className="w-3.5 h-3.5" /> Print or save PDF
            </button>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="p-4">
            <label htmlFor="memo-text" className="ui-label block mb-1">
              Text
            </label>
            <textarea
              id="memo-text"
              value={memo}
              onChange={(e) => setEdited(e.target.value)}
              rows={28}
              className="w-full px-2 py-1.5 text-xs font-code border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="p-4">
            <div className="ui-label mb-1">Preview</div>
            <article
              className="ic-memo-preview text-sm text-slate-800 dark:text-slate-200 space-y-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-slate-900 dark:[&_h1]:text-white [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:pb-1 [&_h2]:border-b [&_h2]:border-slate-200 dark:[&_h2]:border-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
