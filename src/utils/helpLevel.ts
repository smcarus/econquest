/**
 * How much explanation the app shows (Sam, 2026-11-07): three levels, switched from the header.
 *
 *   0  Off: figures, sources and Missing reasons only (the reasons stay as hover text). For
 *      readers who know the terms.
 *   1  Key points (default): plain guides on the charts, the panel introductions, what each brief
 *      observation means for real life, and "What is this?" on the main figures (about half).
 *   2  Everything: "What is this?" on every figure and "Why missing?" spelled out everywhere.
 *   3  Expert: written for economists and analysts. Like Off (no plain-language lines, panel
 *      introductions, chart guides or "What is this?"), but forecast ranges stay, and Explain in
 *      chat writes for a reader who knows the terms.
 *
 * Kept per browser in localStorage (a viewer convenience); the app works the same if storage is
 * blocked, at the default level. Browser-safe; no React import here so the rules can be tested.
 */
import type { GlossaryEntry } from '../data/glossary';

export type HelpLevel = 0 | 1 | 2 | 3;
export const DEFAULT_HELP_LEVEL: HelpLevel = 1;
export const HELP_LEVEL_KEY = 'econquest.helpLevel.v1';
export const HELP_LEVEL_EVENT = 'econquest:help-level';

export const HELP_LEVELS: Array<{ level: HelpLevel; label: string; note: string }> = [
  { level: 0, label: 'Help off', note: 'Figures and sources only, no explanations or forecast ranges.' },
  { level: 1, label: 'Key help', note: 'Explains the charts, the main figures, and what each reading means for real life.' },
  { level: 2, label: 'Full help', note: 'Explains every figure and term, and why each missing figure is missing.' },
  { level: 3, label: 'Expert', note: 'Figures, sources and forecast ranges, with no plain-language explanations.' },
];

export function parseHelpLevel(v: unknown): HelpLevel {
  const n = Number(v);
  return n === 0 || n === 1 || n === 2 || n === 3 ? n : DEFAULT_HELP_LEVEL;
}

export function readHelpLevel(): HelpLevel {
  try {
    const raw = window.localStorage.getItem(HELP_LEVEL_KEY);
    return raw === null ? DEFAULT_HELP_LEVEL : parseHelpLevel(raw);
  } catch {
    return DEFAULT_HELP_LEVEL;
  }
}

export function writeHelpLevel(level: HelpLevel): void {
  try {
    window.localStorage.setItem(HELP_LEVEL_KEY, String(level));
  } catch {
    // Storage blocked: the level still changes for this page view.
  }
  window.dispatchEvent(new CustomEvent(HELP_LEVEL_EVENT, { detail: level }));
}

/** The next level when the header button is pressed: Key help, Full help, Expert, Off, Key help... */
export function nextHelpLevel(level: HelpLevel): HelpLevel {
  return level === 1 ? 2 : level === 2 ? 3 : level === 3 ? 0 : 1;
}

/** Levels with no teaching text: Off and Expert. */
export const isTerse = (level: HelpLevel): boolean => level === 0 || level === 3;

/** The level the Explain prompt takes (0, 1 or 2): Expert writes as Off, for a reader who knows the terms. */
export const promptHelpLevel = (level: HelpLevel): 0 | 1 | 2 => (level === 3 ? 0 : level);

/** "What is this?" on a figure: every entry at level 2, the key entries at level 1, none at 0. */
export function showFigureHelp(entry: GlossaryEntry | undefined, level: HelpLevel): boolean {
  if (!entry || isTerse(level)) return false;
  return level === 2 || entry.key === true;
}

/** Panel introductions, chart guides and the "what it means" line on observations: levels 1 and 2. */
export const showGuides = (level: HelpLevel): boolean => !isTerse(level);

/** "Why missing?" spelled out under a Missing value: levels 1 and 2 (at 0 it stays hover text). */
export const showMissingHelp = (level: HelpLevel): boolean => !isTerse(level);

/**
 * Uncertainty ranges on forecasts, nowcasts and the debt fan (plan item G9; Sam, 2026-11-08): shown
 * by default, hidden at Help off; Expert keeps them. Downloads, the data API and Explain in chat keep
 * the ranges at every level; only the screen changes.
 */
export const showRanges = (level: HelpLevel): boolean => level !== 0;
