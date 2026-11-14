import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DISCOUNT_RATES } from '../data/discountRates';
import { COUNCIL_SIZE_LABEL, COUNCIL_SIZE_UNITS, type CouncilSizeUnit, type PolicyReview, type ReviewFrame, type ReviewStep, type StepState } from '../utils/policyReview';
import { costBenefitResults, councilPartState, type CbLine, type CostBenefit, type CouncilPart } from '../utils/policyCouncil';
import { useT, useTx } from '../i18n/useLang';
import { REPORTS } from '../i18n/messages/reports';

/**
 * Policy review > Policy council (PK2 to PK5), shown when the frame names one measure to weigh.
 * Every figure is entered by the user with its source; the app only does the arithmetic. Each part
 * is saved beside the steps, hashed, audited and tied to the frame (src/utils/policyCouncil.ts).
 */

const INPUT = 'w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white';
type Saved = (out: { review: PolicyReview; states: Record<ReviewStep, StepState> }) => Promise<void>;

async function postPart(id: string, part: CouncilPart, content: unknown) {
  const res = await fetch(`/api/reviews/${encodeURIComponent(id)}/council/${part}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `The app answered ${res.status}.`);
  return body;
}

const fmt = (v: number, d = 2) => v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });

type LineDraft = { kind: 'cost' | 'benefit'; label: string; values: string; source: string; link: string };
const toDraft = (l: CbLine): LineDraft => ({ kind: l.kind, label: l.label, values: l.values.join(', '), source: l.source, link: l.link ?? '' });

const CostBenefitPanel: React.FC<{ review: PolicyReview; frame: ReviewFrame; changed: boolean; onSaved: Saved }> = ({ review, frame, changed, onSaved }) => {
  const t = useT(REPORTS);
  const tx = useTx();
  const rec = review.councilParts?.costBenefit;
  const saved = rec?.content as CostBenefit | undefined;
  const state = councilPartState(rec, review.steps.frame?.hash);
  const defaultYear = Number((frame.council?.start ?? frame.asOf).slice(0, 4));
  const [unit, setUnit] = useState<CouncilSizeUnit>('lcu_bn');
  const [firstYear, setFirstYear] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [rateIds, setRateIds] = useState<string[]>([]);
  const [ownRate, setOwnRate] = useState('');
  const [ownRateSource, setOwnRateSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setUnit(saved?.unit ?? frame.council?.size?.unit ?? 'lcu_bn');
    setFirstYear(String(saved?.firstYear ?? defaultYear));
    setLines(saved ? saved.lines.map(toDraft) : [{ kind: 'cost', label: '', values: '', source: '', link: '' }]);
    setRateIds(saved?.rateIds ?? []);
    setOwnRate(saved?.ownRate !== undefined ? String(saved.ownRate) : '');
    setOwnRateSource(saved?.ownRateSource ?? '');
    setError('');
  }, [review.id, rec?.hash]);
  const results = useMemo(() => (saved ? costBenefitResults(saved) : null), [saved]);

  const set = (i: number, patch: Partial<LineDraft>) => setLines((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const content = {
        unit,
        firstYear,
        lines: lines.map((l) => ({ kind: l.kind, label: l.label, values: l.values, source: l.source, ...(l.link.trim() ? { link: l.link } : {}) })),
        rateIds,
        ...(ownRate.trim() ? { ownRate, ownRateSource } : {}),
      };
      await onSaved(await postPart(review.id, 'costBenefit', content));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const unitText = tx(COUNCIL_SIZE_LABEL[saved?.unit ?? unit]);

  return (
    <div className="space-y-2" data-council-part="costBenefit">
      <p className="ui-section-title">{t('pk_cbTitle')}</p>
      <p className="ui-label">{t('pk_cbHint')}</p>
      {changed && <p className="text-xs text-amber-700 dark:text-amber-400">{t('pk_changed')}</p>}
      {rec && state === 'out_of_date' && <p className="text-xs text-amber-700 dark:text-amber-400">{t('pk_outOfDate')}</p>}
      <div className="grid gap-1.5 sm:grid-cols-2">
        <label className="ui-label">
          {t('pk_unit')}
          <select className={INPUT} value={unit} onChange={(e) => setUnit(e.target.value as CouncilSizeUnit)}>
            {COUNCIL_SIZE_UNITS.map((u) => (
              <option key={u} value={u}>
                {tx(COUNCIL_SIZE_LABEL[u])}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-label">
          {t('pk_firstYear')}
          <input className={INPUT} inputMode="numeric" value={firstYear} maxLength={4} onChange={(e) => setFirstYear(e.target.value)} />
        </label>
      </div>
      {unit === 'pct_gdp' && <p className="ui-label">{t('pk_gdpNote')}</p>}
      {lines.map((l, i) => (
        <div key={i} className="grid gap-1.5 sm:grid-cols-2 border border-slate-200 dark:border-slate-700 p-2" data-council-line={i}>
          <label className="ui-label">
            {t('pk_kind')}
            <select className={INPUT} value={l.kind} onChange={(e) => set(i, { kind: e.target.value as LineDraft['kind'] })}>
              <option value="cost">{t('pk_cost')}</option>
              <option value="benefit">{t('pk_benefit')}</option>
            </select>
          </label>
          <label className="ui-label">
            {t('pk_label')}
            <input className={INPUT} value={l.label} maxLength={120} onChange={(e) => set(i, { label: e.target.value })} />
          </label>
          <label className="ui-label sm:col-span-2">
            {t('pk_values')}
            <input className={INPUT} value={l.values} placeholder={t('pk_valuesPh')} onChange={(e) => set(i, { values: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_source')}
            <input className={INPUT} value={l.source} maxLength={300} onChange={(e) => set(i, { source: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_link')}
            <input className={INPUT} value={l.link} maxLength={400} onChange={(e) => set(i, { link: e.target.value })} />
          </label>
          <div>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setLines((x) => x.filter((_, j) => j !== i))}>
              <Trash2 className="w-3.5 h-3.5" /> {t('pk_remove')}
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="ui-btn" onClick={() => setLines((x) => [...x, { kind: 'benefit', label: '', values: '', source: '', link: '' }])}>
        <Plus className="w-3.5 h-3.5" /> {t('pk_addLine')}
      </button>

      <fieldset className="space-y-1" data-council-rates="true">
        <legend className="ui-label">{t('pk_rates')}</legend>
        {DISCOUNT_RATES.map((r) => (
          <label key={r.id} className="flex gap-2 text-xs text-slate-800 dark:text-slate-200">
            <input type="checkbox" checked={rateIds.includes(r.id)} onChange={(e) => setRateIds((x) => (e.target.checked ? [...x, r.id] : x.filter((y) => y !== r.id)))} />
            <span>
              <span className="font-semibold">{r.label}</span>: {tx(r.appliesTo)}.{' '}
              <a href={r.link} target="_blank" rel="noopener noreferrer" className="underline" title={r.quote}>
                {r.citation}
              </a>
            </span>
          </label>
        ))}
        <div className="grid gap-1.5 sm:grid-cols-2">
          <label className="ui-label">
            {t('pk_ownRate')}
            <input className={INPUT} inputMode="decimal" value={ownRate} maxLength={6} onChange={(e) => setOwnRate(e.target.value)} />
          </label>
          <label className="ui-label">
            {t('pk_ownRateSource')}
            <input className={INPUT} value={ownRateSource} maxLength={300} onChange={(e) => setOwnRateSource(e.target.value)} />
          </label>
        </div>
      </fieldset>
      <button type="button" className="ui-btn ui-btn-primary" disabled={busy} onClick={save}>
        <Save className="w-3.5 h-3.5" /> {busy ? t('pk_saving') : t('pk_save')}
      </button>
      {error && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
          {error}
        </p>
      )}

      {saved && results && (
        <div className="space-y-1" data-council-results="costBenefit">
          <p className="ui-label">{t('pk_results', { unit: unitText, year: String(saved.firstYear) })}</p>
          <div className="overflow-x-auto">
            <table className="text-xs tabular-nums w-full">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pr-2">{t('pk_colRate')}</th>
                  <th className="pr-2">{t('pk_colPvCosts')}</th>
                  <th className="pr-2">{t('pk_colPvBenefits')}</th>
                  <th className="pr-2">{t('pk_colNpv')}</th>
                  <th className="pr-2">{t('pk_colBcr')}</th>
                  <th className="pr-2">{t('pk_colBreakEven')}</th>
                  <th>{t('pk_colSwitch')}</th>
                </tr>
              </thead>
              <tbody className="text-slate-900 dark:text-white">
                {results.results.map((x) => (
                  <tr key={x.id} data-council-rate={x.id}>
                    <td className="pr-2">{x.id === 'own' ? `${t('pk_own')} (${x.rateText})` : x.label}</td>
                    <td className="pr-2">{fmt(x.pvCosts)}</td>
                    <td className="pr-2">{fmt(x.pvBenefits)}</td>
                    <td className="pr-2 font-semibold">{fmt(x.npv)}</td>
                    <td className="pr-2">{x.bcr === null ? t('pk_none') : fmt(x.bcr)}</td>
                    <td className="pr-2">{x.breakEvenYear ?? t('pk_never')}</td>
                    <td>{x.switchPct === null ? t('pk_none') : x.switchWhat === 'costs_rise' ? t('pk_switchCosts', { p: fmt(x.switchPct, 1) }) : t('pk_switchBenefits', { p: fmt(x.switchPct, 1) })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200">{results.flip === null ? t('pk_noFlip') : t('pk_flip', { r: fmt(results.flip, 2) })}</p>
          <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300">
            {saved.lines.map((l, i) => (
              <li key={i}>
                {l.kind === 'cost' ? t('pk_cost') : t('pk_benefit')}: {l.label} ({l.source}
                {l.link ? (
                  <>
                    ,{' '}
                    <a href={l.link} target="_blank" rel="noopener noreferrer" className="underline">
                      {t('pk_link')}
                    </a>
                  </>
                ) : null}
                )
              </li>
            ))}
            {saved.ownRate !== undefined && <li>{t('pk_ownRateLine', { r: String(saved.ownRate), source: saved.ownRateSource || t('pk_noSource') })}</li>}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('pk_saved', { when: rec!.savedAt.slice(0, 16).replace('T', ' '), hash: rec!.hash.slice(0, 12) })}</p>
        </div>
      )}
      <p className="ui-label">{t('pk_cbMethod')}</p>
    </div>
  );
};

export const PolicyCouncil: React.FC<{ review: PolicyReview; frame: ReviewFrame; changed?: string[]; onSaved: Saved }> = ({ review, frame, changed, onSaved }) => {
  const t = useT(REPORTS);
  return (
    <div className="space-y-4" data-policy-council="true">
      <p className="ui-label">{t('pk_label2')}</p>
      <CostBenefitPanel review={review} frame={frame} changed={Boolean(changed?.includes('costBenefit'))} onSaved={onSaved} />
    </div>
  );
};
