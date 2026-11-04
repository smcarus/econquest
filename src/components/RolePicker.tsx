import React from 'react';
import { USER_ROLES, type UserRoleId } from '../data/roles';

interface RolePickerProps {
  current: UserRoleId | null;
  onPick: (id: UserRoleId) => void;
  onSkip?: () => void;
}

/** First-visit card: pick a role to set where the app opens and how the menu is ordered. */
export const RolePicker: React.FC<RolePickerProps> = ({ current, onPick, onSkip }) => (
  <section className="ui-panel" aria-label="Choose your role">
    <header className="ui-panel-header flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="ui-section-title">What kind of work do you do?</h2>
        <p className="ui-label">This sets where the app opens and the order of the menu. You can change it any time under Menu.</p>
      </div>
      {onSkip && (
        <button type="button" className="ui-btn ui-btn-ghost" onClick={onSkip}>
          Not now
        </button>
      )}
    </header>
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
      {USER_ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onPick(r.id)}
          aria-pressed={current === r.id}
          className={`text-left p-3 border transition-colors ${
            current === r.id
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40'
              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{r.label}</div>
          <div className="ui-label mt-0.5">{r.description}</div>
        </button>
      ))}
    </div>
  </section>
);
