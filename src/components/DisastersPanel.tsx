import React, { useEffect, useState } from 'react';
import { CloudLightning } from 'lucide-react';
import { ValidationBadge } from './ValidationBadge';
import { EMDAT_NO_FILE, EMDAT_SETUP_HELP, type DisasterView } from '../utils/disasters';
import { lossSentence, type LossModel } from '../utils/lossModel';
import { explainInChat } from '../utils/explainHandoff';
import { useLang, useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Natural disasters (PA6, src/utils/disasters.ts): EM-DAT events
 * since 2000 from the file the user saves, by type and year, deaths, people affected, and damage
 * against GDP. Below, the loss model (I1 + I2, src/utils/lossModel.ts): every year's loss and a
 * frequency-severity fit with simulated yearly losses, by type of disaster.
 */

type Reply = DisasterView & { iso3: string; sentence: string; losses?: LossModel[] };

const amber = 'text-amber-700 dark:text-amber-400';
const muted = 'text-xs text-slate-500 dark:text-slate-400';

export const DisastersPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();
  const lang = useLang();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/disasters/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  const n = (v: number) => v.toLocaleString(lang);
  const usd = (v: number) => (Math.abs(v) >= 1 ? t('rm_bn', { v: v.toFixed(1) }) : t('rm_m', { v: String(Math.round(v * 1000)) }));
  const tot = reply?.totals;

  return (
    <section className="ui-panel" data-disasters="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <CloudLightning className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('ds_title', { country: countryName })}
          <ValidationBadge id="disasters" />
          {tot && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Natural disasters, ${countryName}`,
                  value: reply!.sentence,
                  source: `${reply!.sources}. ${reply!.citation ?? ''}`.trim(),
                  asOf: String(reply!.to ?? ''),
                  iso3,
                  countryName,
                  detail: [reply!.method],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('ds_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className={`text-sm ${amber}`}>{t('c_couldNotRead', { what: t('ds_what'), error })}</p>}
        {reply && !tot && (
          <div className="space-y-1">
            <p className={`text-sm ${amber}`} data-missing="true">
              {t('c_missingReason', { reason: tx(reply.missing || '') })}
            </p>
            {(reply.missing === EMDAT_NO_FILE || !reply.file) && <p className={muted}>{tx(EMDAT_SETUP_HELP)}</p>}
          </div>
        )}
        {reply && tot && (
          <>
            <p className="ui-body" data-ds-summary={String(tot.events)}>
              {t('ds_summary', { from: String(reply.from), to: String(reply.to), events: n(tot.events), deaths: n(tot.deaths), affected: n(tot.affected) })}
            </p>
            {reply.perYear && (
              <p className="text-xs">
                {t('ds_perYear', { events: reply.perYear.events.toFixed(1), deaths: n(reply.perYear.deaths), affected: n(reply.perYear.affected) })}
                {reply.perYear.affectedPctPop !== undefined && ` ${t('ds_perYearPop', { pct: reply.perYear.affectedPctPop.toFixed(2), year: String(reply.perYear.popYear) })}`}
              </p>
            )}

            <h3 className="ui-label">{t('ds_typeTitle', { from: String(reply.from), to: String(reply.to) })}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-ds-types="true">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-3 font-medium">{t('ds_tType')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('ds_tEvents')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('ds_tDeaths')}</th>
                    <th className="py-1 pr-3 font-medium text-right">{t('ds_tAffected')}</th>
                    <th className="py-1 font-medium text-right">{t('ds_tDamageAdj')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reply.byType.map((b) => (
                    <tr key={b.type} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-0.5 pr-3">{tx(b.type)}</td>
                      <td className="py-0.5 pr-3 text-right">{n(b.events)}</td>
                      <td className="py-0.5 pr-3 text-right">{n(b.deaths)}</td>
                      <td className="py-0.5 pr-3 text-right">{n(b.affected)}</td>
                      <td className="py-0.5 text-right">{b.withDamage ? b.damageAdj.toFixed(2) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={muted} data-ds-with-damage={String(tot.withDamage)}>
              {t('ds_damageNote', { n: n(tot.withDamage), events: n(tot.events) })}
            </p>

            {reply.years.length > 0 && (
              <>
                <h3 className="ui-label">{t('ds_yearsTitle')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-ds-years="true">
                    <thead>
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('ds_tEvents')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('ds_tDeaths')}</th>
                        <th className="py-1 pr-3 font-medium text-right">{t('ds_tAffected')}</th>
                        <th className="py-1 font-medium text-right">{t('ds_tDamagePct')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reply.years.map((y) => (
                        <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-0.5 pr-3">{y.year}</td>
                          <td className="py-0.5 pr-3 text-right">{n(y.events)}</td>
                          <td className="py-0.5 pr-3 text-right">{n(y.deaths)}</td>
                          <td className="py-0.5 pr-3 text-right">{n(y.affected)}</td>
                          <td className="py-0.5 text-right">{y.damagePctGdp === undefined ? '–' : y.damagePctGdp.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {reply.largest.length > 0 && (
              <>
                <h3 className="ui-label">{t('ds_largestTitle')}</h3>
                <ul className="text-xs space-y-0.5" data-ds-largest="true">
                  {reply.largest.map((e) => (
                    <li key={e.id} data-ds-event={e.id}>
                      <span className="font-medium">
                        {e.year}: {tx(e.type)}
                        {e.name ? ` (${e.name})` : ''}
                      </span>{' '}
                      {[
                        t('ds_affected', { v: n(e.affected ?? 0) }),
                        t('ds_deaths', { v: n(e.deaths ?? 0) }),
                        ...(e.damage !== undefined ? [t('ds_damage', { v: usd(e.damage) })] : []),
                        ...(e.damagePctGdp !== undefined ? [t('ds_pctGdp', { v: e.damagePctGdp.toFixed(2) })] : []),
                      ].join(', ')}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {reply.losses && reply.losses.length > 0 && <LossSection models={reply.losses} iso3={iso3} countryName={countryName} source={`${reply.sources}. ${reply.citation ?? ''}`.trim()} />}
            <p className={muted}>{t('ds_criteria')}</p>
          </>
        )}
        {reply?.file && <p className={muted}>{t('ds_fileNote', { file: reply.file, citation: reply.citation || '' })}</p>}
        {reply && (
          <p className={muted}>
            {t('ds_methodText')} {t('c_sources', { sources: tx(reply.sources) })}
          </p>
        )}
      </div>
    </section>
  );
};

/** Loss history and frequency-severity model, one type of disaster at a time. */
const LossSection: React.FC<{ models: LossModel[]; iso3: string; countryName: string; source: string }> = ({ models, iso3, countryName, source }) => {
  const t = useT(PANELS);
  const tx = useTx();
  const lang = useLang();
  const [type, setType] = useState(models[0].type);
  const m = models.find((x) => x.type === type) ?? models[0];
  const n = (v: number) => v.toLocaleString(lang);
  const usd = (v: number) => (Math.abs(v) >= 1 ? t('rm_bn', { v: v.toFixed(1) }) : t('rm_m', { v: String(Math.round(v * 1000)) }));
  const f = m.frequency;
  const a = m.annual;
  const rows: Array<[string, number, number | undefined]> = a
    ? [
        [t('lm_rowMean'), a.mean, a.pctGdp?.mean],
        [t('lm_row10'), a.p90, a.pctGdp?.p90],
        [t('lm_row50'), a.p98, a.pctGdp?.p98],
        [t('lm_row100'), a.p99, a.pctGdp?.p99],
      ]
    : [];
  return (
    <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3" data-loss-model="true">
      <h3 className="ui-label flex flex-wrap items-center gap-2">
        {t('lm_title')}
        <select
          className="ml-auto text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1 py-0.5"
          value={m.type}
          onChange={(e) => setType(e.target.value)}
          aria-label={t('lm_type')}
          data-lm-type="true"
        >
          {models.map((x) => (
            <option key={x.type} value={x.type}>
              {tx(x.type)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ui-btn text-xs"
          data-lm-explain="true"
          onClick={() =>
            explainInChat({ kind: 'panel', label: `Disaster loss model, ${countryName}`, value: lossSentence(m), source, asOf: String(m.to), iso3, countryName, detail: [LOSS_METHOD_EN] })
          }
        >
          {t('c_explain')}
        </button>
      </h3>
      <p className="ui-body" data-lm-summary={String(m.withDamage)}>
        {t('lm_summary', { from: String(m.from), to: String(m.to), withDamage: n(m.withDamage), events: n(m.events), avg: usd(m.averageLoss) })}
      </p>
      <p className="text-xs" data-lm-frequency={f.model}>
        {f.model === 'poisson'
          ? t('lm_freqPoisson', { mean: f.mean.toFixed(2), variance: f.variance.toFixed(2), pct: f.atLeastOnePct.toFixed(0) })
          : t('lm_freqNb', { mean: f.mean.toFixed(2), variance: f.variance.toFixed(2), pct: f.atLeastOnePct.toFixed(0) })}
      </p>
      {m.noModel && (
        <p className={`text-xs ${amber}`} data-lm-missing="true">
          {t('c_missingReason', { reason: tx(m.noModel) })}
        </p>
      )}
      {m.severity && (
        <p className="text-xs" data-lm-severity={String(m.severity.n)}>
          {t('lm_severity', { n: n(m.severity.n), median: usd(m.severity.median), mean: usd(m.severity.mean), p90: usd(m.severity.p90), p99: usd(m.severity.p99) })}{' '}
          <span className={muted}>{t('lm_severityCheck', { record: usd(m.severity.recordP90), fit: usd(m.severity.p90) })}</span>
        </p>
      )}
      {a && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs [font-variant-numeric:tabular-nums]" data-lm-annual="true">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('lm_annualTitle', { n: n(20000) })}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('lm_tLoss')}</th>
                  <th className="py-1 font-medium text-right">{a.pctGdp ? t('lm_tPctGdp', { year: String(a.pctGdp.gdpYear) }) : t('ds_tDamagePct')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, v, pct]) => (
                  <tr key={label} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-0.5 pr-3">{label}</td>
                    <td className="py-0.5 pr-3 text-right">{usd(v)}</td>
                    <td className="py-0.5 text-right">{pct === undefined ? '–' : pct.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={muted}>{t('lm_zero', { pct: a.zeroPct.toFixed(0) })}</p>
        </>
      )}
      <details className="text-xs" data-lm-history="true">
        <summary className="cursor-pointer text-slate-600 dark:text-slate-300">{t('lm_historyTitle', { from: String(m.from), to: String(m.to) })}</summary>
        <div className="overflow-x-auto mt-1">
          <table className="w-full text-xs [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-1 pr-3 font-medium">{t('c_year')}</th>
                <th className="py-1 pr-3 font-medium text-right">{t('ds_tEvents')}</th>
                <th className="py-1 pr-3 font-medium text-right">{t('lm_tWithDamage')}</th>
                <th className="py-1 pr-3 font-medium text-right">{t('ds_tDamageAdj')}</th>
                <th className="py-1 font-medium text-right">{t('ds_tDamagePct')}</th>
              </tr>
            </thead>
            <tbody>
              {[...m.years].reverse().map((y) => (
                <tr key={y.year} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-0.5 pr-3">{y.year}</td>
                  <td className="py-0.5 pr-3 text-right">{n(y.events)}</td>
                  <td className="py-0.5 pr-3 text-right">{n(y.withDamage)}</td>
                  <td className="py-0.5 pr-3 text-right">{y.withDamage ? y.damageAdj.toFixed(2) : '–'}</td>
                  <td className="py-0.5 text-right">{y.damagePctGdp === undefined ? '–' : y.damagePctGdp.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className={muted}>{t('lm_method')}</p>
    </div>
  );
};

const LOSS_METHOD_EN =
  'Frequency-severity model: damaging events per year are Poisson, or negative binomial when the yearly counts vary more than their mean; damage per event is lognormal fitted on the logs; 20,000 simulated years give the average yearly loss and the losses passed 1 year in 10, 50 and 100. EM-DAT damage is missing for many events, so losses are understated.';
