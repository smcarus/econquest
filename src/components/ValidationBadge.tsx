/**
 * A small status label beside a signal or model ("Not validated", "Backtest passed"...), read from
 * the register (src/data/modelRegister.ts). Clicking it opens Menu > Models & validation on that row.
 */
import React from 'react';
import { registerEntry, registerForPanel, STATUS_LABEL, type RegisterEntry, type ValidationStatus } from '../data/modelRegister';
import { effectiveStatus, useValidation } from './useValidation';

export const OPEN_REGISTER_EVENT = 'econquest:open-model-register';

export function openModelRegister(id?: string): void {
  window.dispatchEvent(new CustomEvent(OPEN_REGISTER_EVENT, { detail: id ?? null }));
}

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
  const status = effectiveStatus(entry.id, entry.status, v);
  const verdict = v?.results?.[entry.id]?.verdict;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openModelRegister(entry.id);
      }}
      data-validation-status={status}
      title={`${entry.name}: ${STATUS_LABEL[status]}. ${verdict || entry.testPlan} Click for the register.`}
      className={`ui-badge ${TONE[status]} whitespace-nowrap font-normal cursor-pointer`}
    >
      {STATUS_LABEL[status]}
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
