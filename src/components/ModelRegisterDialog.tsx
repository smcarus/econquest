/**
 * Menu > Models & validation: the register of every rule that turns figures into a call, with its
 * status. A status other than Not validated / Descriptive / Model-assisted comes only from a
 * pre-registered backtest. See src/data/modelRegister.ts.
 */
import { useEffect, useRef, useState } from 'react';
import { Download, Play, ShieldQuestion, X } from 'lucide-react';
import { MODEL_REGISTER, REGISTER_HEADER, registerRows, STATUS_LABEL, type ValidationStatus } from '../data/modelRegister';
import { ValidationBadge } from './ValidationBadge';
import { effectiveStatus, runValidation, useValidation, type ValidationReply } from './useValidation';

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function downloadCsv(v: ValidationReply | null) {
  const rows = registerRows(MODEL_REGISTER, (id) => {
    const r = v?.results?.[id];
    return r ? { status: r.status, text: `${r.verdict} Test v${r.specVersion}, hash ${r.specHash}, run ${r.ranAt}.` } : undefined;
  });
  const text = '\uFEFF' + [REGISTER_HEADER, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `econquest-model-register-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ModelRegisterDialog({ focusId, onClose }: { focusId?: string | null; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(focusId ?? null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (focusId) document.getElementById(`register-${focusId}`)?.scrollIntoView({ block: 'center' });
  }, [focusId]);

  const v = useValidation();
  const [runError, setRunError] = useState<string | null>(null);
  const counts = MODEL_REGISTER.reduce<Partial<Record<ValidationStatus, number>>>((acc, e) => {
    const s = effectiveStatus(e.id, e.status, v);
    return { ...acc, [s]: (acc[s] ?? 0) + 1 };
  }, {});
  const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="model-register-title" className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 id="model-register-title" className="ui-title inline-flex items-center gap-2">
            <ShieldQuestion className="w-4 h-4" aria-hidden /> Models & validation
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close models and validation" className="ui-btn ui-btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-y-auto ui-body">
          <p>
            Every rule in the app that turns figures into a call. A rule is marked passed or failed only by a backtest
            whose pass mark was fixed before it ran. Until then it reads Not validated, wherever it shows.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400" data-register-counts>
            {(Object.keys(STATUS_LABEL) as ValidationStatus[])
              .filter((s) => counts[s])
              .map((s) => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`)
              .join(' · ')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={v?.running}
              onClick={async () => {
                setRunError(null);
                setRunError(await runValidation());
              }}
              className="ui-btn ui-btn-primary inline-flex items-center gap-1 disabled:opacity-60"
              data-run-backtests
            >
              <Play className="w-3.5 h-3.5" aria-hidden /> {v?.running ? 'Running backtests…' : 'Run backtests'}
            </button>
            <button type="button" onClick={() => downloadCsv(v)} className="ui-btn ui-btn-ghost inline-flex items-center gap-1">
              <Download className="w-3.5 h-3.5" aria-hidden /> CSV
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400" data-backtest-status>
            {v?.lastRun ? `Backtests last run ${when(v.lastRun.at)}.` : 'Backtests not run yet on this computer.'} They pull the long free histories (BIS policy rates since 1990, OECD leading indicator, CFTC since 2006), so they need a connection and take a minute or two. Same as `npm run backtest`.
          </p>
          {runError && <p className="text-rose-600 dark:text-rose-400">{runError}</p>}
          {v?.lastRun?.problems?.length ? <p className="text-amber-700 dark:text-amber-300">Last run: {v.lastRun.problems.join(' · ')}</p> : null}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {MODEL_REGISTER.map((e) => (
              <li key={e.id} id={`register-${e.id}`} className="py-2">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id} className="text-left">
                    <span className="block">{e.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {e.use} · {e.says}
                    </span>
                  </button>
                  <ValidationBadge id={e.id} />
                </div>
                {open === e.id && (
                  <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <dt className="text-slate-500 dark:text-slate-400">Rule</dt>
                    <dd>{e.method}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Reads</dt>
                    <dd>{e.inputs}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Shows in</dt>
                    <dd>{e.where}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">How it is tested</dt>
                    <dd>{e.testPlan}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Limits</dt>
                    <dd>{e.limits}</dd>
                    <dt className="text-slate-500 dark:text-slate-400">Code</dt>
                    <dd className="break-all">{e.code}</dd>
                    {(() => {
                      const spec = v?.specs.find((x) => x.id === e.id || x.file === `${e.id}.json`);
                      const r = v?.results?.[e.id];
                      return (
                        <>
                          {spec && (
                            <>
                              <dt className="text-slate-500 dark:text-slate-400">Pre-registered test</dt>
                              <dd>
                                {spec.problem ? (
                                  <span className="text-rose-600 dark:text-rose-400">{spec.file}: {spec.problem}.</span>
                                ) : (
                                  <>
                                    Version {spec.version}, registered {spec.registeredOn}. {spec.hypothesis} Pass mark: at least {spec.passMark?.minCases} cases, a lift of {spec.passMark?.minLiftPts} points or more over the base rate, p at or below {spec.passMark?.maxPValue}. Sample from {spec.sample?.from}.{' '}
                                    <span className="break-all text-slate-400 dark:text-slate-500">docs/validation/preregistered/{spec.file} · SHA-256 {spec.hash}</span>
                                    {spec.knownLimits?.length ? <span className="block mt-1">Known limits, stated before the run: {spec.knownLimits.join(' ')}</span> : null}
                                  </>
                                )}
                              </dd>
                            </>
                          )}
                          {r && (
                            <>
                              <dt className="text-slate-500 dark:text-slate-400">Latest verdict</dt>
                              <dd data-backtest-verdict={e.id}>
                                {r.verdict} {r.series.length} series, {r.span.from} to {r.span.to}. Run {when(r.ranAt)} on test version {r.specVersion}
                                {spec?.hash && spec.hash !== r.specHash ? ' (the test file has changed since: run again)' : ''}.
                                <span className="block text-slate-400 dark:text-slate-500">{r.data}</span>
                              </dd>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
