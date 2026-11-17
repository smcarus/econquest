import React from 'react';
import { SHOCK_KINDS, type ScenarioQuestion, type Shock } from '../utils/scenarioQuestion';
import { useT, useTx } from '../i18n/useLang';
import { CHAT } from '../i18n/messages/chat';

/**
 * The shocks a what-if question states, as the app read them (WI1, src/utils/scenarioQuestion.ts),
 * shown above the answer so the user can check the reading. A shock with no size asks for one:
 * the app never picks a size itself.
 */

const sgn = (v: number) => `${v > 0 ? '+' : ''}${v}`;

const ShockLine: React.FC<{ s: Shock }> = ({ s }) => {
  const tr = useT(CHAT);
  const tx = useTx();
  const k = SHOCK_KINDS[s.kind];
  const dir = s.direction === -1 ? k.down : s.direction === 1 ? k.up : 'changed';
  const size = s.target
    ? s.target.unit === 'usd'
      ? tr('sc_atUsd', { value: s.target.value })
      : tr('sc_toLevel', { value: s.target.value })
    : s.change === null
      ? tr('sc_noSize')
      : `${sgn(s.change)}${k.unit === '%' ? '%' : ` ${tx(k.unit)}`}`;
  return (
    <li data-scenario-shock={s.kind}>
      {tx(k.label)}: {tx(dir)}, {size}
      {s.read ? (
        <span className="text-slate-500 dark:text-slate-400">
          {' '}
          ({s.read.as === 'pct_as_pts' ? tr('sc_pctAsPts', { value: s.read.value }) : s.read.as === 'double' ? tr('sc_double') : tr('sc_halve')})
        </span>
      ) : null}
    </li>
  );
};

export const ScenarioReadNote: React.FC<{ scenario: ScenarioQuestion }> = ({ scenario }) => {
  const tr = useT(CHAT);
  if (!scenario.shocks.length) return null;
  return (
    <div className="border border-slate-200 dark:border-slate-700 p-2 text-xs text-slate-700 dark:text-slate-300 space-y-1" data-scenario-read={scenario.shocks.length}>
      <div className="ui-label">{tr('sc_read')}</div>
      <ul className="space-y-0.5">
        {scenario.shocks.map((s) => (
          <ShockLine key={s.kind} s={s} />
        ))}
      </ul>
      {scenario.needsSize.length > 0 && (
        <p className="text-amber-700 dark:text-amber-400" data-scenario-needs-size="true">
          {tr('sc_askSize')}
        </p>
      )}
    </div>
  );
};
