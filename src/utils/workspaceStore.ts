/**
 * Your holdings, watchlists, added countries and AI model settings, kept on disk in
 * data/local/workspace.json (mode 600) instead of only in the browser.
 *
 * Why: the browser keeps its storage per address, so the app under Docker (localhost:3737) and
 * under `npm run dev` (localhost:3000) saw different holdings, and clearing browser data lost them.
 * The browser still keeps a copy for speed; this file is the one both addresses share.
 */
import fs from 'fs';
import path from 'path';
import { writeFileAtomic } from './atomicWrite';

/** The browser storage keys kept on disk, with what each holds. */
export const WORKSPACE_KEYS: Record<string, string> = {
  'econquest.holdings.v1': 'holdings',
  sovereign_council_watchlists_v1: 'watchlists',
  econquest_custom_sovereigns_v1: 'countries you added',
  econquest_ai_runtime_config_v1: 'AI model settings',
};

/** Largest value kept for one key (a long holdings list is well under this). */
export const MAX_WORKSPACE_VALUE = 2_000_000;

export interface WorkspaceFile {
  version: 1;
  values: Record<string, string>;
  updatedAt: Record<string, string>;
}

export function workspaceFilePath(dataDir: string): string {
  return path.join(dataDir, 'local', 'workspace.json');
}

function empty(): WorkspaceFile {
  return { version: 1, values: {}, updatedAt: {} };
}

export function loadWorkspace(file: string): WorkspaceFile {
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const out = empty();
    for (const key of Object.keys(WORKSPACE_KEYS)) {
      if (typeof raw?.values?.[key] === 'string') {
        out.values[key] = raw.values[key];
        if (typeof raw?.updatedAt?.[key] === 'string') out.updatedAt[key] = raw.updatedAt[key];
      }
    }
    return out;
  } catch {
    return empty();
  }
}

/** Problem with a key or value, or null when it can be saved. `null` value removes the key. */
export function workspaceProblem(key: string, value: unknown): string | null {
  if (!Object.prototype.hasOwnProperty.call(WORKSPACE_KEYS, key)) return `Unknown item "${String(key).slice(0, 60)}".`;
  if (value === null) return null;
  if (typeof value !== 'string') return 'The value must be text.';
  if (value.length > MAX_WORKSPACE_VALUE) return 'That is too large to keep.';
  try {
    JSON.parse(value);
  } catch {
    return 'The value is not valid JSON.';
  }
  return null;
}

export function setWorkspaceValue(file: string, key: string, value: string | null, now = new Date()): WorkspaceFile {
  const next = loadWorkspace(file);
  if (value === null) {
    delete next.values[key];
    delete next.updatedAt[key];
  } else {
    next.values[key] = value;
    next.updatedAt[key] = now.toISOString();
  }
  writeFileAtomic(file, JSON.stringify(next), 0o600);
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // not supported on this file system (Windows)
  }
  return next;
}
