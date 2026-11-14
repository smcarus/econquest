import React, { useSyncExternalStore } from 'react';
import { HelpCircle } from 'lucide-react';
import { HELP_LEVEL_EVENT, HELP_LEVEL_KEY, nextHelpLevel, readHelpLevel, showGuides, showRanges, writeHelpLevel, type HelpLevel } from '../utils/helpLevel';
import { chartGuide, type ChartGuideId } from '../data/chartGuides';
import { useT, useTx } from '../i18n/useLang';
import { SHELL } from '../i18n/messages/shell';

const LEVEL_KEYS = [
  { label: 'helpOff', note: 'helpOffNote' },
  { label: 'helpKey', note: 'helpKeyNote' },
  { label: 'helpFull', note: 'helpFullNote' },
  { label: 'helpExpert', note: 'helpExpertNote' },
] as const;

function subscribe(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === HELP_LEVEL_KEY) cb();
  };
  window.addEventListener(HELP_LEVEL_EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(HELP_LEVEL_EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}

/** The help level, kept in step across every panel and open window. */
export function useHelpLevel(): HelpLevel {
  return useSyncExternalStore(subscribe, readHelpLevel, () => 1 as HelpLevel);
}

/** Whether forecast ranges are drawn: yes, except at Help off (plan item G9). */
export function useShowRanges(): boolean {
  return showRanges(useHelpLevel());
}

/**
 * The line beside a figure about its range: "hidden at Help off" when the level hides ranges, or
 * "No range available" with the reason when the method has no sound range (none is ever made up).
 */
export const RangeNote: React.FC<{ none?: 'noRangeImf' | 'noRangeOwn' | 'noRangeGfn'; className?: string }> = ({ none, className = 'text-xs text-slate-500 dark:text-slate-400' }) => {
  const ranges = useShowRanges();
  const t = useT(SHELL);
  if (none) return <p className={className} data-no-range={none}>{t('noRange', { reason: t(none) })}</p>;
  if (ranges) return null;
  return <p className={className} data-ranges-hidden="true">{t('rangesHidden')}</p>;
};

/** Header button: shows the level and moves to the next one (Key help, Full help, Expert, Off). */
export const HelpLevelButton: React.FC = () => {
  const level = useHelpLevel();
  const t = useT(SHELL);
  const keys = LEVEL_KEYS[level];
  const label = t(keys.label);
  const next = t(LEVEL_KEYS[nextHelpLevel(level)].label).toLowerCase();
  return (
    <button
      type="button"
      onClick={() => writeHelpLevel(nextHelpLevel(level))}
      title={t('helpTitle', { label, note: t(keys.note), next })}
      aria-label={t('helpAria', { label, next })}
      data-help-level={level}
      className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap"
    >
      <HelpCircle className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

/** "How to read this chart" and what it means in real life, under a chart's title. Levels 1 and 2. */
export const ChartGuide: React.FC<{ id: ChartGuideId; className?: string }> = ({ id, className = 'px-4 pt-2' }) => {
  const level = useHelpLevel();
  const t = useT(SHELL);
  const tx = useTx();
  if (!showGuides(level)) return null;
  const g = chartGuide(id);
  return (
    <div className={`${className} text-xs text-slate-600 dark:text-slate-300 space-y-1 max-w-prose`} data-chart-guide={id}>
      <p>
        <span className="font-medium text-slate-800 dark:text-slate-100">{t('guideRead')}</span>
        {tx(g.read)}
      </p>
      <p>
        <span className="font-medium text-slate-800 dark:text-slate-100">{t('guideLife')}</span>
        {tx(g.life)}
      </p>
    </div>
  );
};
