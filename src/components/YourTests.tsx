import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useT } from '../i18n/useLang';
import { YOUR_TESTS } from '../i18n/messages/yourTests';
import type { MethodParams, UserTestProblem, UserTestSpec } from '../utils/userTests';
import type { BacktestResult } from '../utils/backtest';
import type { HolmReading } from '../utils/multipleTesting';

/**
 * Menu > Models & validation > Your tests (plan item L4a): register a test of your own, frozen on
 * saving (src/utils/userTests.ts, src/server/routes/userTests.ts). Every threshold starts blank;
 * the app's own registered value is shown beside it as a reference only.
 */

interface Reply {
  methods: MethodParams[];
  tests: Array<{ file: string; hash: string; problem?: string; spec: UserTestSpec | null }>;
  results: Record<string, BacktestResult>;
  holm: Record<string, HolmReading>;
  running: boolean;
  lastRun: { at: string; problems: string[] } | null;
  folder: string;
}

type PassKey = 'minCases' | 'minLiftPts' | 'maxPValue' | 'minYears' | 'minSeriesShare';
const PASS_KEYS: PassKey[] = ['minCases', 'minLiftPts', 'maxPValue', 'minYears', 'minSeriesShare'];

const inputCls = 'w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white';

export const YourTests: React.FC = () => {
  const t = useT(YOUR_TESTS);
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [name, setName] = useState('');
  const [method, setMethod] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pass, setPass] = useState<Partial<Record<PassKey, string>>>({});
  const [limits, setLimits] = useState('');
  const [problems, setProblems] = useState<UserTestProblem[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const load = () =>
    fetch('/api/user-tests')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: Reply) => setReply(j))
      .catch((e) => setError(String(e?.message || e)));
  useEffect(() => {
    void load();
  }, []);
  // While a run is going, look again every few seconds until it ends.
  useEffect(() => {
    if (!reply?.running) return;
    const id = window.setTimeout(() => void load(), 4000);
    return () => window.clearTimeout(id);
  }, [reply]);

  const runAll = async () => {
    setError(null);
    try {
      const r = await fetch('/api/user-tests/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok && r.status !== 409) {
        const j = await r.json().catch(() => ({}));
        setError(t('runFailed', { error: j.error || `HTTP ${r.status}` }));
      }
    } catch (e) {
      setError(t('runFailed', { error: String((e as Error)?.message || e) }));
    }
    void load();
  };

  const m = reply?.methods.find((x) => x.method === method);
  const methodLabel = (id: string) => t(`method_${id}` as 'method_taylor_gap');
  const passLabel = (k: PassKey) => t(k);
  const problemText = (p: UserTestProblem) => {
    switch (p.code) {
      case 'param_missing':
      case 'param_nan':
        return t(`pr_${p.code}`, { key: p.key });
      case 'pass_missing':
      case 'pass_range':
        return t(`pr_${p.code}`, { key: passLabel(p.key) });
      default:
        return t(`pr_${p.code}` as 'pr_name');
    }
  };

  const reset = () => {
    setName('');
    setMethod('');
    setHypothesis('');
    setParams({});
    setFrom('');
    setTo('');
    setPass({});
    setLimits('');
    setProblems([]);
  };

  const save = async () => {
    setSaving(true);
    setProblems([]);
    setError(null);
    try {
      const r = await fetch('/api/user-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, method, hypothesis, params, from, to, passMark: pass, knownLimits: limits }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 400 && Array.isArray(j.problems)) setProblems(j.problems);
      else if (r.status === 409) setError(t('exists'));
      else if (!r.ok) setError(t('failed', { error: j.error || `HTTP ${r.status}` }));
      else {
        setDone(t('saved', { id: j.id, date: j.registeredOn, hash: String(j.hash).slice(0, 12) }));
        reset();
        setForm(false);
        void load();
      }
    } catch (e) {
      setError(t('failed', { error: String((e as Error)?.message || e) }));
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string, child: React.ReactNode, hint?: string) => (
    <label className="block text-xs space-y-0.5">
      <span className="text-slate-600 dark:text-slate-300">{text}</span>
      {child}
      {hint && <span className="block text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );

  return (
    <section className="space-y-3" data-your-tests="true">
      <p className="text-sm">{t('intro')}</p>
      {done && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" data-your-test-saved="true">
          {done}
        </p>
      )}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      {reply && !reply.tests.length && <p className="text-xs text-slate-500 dark:text-slate-400">{t('none')}</p>}
      {reply && reply.tests.length > 0 && (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800" data-your-test-list="true">
          {reply.tests.map((x) => (
            <li key={x.file} className="py-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium inline-flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                  {x.spec?.id ?? x.file}
                </span>
                {x.spec && <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('registeredOn', { date: x.spec.registeredOn })}</span>}
              </div>
              {x.spec ? (
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{x.spec.hypothesis}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {methodLabel(x.spec.method)} · {Object.entries(x.spec.params).map(([k, v]) => `${k} ${v}`).join(', ')} · {t('fingerprint', { hash: x.hash.slice(0, 12) })}
                  </p>
                  {(() => {
                    const key = `${x.spec.id} v${x.spec.version}`;
                    const r = reply.results[key];
                    if (!r) return <p className="text-xs text-slate-500 dark:text-slate-400">{t('notRun')}</p>;
                    const h = reply.holm[key];
                    return (
                      <div className="text-xs" data-your-test-result={key}>
                        <p className={r.status === 'passed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                          {t('result', { status: t(`st_${r.status}`), cases: String(r.cases), hit: String(r.hitRatePct), base: String(r.baseRatePct), p: String(Number(r.pValue.toPrecision(3))), date: r.ranAt.slice(0, 10) })}
                        </p>
                        <p className="text-slate-600 dark:text-slate-300">{r.verdict}</p>
                        {h && <p className="text-slate-500 dark:text-slate-400">{t('holmLine', { adj: String(h.adjusted), n: String(h.tested), holds: h.holds ? t('holds') : t('notHolds'), alpha: String(h.alpha) })}</p>}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400">{t('refused', { problem: x.problem || '' })}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {reply && reply.tests.some((x) => x.spec) && (
        <div className="space-y-1">
          <button type="button" className="ui-btn ui-btn-ghost" onClick={() => void runAll()} disabled={reply.running} data-your-tests-run="true">
            {t('runAll')}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">{reply.running ? t('runningNow') : t('runNote')}</p>
          {!reply.running && reply.lastRun?.problems?.length ? <p className="text-xs text-amber-700 dark:text-amber-400">{t('lastProblems', { problems: reply.lastRun.problems.join(' · ') })}</p> : null}
        </div>
      )}

      {!form ? (
        <button type="button" className="ui-btn ui-btn-primary" onClick={() => { setForm(true); setDone(null); }} disabled={!reply} data-your-test-new="true">
          {t('registerNew')}
        </button>
      ) : (
        <div className="space-y-3 border border-slate-200 dark:border-slate-800 p-3" data-your-test-form="true">
          {label(t('name'), <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} data-your-test-field="name" />, t('nameHint'))}
          {label(
            t('method'),
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)} data-your-test-field="method">
              <option value="">{t('pickMethod')}</option>
              {reply?.methods.map((x) => (
                <option key={x.method} value={x.method}>
                  {methodLabel(x.method)}
                </option>
              ))}
            </select>,
            m ? t('methodRef', { test: m.appTest }) : undefined
          )}
          {label(t('hypothesis'), <textarea className={inputCls} rows={3} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} data-your-test-field="hypothesis" />)}
          {m && (
            <fieldset className="space-y-1">
              <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('thresholds')}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {m.keys.map((k) => (
                  <React.Fragment key={k}>
                    {label(
                      k,
                      <input className={inputCls} inputMode="decimal" placeholder={t('missing')} value={params[k] ?? ''} onChange={(e) => setParams((p) => ({ ...p, [k]: e.target.value }))} data-your-test-param={k} />,
                      t('appValue', { value: String(m.appValues[k]) })
                    )}
                  </React.Fragment>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="space-y-1">
            <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('sample')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {label(t('from'), <input className={inputCls} placeholder={t('missing')} value={from} onChange={(e) => setFrom(e.target.value)} data-your-test-field="from" />, m ? t('appFrom', { from: m.appFrom }) : undefined)}
              {label(t('to'), <input className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} data-your-test-field="to" />)}
            </div>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('passMark')}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PASS_KEYS.map((k) => (
                <React.Fragment key={k}>
                  {label(passLabel(k), <input className={inputCls} inputMode="decimal" placeholder={k === 'minYears' || k === 'minSeriesShare' ? '' : t('missing')} value={pass[k] ?? ''} onChange={(e) => setPass((p) => ({ ...p, [k]: e.target.value }))} data-your-test-pass={k} />)}
                </React.Fragment>
              ))}
            </div>
          </fieldset>
          {label(t('limits'), <textarea className={inputCls} rows={2} value={limits} onChange={(e) => setLimits(e.target.value)} data-your-test-field="limits" />)}
          {problems.length > 0 && (
            <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-400" data-your-test-problems="true">
              {problems.map((p, i) => (
                <li key={i}>{problemText(p)}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" aria-hidden /> {t('frozenWarn')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => void save()} disabled={saving} data-your-test-save="true">
              {saving ? t('saving') : t('save')}
            </button>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => { reset(); setForm(false); }}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
