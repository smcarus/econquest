/**
 * The Quests and Classes switches in Menu > Settings > Quests and classes. An administrator can turn
 * each one on or off in the app instead of editing .env; the choice is kept by the server in
 * data/local/features.json (DATA_DIR/local when DATA_DIR is set). A choice made in the app wins over
 * .env; "Follow .env" removes it, and QUESTS_ENABLED / CLASSES_ENABLED in .env decide again, as
 * before. No restart is needed: the server reads the switch on every request.
 *
 * Browser-safe, pure.
 */

export const FEATURE_IDS = ['quests', 'classes'] as const;
export type FeatureId = (typeof FEATURE_IDS)[number];
export type FeatureChoice = 'on' | 'off';

export interface FeatureFile {
  quests?: FeatureChoice;
  classes?: FeatureChoice;
  /** When the file was last changed, ISO. */
  since?: string;
  /** Who changed it (account name, or "this computer"). */
  by?: string;
}

export interface FeatureState {
  /** Whether the feature is on now. */
  on: boolean;
  /** Where that comes from: a choice saved in the app, or .env. */
  source: 'app' | 'env';
  /** What .env alone says, so the page can show what "Follow .env" would give. */
  envOn: boolean;
}

/** Fired in the browser after a switch changes, so the menu can look again. */
export const FEATURES_CHANGED_EVENT = 'econquest:features-changed';

const choice = (v: unknown): FeatureChoice | undefined => (v === 'on' || v === 'off' ? v : undefined);

/** Reads the saved file; anything unexpected reads as no choice (so .env decides). */
export function parseFeatureFile(raw: unknown): FeatureFile {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: FeatureFile = {};
  for (const id of FEATURE_IDS) {
    const c = choice(o[id]);
    if (c) out[id] = c;
  }
  if (typeof o.since === 'string') out.since = o.since;
  if (typeof o.by === 'string') out.by = o.by.slice(0, 80);
  return out;
}

/** Whether a feature is on: the app's choice when there is one, otherwise .env. */
export function featureState(file: FeatureFile, id: FeatureId, envOn: boolean): FeatureState {
  const c = file[id];
  return c ? { on: c === 'on', source: 'app', envOn } : { on: envOn, source: 'env', envOn };
}

/**
 * Applies a change from Settings: "on" or "off" saves a choice, "env" removes it. Returns the new
 * file and the problems with the request (unknown feature or value); nothing changes on a problem.
 */
export function applyFeatureChange(file: FeatureFile, body: unknown, by: string, now: string): { file: FeatureFile; problems: string[] } {
  const o = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const problems: string[] = [];
  const next: FeatureFile = { ...file };
  let changed = false;
  for (const [k, v] of Object.entries(o)) {
    if (!(FEATURE_IDS as readonly string[]).includes(k)) {
      problems.push(`${k}: not a switch (quests or classes)`);
      continue;
    }
    if (v === 'env') delete next[k as FeatureId];
    else if (v === 'on' || v === 'off') next[k as FeatureId] = v;
    else {
      problems.push(`${k}: on, off or env`);
      continue;
    }
    changed = true;
  }
  if (!changed && !problems.length) problems.push('Nothing to change: send quests or classes as on, off or env');
  if (problems.length) return { file, problems };
  return { file: { ...next, since: now, by }, problems };
}
