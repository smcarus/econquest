import React, { useSyncExternalStore } from 'react';
import { HelpCircle } from 'lucide-react';
import { HELP_LEVEL_EVENT, HELP_LEVEL_KEY, readHelpLevel, showGuides, showRanges, writeHelpLevel, type HelpLevel } from '../utils/helpLevel';
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

/**
 * Header button: shows the level and opens a short list of the four levels (Help off, Key help,
 * Full help, Expert), each with one line on what it shows, so every level can be seen and picked.
 * `labelled` keeps the words visible on a phone (used in the Menu there).
 */
export const HelpLevelButton: React.FC<{ labelled?: boolean }> = ({ labelled = false }) => {
  const level = useHelpLevel();
  const t = useT(SHELL);
  const [open, setOpen] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  const label = t(LEVEL_KEYS[level].label);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="relative inline-block" ref={box}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={t('helpTitleMenu', { label, note: t(LEVEL_KEYS[level].note) })}
        aria-label={t('helpAriaMenu', { label })}
        aria-expanded={open}
        aria-haspopup="true"
        data-help-level={level}
        className="ui-pill inline-flex items-center gap-1.5 whitespace-nowrap"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span className={labelled ? '' : 'hidden sm:inline'}>{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1" data-help-menu="true">
          {LEVEL_KEYS.map((k, i) => (
            <button
              key={k.label}
              type="button"
              aria-pressed={i === level}
              onClick={() => {
                writeHelpLevel(i as HelpLevel);
                setOpen(false);
              }}
              className={`block w-full text-left px-2 py-1.5 ${i === level ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              data-help-choice={i}
            >
              <span className="block text-sm font-medium text-slate-900 dark:text-white">{t(k.label)}</span>
              <span className="block text-xs text-slate-600 dark:text-slate-300">{t(k.note)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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
