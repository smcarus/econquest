import React from 'react';
import type { ForwardMonthRow } from '../utils/forwardRecord';

/**
 * Models & validation > Track record: the forward record month by month (CG5). Calls written down
 * before their figure existed, and calls scored, for each passing test; nothing here is a backtest.
 */
export const ForwardMonthlyTable: React.FC<{ rows?: ForwardMonthRow[] }> = ({ rows }) => (
  <section className="space-y-1" data-forward-monthly="true">
    <h3 className="ui-section-title">Forward record by month</h3>
    <p className="text-xs text-slate-500 dark:text-slate-400">
      Calls written down before their figure existed, and calls scored when it came out, for every test that passed. Before each GDP release on the calendar the tests run early, so a passing nowcast is on record first. A call beats the benchmark when it is closer to the first published figure.
    </p>
    {!rows?.length ? (
      <p className="text-sm text-slate-600 dark:text-slate-300">No forward calls yet: they start with the first run after a test passes.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="text-xs tabular-nums">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="pr-3">Month</th>
              <th className="pr-3">Test</th>
              <th className="pr-3">Calls written</th>
              <th className="pr-3">Scored</th>
              <th className="pr-3">Beat the benchmark</th>
              <th>Average gain (points)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.month}-${r.test}`}>
                <td className="pr-3">{r.month}</td>
                <td className="pr-3">{r.test}</td>
                <td className="pr-3">{r.called}</td>
                <td className="pr-3">{r.scored}</td>
                <td className="pr-3">{r.scored ? `${r.hits} of ${r.scored}` : 'none scored'}</td>
                <td>{r.meanGain === null ? 'none scored' : r.meanGain}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
