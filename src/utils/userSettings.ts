/**
 * Your own API keys, entered in the app (Menu > Settings > API keys) instead of .env.
 *
 * - Saved only on this computer, in data/local/settings.json (DATA_DIR/local when DATA_DIR is
 *   set), file mode 600, never committed (data/local/ is in .gitignore) and never sent anywhere
 *   except to the provider the key belongs to.
 * - A key saved in the app wins over the same key in .env. Removing it in the app goes back to
 *   the .env value, if there is one.
 * - The browser only ever sees a masked form (last four characters).
 *
 * One entry per key in API_KEY_FIELDS. Only FRED is wired today; EIA, Comtrade, EVDS and the CDS
 * switch can be added as further entries without changing the dialog or the endpoints.
 */
import fs from 'fs';
import path from 'path';

import { API_KEY_FIELDS, API_KEY_IDS, apiKeyField } from '../data/apiKeyFields';

export { API_KEY_FIELDS, API_KEY_IDS, apiKeyField, type ApiKeyField } from '../data/apiKeyFields';

export interface SavedSettings {
  apiKeys: Record<string, string>;
}

export type KeySource = 'app' | 'env' | 'none';

export interface ApiKeyStatus {
  id: string;
  label: string;
  provider: string;
  feeds: string;
  withoutIt: string;
  getKeyUrl: string;
  getKeySteps: string;
  checkId: string;
  /** Where the key in use comes from: saved in the app, .env, or not set. */
  source: KeySource;
  secret: boolean;
  section: 'free_key' | 'own_account';
  choices?: Array<{ value: string; label: string }>;
  placeholder?: string;
  /** Secret keys: last four characters only, e.g. "••••3f9a". Other settings: the value. Empty when not set. */
  masked: string;
  /** True when .env also has a value (shown so removing the app key is not a surprise). */
  envAlsoSet: boolean;
}

export function settingsFilePath(dataDir: string): string {
  return path.join(dataDir, 'local', 'settings.json');
}

export function maskKey(value: string): string {
  const v = (value || '').trim();
  if (!v) return '';
  return `••••${v.length > 8 ? v.slice(-4) : ''}`;
}

/** Reads the settings file; a missing or broken file reads as no saved keys. */
export function loadSettings(file: string): SavedSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const apiKeys: Record<string, string> = {};
    for (const id of API_KEY_IDS) {
      const v = raw?.apiKeys?.[id];
      if (typeof v === 'string' && v.trim()) apiKeys[id] = v.trim();
    }
    return { apiKeys };
  } catch {
    return { apiKeys: {} };
  }
}

/** Writes the settings file readable by this user only, via a temp file so a crash cannot leave half a file. */
export function saveSettings(file: string, settings: SavedSettings): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // not supported on this file system (Windows): the file is still outside the repo
  }
}

/** The key values the app uses: saved in the app first, then .env. */
export function effectiveKeys(envFromFile: Record<string, string | undefined>, saved: SavedSettings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of API_KEY_IDS) {
    const v = saved.apiKeys[id] || (envFromFile[id] || '').trim();
    if (v) out[id] = v;
  }
  return out;
}

export function keySources(envFromFile: Record<string, string | undefined>, saved: SavedSettings): Record<string, KeySource> {
  const out: Record<string, KeySource> = {};
  for (const id of API_KEY_IDS) out[id] = saved.apiKeys[id] ? 'app' : (envFromFile[id] || '').trim() ? 'env' : 'none';
  return out;
}

/**
 * Puts the effective keys into `env` (process.env in the app) so every feed reads them the usual
 * way. `envFromFile` is the .env value as it was at start, kept so removing an app key restores it.
 */
export function applyKeysToEnv(env: Record<string, string | undefined>, envFromFile: Record<string, string | undefined>, saved: SavedSettings): void {
  const eff = effectiveKeys(envFromFile, saved);
  for (const id of API_KEY_IDS) {
    if (eff[id]) env[id] = eff[id];
    else delete env[id];
  }
}

/** Snapshot of the .env values of the known keys, taken before any app key is applied. */
export function envKeySnapshot(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const id of API_KEY_IDS) out[id] = env[id];
  return out;
}

/** What the browser may see: never the key itself. */
export function describeKeys(envFromFile: Record<string, string | undefined>, saved: SavedSettings): ApiKeyStatus[] {
  const sources = keySources(envFromFile, saved);
  const eff = effectiveKeys(envFromFile, saved);
  return API_KEY_FIELDS.map((f) => ({
    id: f.id,
    label: f.label,
    provider: f.provider,
    feeds: f.feeds,
    withoutIt: f.withoutIt,
    getKeyUrl: f.getKeyUrl,
    getKeySteps: f.getKeySteps,
    checkId: f.checkId,
    source: sources[f.id],
    secret: f.secret !== false,
    section: f.section || 'free_key',
    ...(f.choices ? { choices: f.choices } : {}),
    ...(f.placeholder ? { placeholder: f.placeholder } : {}),
    masked: f.secret === false ? eff[f.id] || '' : maskKey(eff[f.id] || ''),
    envAlsoSet: Boolean((envFromFile[f.id] || '').trim()),
  }));
}

/** Validates and returns the new saved settings, or an error sentence. */
export function withKey(saved: SavedSettings, id: string, rawValue: unknown): { settings: SavedSettings } | { error: string } {
  const field = apiKeyField(id);
  if (!field) return { error: `Unknown key "${id}".` };
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) return { error: 'Paste a key first.' };
  const problem = field.validate(value);
  if (problem) return { error: problem };
  return { settings: { apiKeys: { ...saved.apiKeys, [id]: value } } };
}

export function withoutKey(saved: SavedSettings, id: string): SavedSettings {
  const apiKeys = { ...saved.apiKeys };
  delete apiKeys[id];
  return { apiKeys };
}

/**
 * Key changes are allowed only from this computer: the server listens on every network address,
 * so without this anyone on the same network could replace a key. SETTINGS_ALLOW_REMOTE="true"
 * lifts it (Docker, where the browser's requests arrive from the container network).
 */
export function isLocalRequest(remoteAddress: string | undefined, env: Record<string, string | undefined>): boolean {
  if ((env.SETTINGS_ALLOW_REMOTE || '').trim().toLowerCase() === 'true') return true;
  const a = (remoteAddress || '').trim();
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1' || a.startsWith('127.');
}
