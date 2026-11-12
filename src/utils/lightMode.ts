/**
 * Light mode (U3): a lighter way to run the app on a modest laptop, chosen at install with
 * LIGHT_MODE=on (in .env, or by the start scripts' light option).
 *
 * - No AI model on this computer: the council uses your own Google Gemini key if you add one, and
 *   otherwise stays off and says so. The referee rule still holds: with no capable model, steps
 *   that need a referee say so instead of using a smaller model.
 * - A smaller first download: the GDELT 15-minute news files (about 3.4 GB of the 3.6 to 3.8 GB
 *   first download) are left out unless GDELT_RAW_WEEKS is set. The GDELT figures they feed read
 *   Missing with the reason; Menu > Offline data can still download them.
 * - The download at start-up and the daily run fetch only the countries on your watchlist (the
 *   first watchlist, the one the app opens with, plus countries you added), unless
 *   PRELOAD_COUNTRIES names them.
 *
 * Browser-safe: no fs. server.ts reads the files and passes their text in.
 */
import type { WatchlistGroup } from '../types/council';

type Env = Record<string, string | undefined>;

export function isLightMode(env: Env): boolean {
  return /^(on|true|1|yes)$/i.test(String(env.LIGHT_MODE || '').trim());
}

/** In light mode the GDELT news files are left out unless GDELT_RAW_WEEKS is set. */
export function skipGdeltRaw(env: Env): boolean {
  return isLightMode(env) && !String(env.GDELT_RAW_WEEKS || '').trim();
}

export const LIGHT_GDELT_NOTE =
  'Light mode: the GDELT 15-minute news files (about 3.4 GB) are not downloaded. Set GDELT_RAW_WEEKS in .env, or use Menu > Offline data, to download them.';

export type ProviderMode = 'gemini' | 'ollama' | 'hybrid' | 'openai_compatible';

/**
 * The AI provider a new browser starts with. Light mode means no model on this computer, so an
 * Ollama default (the Docker files' default) becomes Google Gemini, which answers only with your
 * own key. A provider you pick yourself in Settings is kept.
 */
export function defaultProvider(env: Env): ProviderMode {
  const p = String(env.DEFAULT_AI_PROVIDER || 'gemini').toLowerCase() as ProviderMode;
  const known: ProviderMode[] = ['gemini', 'ollama', 'hybrid', 'openai_compatible'];
  const mode = known.includes(p) ? p : 'gemini';
  if (isLightMode(env) && (mode === 'ollama' || mode === 'hybrid')) return 'gemini';
  return mode;
}

export const LIGHT_AI_NOTE =
  'Light mode is on: no AI model runs on this computer. The council answers only with your own Google Gemini key (Menu > Settings > API keys); without one it stays off and says so. Every figure, chart and signal works without it.';

/**
 * The countries the start-up download and the daily run fetch in light mode: the first watchlist
 * saved in the workspace (the one the app opens with) and the countries you added, or the first
 * default watchlist when nothing is saved yet. Unknown codes are dropped.
 */
export function lightModeCountries(
  workspaceValues: Array<Record<string, string | undefined>>,
  defaults: WatchlistGroup[],
  known: Set<string>,
): string[] {
  const out = new Set<string>();
  const add = (iso3: unknown) => {
    const k = String(iso3 || '').toUpperCase();
    if (/^[A-Z]{3}$/.test(k) && known.has(k)) out.add(k);
  };
  let sawSaved = false;
  for (const values of workspaceValues) {
    const groups = parseJson<WatchlistGroup[]>(values.sovereign_council_watchlists_v1);
    if (Array.isArray(groups) && groups.length) {
      sawSaved = true;
      for (const it of groups[0]?.items || []) if (!it?.isBenchmark) add(it?.iso3);
    }
    const custom = parseJson<Array<{ iso3?: string }>>(values.econquest_custom_sovereigns_v1);
    if (Array.isArray(custom)) for (const c of custom) add(c?.iso3);
  }
  if (!sawSaved) for (const it of defaults[0]?.items || []) add(it.iso3);
  return [...out];
}

function parseJson<T>(text: string | undefined): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
