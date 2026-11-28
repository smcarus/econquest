/**
 * A release pinned for the whole term (roadmap Phase 5, Q2). A class should see the same app from
 * the first week to the last, so `npm run class:setup` records the version and commit in use and the
 * last day of the term in data/local/class-release.json. Until that day, `npm run go` and
 * `npm run update` keep the code they have (scripts/safe-pull.sh) and say why; the day after, the pin
 * lapses by itself. `npm run class:setup -- --unpin` ends it early, for example for a security fix.
 *
 * Browser-safe: no server imports. The script is scripts/class-setup.ts.
 */

export interface ClassReleasePin {
  version: string;
  commit: string;
  pinnedOn: string;
  /** Last day of the term, YYYY-MM-DD; the pin holds through this day. */
  until: string;
}

export const CLASS_RELEASE_FILE = 'class-release.json';

/** The pin, if it still holds on `today` (YYYY-MM-DD). */
export function pinHolds(pin: ClassReleasePin | null, today: string): boolean {
  return Boolean(pin && /^\d{4}-\d{2}-\d{2}$/.test(pin.until) && today <= pin.until);
}

export function pinSentence(pin: ClassReleasePin, today: string): string {
  return pinHolds(pin, today)
    ? `Pinned for the term: version ${pin.version} (${pin.commit.slice(0, 7)}) until ${pin.until}. Updates wait until the term ends; npm run class:setup -- --unpin ends the pin early.`
    : `The term pin for version ${pin.version} ended on ${pin.until}; updates are back on.`;
}

/** Lines to set in .env for a class: classes on, and open to the school network unless local only. */
export function classEnvChanges(local: boolean): Record<string, string> {
  return local ? { CLASSES_ENABLED: 'on' } : { CLASSES_ENABLED: 'on', HOST: '0.0.0.0' };
}

/**
 * .env text with each key set to its value: an existing line (commented out or not) is replaced in
 * place, a missing key is added at the end. Nothing else changes.
 */
export function setEnvValues(text: string, values: Record<string, string>): string {
  const lines = text.split(/\r?\n/);
  const done = new Set<string>();
  const out = lines.map((line) => {
    const m = line.match(/^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/);
    const key = m?.[1];
    if (!key || !(key in values)) return line;
    // Only an uncommented line, or the first commented example when there is none, is replaced.
    const commented = /^\s*#/.test(line);
    const live = lines.some((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
    if ((commented && live) || done.has(key)) return line;
    done.add(key);
    return `${key}="${values[key]}"`;
  });
  const missing = Object.keys(values).filter((k) => !done.has(k));
  while (out.length && out[out.length - 1] === '') out.pop();
  return `${[...out, ...missing.map((k) => `${k}="${values[k]}"`)].join('\n')}\n`;
}

/** The address students type: the first private IPv4 address of this computer, with the port. */
export function studentAddress(addresses: Array<{ address: string; family: string | number; internal: boolean }>, port: number): string | null {
  const v4 = addresses.filter((a) => !a.internal && (a.family === 'IPv4' || a.family === 4));
  const priv = v4.find((a) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) ?? v4[0];
  return priv ? `http://${priv.address}:${port}` : null;
}
