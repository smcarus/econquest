/**
 * Dark or light (standard features check, 24 November 2026). Until the person presses the
 * dark-mode switch, the app follows the computer's own setting and changes with it. Once they
 * press it, their choice is kept in this browser and wins. A choice saved by an earlier version
 * counts as a choice, so nobody's screen changes after an update. Browser-safe.
 */
export const THEME_STORAGE_KEY = 'econquest_theme_dark_v1';

/** The computer's setting, or false (light) when the browser cannot say. */
export function systemPrefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** The saved choice: true, false, or null when the person has not chosen. */
export function savedThemeChoice(): boolean | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === null ? null : v === 'true';
  } catch {
    return null;
  }
}

/** Which theme to open with: the saved choice (or the saved session's), else the computer's. */
export function initialDark(saved: boolean | null, session: boolean | undefined, system: boolean): boolean {
  if (saved === null) return system;
  return typeof session === 'boolean' ? session : saved;
}

/** The dark theme for a page that only reads the choice (the pop-out watchlist). */
export function effectiveDark(): boolean {
  const saved = savedThemeChoice();
  return saved === null ? systemPrefersDark() : saved;
}
