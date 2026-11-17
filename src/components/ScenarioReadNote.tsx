import React, { useEffect, useState } from 'react';
import { SHOCK_KINDS, scenarioText, type ScenarioQuestion, type Shock } from '../utils/scenarioQuestion';
import type { AgentAnswer } from '../utils/askCouncil';
import { keepWhatIf, keptWhatIfs, onKeptChange } from '../utils/tradeOffStore';
import { useT, useTx } from '../i18n/useLang';
import { CHAT } from '../i18n/messages/chat';

/**
 * The shocks a what-if question states, as the app read them (WI1, src/utils/scenarioQuestion.ts),
 * shown above the answer so the user can check the reading. A shock with no size asks for one:
 * the app never picks a size itself.
 *
 * The card can be edited (WI6): change a size or a level, take a change out, and ask again; the new
 * question is written in plain words so it is read back the same way. Debt paths the Scenario Agent
 * worked out can be kept for the trade-off chart under Debt sustainability.
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

interface Draft {
  kind: Shock['kind'];
  /** The size or level as typed; '' when none. */
  value: string;
  level: Shock['target'];
  on: boolean;
}

const draftOf = (s: Shock): Draft => ({ kind: s.kind, value: s.target ? String(s.target.value) : s.change === null ? '' : String(s.change), level: s.target, on: true });

/** The edited shocks; a blank or non-number size leaves the change out. */
export function editedShocks(drafts: Draft[]): Array<Pick<Shock, 'kind' | 'change' | 'target'>> {
  return drafts
    .filter((d) => d.on && d.value.trim() !== '' && Number.isFinite(Number(d.value)))
    .map((d) => (d.level ? { kind: d.kind, change: null, target: { value: Number(d.value), unit: d.level.unit } } : { kind: d.kind, change: Number(d.value), target: null }));
}

export const ScenarioReadNote: React.FC<{
  scenario: ScenarioQuestion;
  /** The countries the answer covered, named in a question asked again. */
  countries?: string[];
  keep?: AgentAnswer['keep'];
  /** Sends a question to the council; the card is read-only without it. */
  onAsk?: (question: string) => void;
  busy?: boolean;
}> = ({ scenario, countries = [], keep = [], onAsk, busy }) => {
  const tr = useT(CHAT);
  const tx = useTx();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => scenario.shocks.map(draftOf));
  const [, bump] = useState(0);
  useEffect(() => onKeptChange(() => bump((n) => n + 1)), []);
  if (!scenario.shocks.length) return null;
  const text = scenarioText(editedShocks(drafts), countries);
  const set = (i: number, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  return (
    <div className="border border-slate-200 dark:border-slate-700 p-2 text-xs text-slate-700 dark:text-slate-300 space-y-1" data-scenario-read={scenario.shocks.length}>
      <div className="flex items-center justify-between gap-2">
        <span className="ui-label">{tr('sc_read')}</span>
        {onAsk && !editing && (
          <button type="button" className="text-blue-700 dark:text-blue-300 hover:underline" data-scenario-edit="true" onClick={() => setEditing(true)}>
            {tr('sc_edit')}
          </button>
        )}
      </div>
      {!editing ? (
        <ul className="space-y-0.5">
          {scenario.shocks.map((s) => (
            <ShockLine key={s.kind} s={s} />
          ))}
        </ul>
      ) : (
        <div className="space-y-1.5" data-scenario-editor="true">
          {drafts.map((d, i) => {
            const k = SHOCK_KINDS[d.kind];
            const unit = d.level ? (d.level.unit === 'usd' ? '$' : '%') : k.unit;
            const id = `sc-${d.kind}`;
            return (
              <div key={d.kind} className={`flex flex-wrap items-center gap-2 ${d.on ? '' : 'opacity-50'}`} data-scenario-draft={d.kind}>
                <label htmlFor={id} className="min-w-[10rem]">
                  {tx(k.label)}
                  {d.level ? ` (${tr('sc_level')})` : ''}
                </label>
                <input
                  id={id}
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className="w-24 px-1 py-0.5 tabular-nums bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  value={d.value}
                  disabled={!d.on}
                  onChange={(e) => set(i, { value: e.target.value })}
                />
                <span>{tx(unit)}</span>
                {!d.level && <span className="text-slate-500 dark:text-slate-400">{tr('sc_sign', { up: tx(k.up), down: tx(k.down) })}</span>}
                <button type="button" className="text-blue-700 dark:text-blue-300 hover:underline" onClick={() => set(i, { on: !d.on })}>
                  {d.on ? tr('sc_remove') : tr('sc_putBack')}
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              className="ui-btn ui-btn-primary text-xs"
              data-scenario-ask="true"
              disabled={!text || busy}
              onClick={() => {
                if (!text || !onAsk) return;
                onAsk(text);
                setEditing(false);
              }}
            >
              {tr('sc_askAgain')}
            </button>
            <button
              type="button"
              className="text-slate-600 dark:text-slate-300 hover:underline"
              onClick={() => {
                setDrafts(scenario.shocks.map(draftOf));
                setEditing(false);
              }}
            >
              {tr('sc_cancel')}
            </button>
          </div>
          <p className="text-slate-500 dark:text-slate-400" data-scenario-text="true">
            {text ? tr('sc_willAsk', { q: text }) : tr('sc_noneLeft')}
          </p>
        </div>
      )}
      {scenario.needsSize.length > 0 && !editing && (
        <p className="text-amber-700 dark:text-amber-400" data-scenario-needs-size="true">
          {tr('sc_askSize')}
        </p>
      )}
      {keep.length > 0 && (
        <div className="pt-1 space-y-0.5" data-scenario-keep={keep.length}>
          {keep.map((k) => {
            const done = keptWhatIfs(k.iso3).some((x) => x.id === k.item.id);
            return (
              <div key={k.item.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {k.countryName}: {tx(k.item.label)}
                </span>
                <button
                  type="button"
                  className="text-blue-700 dark:text-blue-300 hover:underline disabled:no-underline disabled:text-slate-500"
                  disabled={done}
                  data-scenario-keep-item={k.item.id}
                  onClick={() => keepWhatIf(k.iso3, k.item)}
                >
                  {done ? tr('wi_kept') : tr('wi_keep')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
