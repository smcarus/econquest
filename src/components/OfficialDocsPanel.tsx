import React, { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { DocSource, OfficialDoc } from '../utils/officialDocs';

/**
 * Country Research > Policy & people > Official documents (CG17, src/utils/officialDocs.ts): the
 * newest World Bank documents about the country and BIS central bankers' speeches that name it,
 * each linked to the publisher's own page. Titles are the publishers' words.
 */
type Reply = { iso3: string; worldbank: OfficialDoc[]; routineLeftOut: number; speeches: OfficialDoc[]; problems: string[]; labels: Record<DocSource, string> };

function DocList({ docs, empty }: { docs: OfficialDoc[]; empty: string }) {
  if (!docs.length) return <p className="text-xs text-slate-500 dark:text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {docs.map((d) => (
        <li key={d.url}>
          <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400 mr-2">{d.date}</span>
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">
            {d.title}
          </a>
          <span className="text-xs text-slate-500 dark:text-slate-400"> · {d.type}</span>
          {d.pdfUrl && (
            <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs underline inline-flex items-center gap-0.5">
              PDF <ExternalLink className="w-3 h-3" aria-hidden />
            </a>
          )}
          {d.note && <p className="text-xs text-slate-500 dark:text-slate-400">{d.note}</p>}
        </li>
      ))}
    </ul>
  );
}

export const OfficialDocsPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/official-docs?iso3=${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);
  return (
    <section className="ui-panel" data-official-docs="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Official documents: {countryName}
        </h2>
      </header>
      <div className="p-3 space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">The newest documents from the World Bank and speeches by central bankers that name {countryName}. Titles are the publishers' own; open the link to read the document on the publisher's site.</p>
        {error && <p className="text-xs text-rose-600 dark:text-rose-400">Missing: the documents did not load ({error}).</p>}
        {!reply && !error && <p className="text-xs text-slate-500">Loading…</p>}
        {reply?.problems.map((p) => (
          <p key={p} className="text-xs text-amber-700 dark:text-amber-400">
            Missing: {p}
          </p>
        ))}
        {reply && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{reply.labels.worldbank}</h3>
              {reply.routineLeftOut > 0 && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{reply.routineLeftOut} routine project filings (status reports, procurement and safeguard papers) left out of the newest batch.</p>}
              <DocList docs={reply.worldbank} empty="No recent economic or policy documents in the newest batch." />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{reply.labels.bis}</h3>
              <DocList docs={reply.speeches} empty={`None of the speeches in the BIS feed (the latest few weeks) names ${countryName} or its central bank.`} />
            </div>
          </>
        )}
      </div>
    </section>
  );
};
