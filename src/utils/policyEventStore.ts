/**
 * Your own events for "What happened after" (SC2): data/local/policy-events.json, a list of
 * { id, iso3, year, label, sourceUrl, savedAt }. Read and written by the server only. Not in the
 * Backup file (Settings > Backup) yet; copy data/local/ to keep it. Server and scripts only.
 */
import fs from 'fs';
import path from 'path';
import type { OwnEvent } from './policyEvents';

export function policyEventFile(dataDir: string): string {
  return path.join(dataDir, 'local', 'policy-events.json');
}

export function loadOwnEvents(file: string): OwnEvent[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed?.events) ? parsed.events.filter((e: OwnEvent) => e && typeof e.id === 'string' && /^[A-Z]{3}$/.test(e.iso3) && Number.isInteger(e.year)) : [];
  } catch {
    return [];
  }
}

/** Adds one event and returns it; ids are "e1", "e2", ... in the order saved. */
export function addOwnEvent(file: string, e: Omit<OwnEvent, 'id' | 'savedAt'>, now = new Date()): OwnEvent {
  const events = loadOwnEvents(file);
  const next = 1 + events.reduce((m, x) => Math.max(m, Number(x.id.replace(/^e/, '')) || 0), 0);
  const rec: OwnEvent = { id: `e${next}`, ...e, savedAt: now.toISOString() };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ events: [...events, rec] }, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
  return rec;
}
