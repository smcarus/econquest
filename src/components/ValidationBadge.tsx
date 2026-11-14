/**
 * A small status label beside a signal or model ("Not validated", "Validated", "Provisional pass"...),
 * read from the register (src/data/modelRegister.ts); a pass shows its evidence grade
 * (src/utils/evidenceGrade.ts). Clicking it opens Menu > Models & validation on that row.
 */
import React from 'react';
import { registerEntry, registerForPanel, STATUS_LABEL, type RegisterEntry, type ValidationStatus } from '../data/modelRegister';
import { effectiveStatus, entryGrade, failsStricterCheck, fromProjectRecord, projectVerdicts, useValidation } from './useValidation';
import { useT, useTx } from '../i18n/useLang';
import { COMMON } from '../i18n/messages/common';

export const OPEN_REGISTER_EVENT = 'econquest:open-model-register';

export function openModelRegister(id?: string): void {
  window.dispatchEvent(new CustomEvent(OPEN_REGISTER_EVENT, { detail: id ?? null }));
}

const GRADE_CLASS = { positive: 'ui-badge-positive', warning: 'ui-badge-warning', negative: 'ui-badge-negative' } as const;

const TONE: Record<ValidationStatus, string> = {
  not_validated: 'ui-badge-warning',
  model_assisted: 'ui-badge-warning',
  failed: 'ui-badge-negative',
  too_few_cases: 'ui-badge-warning',
  passed: 'ui-badge-positive',
  descriptive: '',
};

function Badge({ entry }: { entry: RegisterEntry }) {
  const v = useValidation();
  const t = useT(COMMON);
  const tx = useTx();
  const status = effectiveStatus(entry.id, entry.status, v);
  const r = v?.results?.[entry.id];
  const stricter = failsStricterCheck(entry.id, v);
  const published = !r && fromProjectRecord(entry.id, v) ? projectVerdicts(entry.id, v?.projectRecord) : [];
  const verdict = r
    ? `${r.verdict}${r.robustness && (r.framework ?? 1) === 1 ? ` Stricter check (method 2): ${r.robustness.verdict}` : ''}`
    : published.length
      ? `From the project's published track record, not yet run on this computer: ${published.map((x) => `${x.id.replace(/_/g, ' ')} v${x.version}, run ${x.ranAt.slice(0, 10)}: ${x.summary}`).join(' ')}`
      : undefined;
  const grade = stricter ? null : entryGrade(entry.id, entry.status, v);
  const label = stricter ? t('stricterFail') : tx(grade ? grade.label : STATUS_LABEL[status]);
  const tone = stricter ? 'ui-badge-warning' : grade ? GRADE_CLASS[grade.tone] : TONE[status];
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openModelRegister(entry.id);
      }}
      data-validation-status={status}
      data-validation-from={published.length ? 'project' : undefined}
      data-stricter-check={r?.robustness?.status}
      data-evidence-grade={grade?.grade}
      title={t('badgeTitle', { name: tx(entry.name), label, more: `${grade ? `${tx(grade.why)} ` : ''}${tx(verdict || entry.testPlan)}` })}
      className={`ui-badge ${tone} whitespace-nowrap font-normal cursor-pointer`}
    >
      {label}
    </button>
  );
}

/** Badge for a register id, or nothing when the id is unknown. */
export const ValidationBadge: React.FC<{ id: string }> = ({ id }) => {
  const entry = registerEntry(id);
  return entry ? <Badge entry={entry} /> : null;
};

/** Badge for a panel title (BriefGroups), or nothing when no rule sits behind that panel. */
export const PanelValidationBadge: React.FC<{ title: string }> = ({ title }) => {
  const entry = registerForPanel(title);
  return entry ? <Badge entry={entry} /> : null;
};
