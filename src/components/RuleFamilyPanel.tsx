import React, { useEffect, useState } from 'react';
import { ValidationBadge } from './ValidationBadge';
import { Ruler } from 'lucide-react';
import type { RuleFamilyOutcome } from '../utils/ruleFamily';
import { explainInChat } from '../utils/explainHandoff';
import { useT, useTx } from '../i18n/useLang';
import { PANELS } from '../i18n/messages/panels';

/**
 * Country Research > History & data > Policy rules (src/utils/ruleFamily.ts): the policy rate
 * against five stated rules on the same inputs.
 */

type Reply = RuleFamilyOutcome & { iso3: string; method: string; sentence?: string; sources?: string[] };

const f = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(2));
const sg = (v: number | undefined) => (v === undefined ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}`);

export const RuleFamilyPanel: React.FC<{ iso3: string; countryName: string }> = ({ iso3, countryName }) => {
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useT(PANELS);
  const tx = useTx();

  useEffect(() => {
    let live = true;
    setReply(null);
    setError(null);
    fetch(`/api/rule-family/${encodeURIComponent(iso3)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b: Reply) => live && setReply(b))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [iso3]);

  return (
    <section className="ui-panel" data-rule-family="true">
      <header className="ui-panel-header">
        <h2 className="ui-section-title flex items-center gap-2">
          <Ruler className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          {t('rule_title', { country: countryName })}
          <ValidationBadge id="rule_family" />
          {reply?.ok && (
            <button
              type="button"
              className="ui-btn ml-auto text-xs"
              data-explain-panel="true"
              onClick={() =>
                explainInChat({
                  kind: 'panel',
                  label: `Policy rule family, ${countryName}`,
                  value: `policy ${f(reply.policyPct)}%; rules ${f(reply.range.lo)}-${f(reply.range.hi)}%: ${reply.position}`,
                  source: (reply.sources || []).join('; '),
                  iso3,
                  countryName,
                  detail: [reply.sentence || '', ...reply.rows.map((r) => `${r.label}: ${r.pct !== undefined ? `${f(r.pct)}%` : `Missing (${r.missing})`}`), reply.method],
                })
              }
            >
              {t('c_explain')}
            </button>
          )}
        </h2>
        <p className="ui-label">{t('rule_intro')}</p>
      </header>
      <div className="p-4 space-y-3">
        {!reply && !error && <p className="ui-body">{t('c_loading')}</p>}
        {error && <p className="text-sm text-amber-700 dark:text-amber-400">{t('c_couldNotRead', { what: t('rule_what'), error })}</p>}
        {reply && !reply.ok && (
          <p className="text-sm text-amber-700 dark:text-amber-400" data-missing="true">
            {t('c_missingReason', { reason: reply.missing.map(tx).join(', ') })}
          </p>
        )}
        {reply?.ok && (
          <>
            <p className="text-sm text-slate-900 dark:text-white" data-rule-sentence="true">{tx(reply.sentence || '')}</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400">
                  <th className="py-1 pr-3 font-medium">{t('rule_rule')}</th>
                  <th className="py-1 pr-3 font-medium">{t('rule_formula')}</th>
                  <th className="py-1 pr-3 font-medium text-right">{t('rule_prescribes')}</th>
                  <th className="py-1 font-medium text-right">{t('rule_gap')}</th>
                </tr>
              </thead>
              <tbody>
                {reply.rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800 tabular-nums" data-rule={r.id}>
                    <td className="py-0.5 pr-3 text-slate-900 dark:text-white">{tx(r.label)}</td>
                    <td className="py-0.5 pr-3 text-slate-500 dark:text-slate-400">{r.formula}</td>
                    <td className="py-0.5 pr-3 text-right">{r.pct !== undefined ? `${f(r.pct)}%` : <span className="text-amber-700 dark:text-amber-400" title={r.missing ? tx(r.missing) : undefined}>{t('c_missing')}</span>}</td>
                    <td className="py-0.5 text-right">{sg(r.gapPts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('rule_inputs', {
                inf: f(reply.inputs.inflation?.pct),
                month: reply.inputs.inflation?.month ?? '',
                target: f(reply.inputs.targetPct),
                gap: reply.inputs.gap ? t(reply.inputs.gap.source === 'imf' ? 'rule_gapImf' : 'rule_gapApp', { gap: f(reply.inputs.gap.pct), year: reply.inputs.gap.year }) : t('rule_noGap'),
                rstar: reply.rStar,
              })}{' '}
              {reply.method} {t('c_sources', { sources: (reply.sources || []).join('; ') })}
            </p>
          </>
        )}
      </div>
    </section>
  );
};
