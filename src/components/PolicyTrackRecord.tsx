/**
 * Menu > Models & validation > Track record > Policy track record (roadmap P1): every automatic
 * outcome check of a saved policy review, 12 and 24 months after its As of day, with its result
 * (Hit, Miss, Too early, Missing) and the reason. See src/utils/outcomeChecks.ts.
 * Loaded only when the track record is opened.
 */
import React, { useEffect, useState } from 'react';
import { VERDICT_LABEL, type CheckMonths, type CheckTally, type CheckVerdict, type OutcomeCheck } from '../utils/outcomeChecks';

interface Row {
  id: string;
  title: string;
  iso3: string;
  asOf: string;
  checks: OutcomeCheck[];
  next: { months: CheckMonths; due: string } | null;
  changed: number[];
}

interface Reply {
  rows: Row[];
  tally: CheckTally;
  sentence: string;
  caveat: string;
}

const VERDICT_CLASS: Record<CheckVerdict, string> = {
  hit: 'text-emerald-700 dark:text-emerald-400',
  miss: 'text-rose-700 dark:text-rose-400',
  too_early: 'text-slate-500 dark:text-slate-400',
  missing: 'text-amber-700 dark:text-amber-300',
};

export function PolicyTrackRecord() {
  const [data, setData] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/reviews/track-record')
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        return j as Reply;
      })
      .then((j) => live && setData(j))
      .catch((e) => live && setError(`Could not load the policy track record (${e?.message || e}).`));
    return () => {
      live = false;
    };
  }, []);
  const rows = data?.rows.filter((r) => r.checks.length || r.next) ?? [];
  return (
    <section data-policy-track-record className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
      <h3 className="ui-section-title">Policy track record</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Each saved policy review is checked on its own 12 and 24 months after its As of day: was the goal written in its frame met?
      </p>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      {data && (
        <p className="text-xs text-slate-600 dark:text-slate-300" data-policy-track-summary>
          {data.sentence}
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-1 pr-2 font-normal">Review</th>
                <th className="py-1 pr-2 font-normal">Check</th>
                <th className="py-1 pr-2 font-normal">Result</th>
                <th className="py-1 font-normal">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.flatMap((r) => [
                ...r.checks.map((c, i) => (
                  <tr key={`${r.id}-${i}`} data-policy-check={c.verdict}>
                    <td className="py-1 pr-2 align-top">
                      <span className="block">{r.title}</span>
                      {r.changed.includes(i) && <span className="block text-rose-600 dark:text-rose-400">Changed since it was saved: the hash no longer matches.</span>}
                    </td>
                    <td className="py-1 pr-2 align-top whitespace-nowrap">
                      {c.months} months, {c.due}
                      {c.checkedOn > c.due ? <span className="block text-slate-400 dark:text-slate-500">made {c.checkedOn}</span> : null}
                    </td>
                    <td className={`py-1 pr-2 align-top whitespace-nowrap ${VERDICT_CLASS[c.verdict]}`}>{VERDICT_LABEL[c.verdict]}</td>
                    <td className="py-1 align-top">
                      {c.reason}
                      {c.now?.source ? <span className="block text-slate-400 dark:text-slate-500">Source: {c.now.source}</span> : null}
                    </td>
                  </tr>
                )),
                ...(r.next
                  ? [
                      <tr key={`${r.id}-next`} className="text-slate-500 dark:text-slate-400" data-policy-check="next">
                        <td className="py-1 pr-2 align-top">{r.title}</td>
                        <td className="py-1 pr-2 align-top whitespace-nowrap">
                          {r.next.months} months, {r.next.due}
                        </td>
                        <td className="py-1 pr-2 align-top whitespace-nowrap">Not due yet</td>
                        <td className="py-1 align-top">Checked on its own on that day, from the pull saved on or before it.</td>
                      </tr>,
                    ]
                  : []),
              ])}
            </tbody>
          </table>
        </div>
      )}
      {data && <p className="text-xs text-slate-500 dark:text-slate-400">{data.caveat} Kept in data/local/reviews.json with each review; each check is saved once, chained by hash, and never changed.</p>}
    </section>
  );
}
