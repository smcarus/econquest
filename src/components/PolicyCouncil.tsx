import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DISCOUNT_RATES } from '../data/discountRates';
import { COUNCIL_SIZE_LABEL, COUNCIL_SIZE_UNITS, type CouncilSizeUnit, type PolicyReview, type ReviewFrame, type ReviewStep, type StepState } from '../utils/policyReview';
import { costBenefitResults, councilPartState, GROUP_EFFECTS, GROUP_SUGGESTIONS, groupTally, chainTally, LINK_BASES, LINK_DIRECTIONS, type ChainLink, type EffectChain, type LinkBasis, type LinkDirection, type CbLine, type CostBenefit, type CouncilPart, type GroupEffect, type WinnersLosers } from '../utils/policyCouncil';
import { incidence, QUINTILES, type IncomeShares } from '../utils/policyIncidence';
import type { Diagnosis } from '../utils/reviewDiagnosis';
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

type GroupDraft = { group: string; effect: GroupEffect; why: string; size: string; sizeUnit: string; source: string; link: string };
const EMPTY_GROUP: GroupDraft = { group: '', effect: 'loses', why: '', size: '', sizeUnit: '', source: '', link: '' };

const GroupsPanel: React.FC<{ review: PolicyReview; frame: ReviewFrame; changed: boolean; onSaved: Saved }> = ({ review, frame, changed, onSaved }) => {
  const t = useT(REPORTS);
  const tx = useTx();
  const rec = review.councilParts?.groups;
  const saved = rec?.content as WinnersLosers | undefined;
  const state = councilPartState(rec, review.steps.frame?.hash);
  const [rows, setRows] = useState<GroupDraft[]>([]);
  const [useFifths, setUseFifths] = useState(false);
  const [direction, setDirection] = useState<'pay' | 'gain'>('pay');
  const [fSize, setFSize] = useState('');
  const [shares, setShares] = useState<string[]>(Array(QUINTILES).fill(''));
  const [fSource, setFSource] = useState('');
  const [income, setIncome] = useState<IncomeShares | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setRows(saved ? saved.rows.map((r) => ({ group: r.group, effect: r.effect, why: r.why, size: r.size !== undefined ? String(r.size) : '', sizeUnit: r.sizeUnit ?? '', source: r.source ?? '', link: r.link ?? '' })) : [{ ...EMPTY_GROUP }]);
    setUseFifths(Boolean(saved?.fifths));
    setDirection(saved?.fifths?.direction ?? 'pay');
    setFSize(saved?.fifths ? String(saved.fifths.sizePctGdp) : frame.council?.size?.unit === 'pct_gdp' ? String(Math.abs(frame.council.size.value)) : '');
    setShares(saved?.fifths ? saved.fifths.shares.map(String) : Array(QUINTILES).fill(''));
    setFSource(saved?.fifths?.source ?? '');
    setError('');
  }, [review.id, rec?.hash]);
  useEffect(() => {
    let live = true;
    fetch(`/api/policy-incidence/${encodeURIComponent(frame.iso3)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setIncome(j?.incomeShares ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [frame.iso3]);
  const set = (i: number, patch: Partial<GroupDraft>) => setRows((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const content = {
        rows: rows.map((r) => ({ group: r.group, effect: r.effect, why: r.why, ...(r.size.trim() ? { size: r.size, sizeUnit: r.sizeUnit } : {}), ...(r.source.trim() ? { source: r.source } : {}), ...(r.link.trim() ? { link: r.link } : {}) })),
        ...(useFifths ? { fifths: { direction, sizePctGdp: fSize, shares, source: fSource } } : {}),
      };
      await onSaved(await postPart(review.id, 'groups', content));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const tally = saved ? groupTally(saved) : null;
  const inc = saved?.fifths ? incidence({ direction: saved.fifths.direction, sizePctGdp: saved.fifths.sizePctGdp, shares: saved.fifths.shares, source: saved.fifths.source }, income) : null;
  const effectLabel = (e: GroupEffect) => t(e === 'gains' ? 'pk_gains' : e === 'loses' ? 'pk_loses' : 'pk_mixed');

  return (
    <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3" data-council-part="groups">
      <p className="ui-section-title">{t('pk_grTitle')}</p>
      <p className="ui-label">{t('pk_grHint')}</p>
      {changed && <p className="text-xs text-amber-700 dark:text-amber-400">{t('pk_changed')}</p>}
      {rec && state === 'out_of_date' && <p className="text-xs text-amber-700 dark:text-amber-400">{t('pk_outOfDate')}</p>}
      <datalist id="pk-group-suggestions">
        {GROUP_SUGGESTIONS.map((g) => (
          <option key={g} value={tx(g)} />
        ))}
      </datalist>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-1.5 sm:grid-cols-2 border border-slate-200 dark:border-slate-700 p-2" data-council-group={i}>
          <label className="ui-label">
            {t('pk_group')}
            <input className={INPUT} list="pk-group-suggestions" value={r.group} maxLength={80} onChange={(e) => set(i, { group: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_effect')}
            <select className={INPUT} value={r.effect} onChange={(e) => set(i, { effect: e.target.value as GroupEffect })}>
              {GROUP_EFFECTS.map((g) => (
                <option key={g} value={g}>
                  {effectLabel(g)}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-label sm:col-span-2">
            {t('pk_why')}
            <input className={INPUT} value={r.why} maxLength={300} onChange={(e) => set(i, { why: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_size')}
            <input className={INPUT} inputMode="decimal" value={r.size} onChange={(e) => set(i, { size: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_sizeUnit')}
            <input className={INPUT} value={r.sizeUnit} maxLength={60} placeholder={t('pk_sizeUnitPh')} onChange={(e) => set(i, { sizeUnit: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_source')}
            <input className={INPUT} value={r.source} maxLength={300} onChange={(e) => set(i, { source: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_link')}
            <input className={INPUT} value={r.link} maxLength={400} onChange={(e) => set(i, { link: e.target.value })} />
          </label>
          <div>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
              <Trash2 className="w-3.5 h-3.5" /> {t('pk_remove')}
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="ui-btn" onClick={() => setRows((x) => [...x, { ...EMPTY_GROUP }])}>
        <Plus className="w-3.5 h-3.5" /> {t('pk_addGroup')}
      </button>
      <label className="flex gap-2 text-xs text-slate-800 dark:text-slate-200">
        <input type="checkbox" checked={useFifths} onChange={(e) => setUseFifths(e.target.checked)} />
        <span>{t('pk_fifthsToggle')}</span>
      </label>
      {useFifths && (
        <div className="grid gap-1.5 sm:grid-cols-2 border border-slate-200 dark:border-slate-700 p-2" data-council-fifths="true">
          <label className="ui-label">
            {t('pk_fifthsDirection')}
            <select className={INPUT} value={direction} onChange={(e) => setDirection(e.target.value as 'pay' | 'gain')}>
              <option value="pay">{t('pk_fifthsPay')}</option>
              <option value="gain">{t('pk_fifthsGain')}</option>
            </select>
          </label>
          <label className="ui-label">
            {t('pk_fifthsSize')}
            <input className={INPUT} inputMode="decimal" value={fSize} onChange={(e) => setFSize(e.target.value)} />
          </label>
          {shares.map((v, q) => (
            <label key={q} className="ui-label">
              {t('pk_fifth', { n: String(q + 1) })}
              <input className={INPUT} inputMode="decimal" value={v} onChange={(e) => setShares((x) => x.map((y, j) => (j === q ? e.target.value : y)))} />
            </label>
          ))}
          <label className="ui-label sm:col-span-2">
            {t('pk_fifthsSource')}
            <input className={INPUT} value={fSource} maxLength={300} onChange={(e) => setFSource(e.target.value)} />
          </label>
        </div>
      )}
      <button type="button" className="ui-btn ui-btn-primary" disabled={busy} onClick={save}>
        <Save className="w-3.5 h-3.5" /> {busy ? t('pk_saving') : t('pk_saveGroups')}
      </button>
      {error && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
          {error}
        </p>
      )}
      {saved && tally && (
        <div className="space-y-1" data-council-results="groups">
          <p className="text-xs text-slate-800 dark:text-slate-200">{t('pk_tally', { g: String(tally.gains), l: String(tally.loses), m: String(tally.mixed) })}</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="pr-2">{t('pk_group')}</th>
                  <th className="pr-2">{t('pk_effect')}</th>
                  <th className="pr-2">{t('pk_why')}</th>
                  <th className="pr-2">{t('pk_size')}</th>
                  <th>{t('pk_source')}</th>
                </tr>
              </thead>
              <tbody className="text-slate-900 dark:text-white">
                {saved.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="pr-2">{r.group}</td>
                    <td className="pr-2">{effectLabel(r.effect)}</td>
                    <td className="pr-2">{r.why}</td>
                    <td className="pr-2 tabular-nums">{r.size !== undefined ? `${r.size} ${r.sizeUnit}` : <span className="text-amber-700 dark:text-amber-400">{t('pk_missingSize')}</span>}</td>
                    <td>
                      {r.link ? (
                        <a href={r.link} target="_blank" rel="noopener noreferrer" className="underline">
                          {r.source || t('pk_link')}
                        </a>
                      ) : (
                        r.source ?? ''
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {inc && inc.ok && (
            <div className="overflow-x-auto" data-council-fifths-result="true">
              <p className="ui-label">{t('pk_fifthsResult', { source: inc.source, year: income ? String(income.year) : '' })}</p>
              <table className="text-xs tabular-nums w-full">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="pr-2">{t('pk_fifthCol')}</th>
                    <th className="pr-2">{t('pk_shareCol')}</th>
                    <th className="pr-2">{t('pk_amountCol')}</th>
                    <th className="pr-2">{t('pk_incomeCol')}</th>
                    <th>{t('pk_ratioCol')}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900 dark:text-white">
                  {inc.groups.map((g) => (
                    <tr key={g.q}>
                      <td className="pr-2">{t('pk_fifth', { n: String(g.q) })}</td>
                      <td className="pr-2">{g.sharePct}%</td>
                      <td className="pr-2">{g.amountPctGdp}</td>
                      <td className="pr-2">{g.incomeSharePct !== undefined ? `${g.incomeSharePct}%` : t('pk_missing')}</td>
                      <td>{g.ratio ?? t('pk_missing')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-800 dark:text-slate-200">
                {inc.reading === 'regressive' ? t('pk_regressive') : inc.reading === 'progressive' ? t('pk_progressive') : inc.reading === 'proportional' ? t('pk_proportional') : t('pk_noIncome')}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('pk_saved', { when: rec!.savedAt.slice(0, 16).replace('T', ' '), hash: rec!.hash.slice(0, 12) })}</p>
        </div>
      )}
    </div>
  );
};

type LinkDraft = { from: string; to: string; direction: LinkDirection; lag: string; basis: LinkBasis; ref: string; source: string; link: string };
const linkDraft = (l?: ChainLink, from = ''): LinkDraft => ({ from: l?.from ?? from, to: l?.to ?? '', direction: l?.direction ?? 'raises', lag: l?.lag ?? '', basis: l?.basis ?? 'assumption', ref: l?.figure ? String(l.figure.ref) : '', source: l?.source ?? '', link: l?.link ?? '' });

const ChainPanel: React.FC<{ review: PolicyReview; changed: boolean; onSaved: Saved }> = ({ review, changed, onSaved }) => {
  const t = useT(REPORTS);
  const rec = review.councilParts?.chain;
  const saved = rec?.content as EffectChain | undefined;
  const state = councilPartState(rec, review.steps.frame?.hash);
  const figures = ((review.steps.diagnose?.content as Diagnosis | undefined)?.figures ?? []).filter((f) => f.status === 'Live' && f.value !== null);
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setLinks(saved ? saved.links.map((l) => linkDraft(l)) : [linkDraft()]);
    setError('');
  }, [review.id, rec?.hash]);
  const set = (i: number, patch: Partial<LinkDraft>) => setLinks((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const content = { links: links.map((l) => ({ from: l.from, to: l.to, direction: l.direction, lag: l.lag, basis: l.basis, ...(l.basis === 'figure' ? { ref: l.ref } : {}), ...(l.basis === 'source' ? { source: l.source, link: l.link } : {}) })) };
      await onSaved(await postPart(review.id, 'chain', content));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const dirLabel = (d: LinkDirection) => t(d === 'raises' ? 'pk_raises' : d === 'lowers' ? 'pk_lowers' : 'pk_unclear');
  const basisLabel = (b: LinkBasis) => t(b === 'figure' ? 'pk_basisFigure' : b === 'source' ? 'pk_basisSource' : 'pk_basisAssumption');
  const tally = saved ? chainTally(saved) : null;

  return (
    <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3" data-council-part="chain">
      <p className="ui-section-title">{t('pk_chTitle')}</p>
      <p className="ui-label">{t('pk_chHint')}</p>
      {changed && <p className="text-xs text-amber-700 dark:text-amber-400">{t('pk_changed')}</p>}
      {rec && state === 'out_of_date' && <p className="text-xs text-amber-700 dark:text-amber-400">{t('pk_outOfDate')}</p>}
      {!figures.length && <p className="ui-label">{t('pk_noFigures')}</p>}
      {links.map((l, i) => (
        <div key={i} className="grid gap-1.5 sm:grid-cols-2 border border-slate-200 dark:border-slate-700 p-2" data-council-link={i}>
          <label className="ui-label">
            {t('pk_from')}
            <input className={INPUT} value={l.from} maxLength={160} onChange={(e) => set(i, { from: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_to')}
            <input className={INPUT} value={l.to} maxLength={160} onChange={(e) => set(i, { to: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_direction')}
            <select className={INPUT} value={l.direction} onChange={(e) => set(i, { direction: e.target.value as LinkDirection })}>
              {LINK_DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {dirLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="ui-label">
            {t('pk_lag')}
            <input className={INPUT} value={l.lag} maxLength={60} placeholder={t('pk_lagPh')} onChange={(e) => set(i, { lag: e.target.value })} />
          </label>
          <label className="ui-label">
            {t('pk_basis')}
            <select className={INPUT} value={l.basis} onChange={(e) => set(i, { basis: e.target.value as LinkBasis })}>
              {LINK_BASES.map((b) => (
                <option key={b} value={b} disabled={b === 'figure' && !figures.length}>
                  {basisLabel(b)}
                </option>
              ))}
            </select>
          </label>
          {l.basis === 'figure' && (
            <label className="ui-label">
              {t('pk_figure')}
              <select className={INPUT} value={l.ref} onChange={(e) => set(i, { ref: e.target.value })}>
                <option value="">{t('pk_pickFigure')}</option>
                {figures.map((f) => (
                  <option key={f.ref} value={f.ref}>
                    [{f.ref}] {f.label}: {f.value} {f.unit} ({f.period})
                  </option>
                ))}
              </select>
            </label>
          )}
          {l.basis === 'source' && (
            <>
              <label className="ui-label">
                {t('pk_source')}
                <input className={INPUT} value={l.source} maxLength={300} onChange={(e) => set(i, { source: e.target.value })} />
              </label>
              <label className="ui-label">
                {t('pk_link')}
                <input className={INPUT} value={l.link} maxLength={400} onChange={(e) => set(i, { link: e.target.value })} />
              </label>
            </>
          )}
          <div>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setLinks((x) => x.filter((_, j) => j !== i))}>
              <Trash2 className="w-3.5 h-3.5" /> {t('pk_remove')}
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="ui-btn" onClick={() => setLinks((x) => [...x, linkDraft(undefined, x[x.length - 1]?.to ?? '')])}>
        <Plus className="w-3.5 h-3.5" /> {t('pk_addLink')}
      </button>
      <div>
        <button type="button" className="ui-btn ui-btn-primary" disabled={busy} onClick={save}>
          <Save className="w-3.5 h-3.5" /> {busy ? t('pk_saving') : t('pk_saveChain')}
        </button>
      </div>
      {error && (
        <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
          {error}
        </p>
      )}
      {saved && tally && (
        <div className="space-y-1" data-council-results="chain">
          <p className="text-xs text-slate-800 dark:text-slate-200">{t('pk_chTally', { f: String(tally.figure), s: String(tally.source), a: String(tally.assumption) })}</p>
          <ol className="list-decimal pl-5 text-xs text-slate-900 dark:text-white space-y-0.5">
            {saved.links.map((l, i) => (
              <li key={i}>
                {l.from} → {dirLabel(l.direction)} → {l.to}
                {l.lag ? ` (${l.lag})` : ''}.{' '}
                {l.basis === 'figure' && l.figure ? (
                  <span className="text-slate-600 dark:text-slate-300">{t('pk_restsFigure', { ref: String(l.figure.ref), label: l.figure.label, value: `${l.figure.value} ${l.figure.unit}`, period: l.figure.period, source: l.figure.source })}</span>
                ) : l.basis === 'source' ? (
                  <span className="text-slate-600 dark:text-slate-300">
                    {l.link ? (
                      <a href={l.link} target="_blank" rel="noopener noreferrer" className="underline">
                        {l.source}
                      </a>
                    ) : (
                      l.source
                    )}
                  </span>
                ) : (
                  <span className="text-amber-700 dark:text-amber-400">{t('pk_basisAssumption')}</span>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('pk_saved', { when: rec!.savedAt.slice(0, 16).replace('T', ' '), hash: rec!.hash.slice(0, 12) })}</p>
        </div>
      )}
    </div>
  );
};

export const PolicyCouncil: React.FC<{ review: PolicyReview; frame: ReviewFrame; changed?: string[]; onSaved: Saved }> = ({ review, frame, changed, onSaved }) => {
  const t = useT(REPORTS);
  return (
    <div className="space-y-4" data-policy-council="true">
      <p className="ui-label">{t('pk_label2')}</p>
      <CostBenefitPanel review={review} frame={frame} changed={Boolean(changed?.includes('costBenefit'))} onSaved={onSaved} />
      <GroupsPanel review={review} frame={frame} changed={Boolean(changed?.includes('groups'))} onSaved={onSaved} />
      <ChainPanel review={review} changed={Boolean(changed?.includes('chain'))} onSaved={onSaved} />
    </div>
  );
};
