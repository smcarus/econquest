/**
 * The pre-registered backtests as the server holds them (/api/validation): verdicts override a
 * register entry's status, so every badge shows the latest. Loaded once, shared by every badge.
 */
import { useEffect, useState } from 'react';
import type { ValidationReply } from '../utils/validationGrades';

// The pure parts (types, effective status, Holm readings, grades) live in src/utils/validationGrades.ts
// so the server can work out the same badges for its events and API.
export { effectiveStatus, entryGrade, failsStricterCheck, fromProjectRecord, projectVerdicts, validationHolm, type ProjectVerdict, type ValidationReply, type ValidationSpecInfo } from '../utils/validationGrades';

let cache: ValidationReply | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<(v: ValidationReply | null) => void>();
const publish = () => listeners.forEach((l) => l(cache));

export function reloadValidation(): Promise<void> {
  loading = fetch('/api/validation')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j) cache = j;
      publish();
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

export async function runValidation(): Promise<string | null> {
  if (cache) {
    cache = { ...cache, running: true };
    publish();
  }
  try {
    const r = await fetch('/api/validation/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json().catch(() => ({}));
    await reloadValidation();
    return r.ok ? null : j?.error || `HTTP ${r.status}`;
  } catch (e: any) {
    await reloadValidation();
    return String(e?.message || e);
  }
}

export function useValidation(): ValidationReply | null {
  const [v, setV] = useState<ValidationReply | null>(cache);
  useEffect(() => {
    listeners.add(setV);
    if (!cache && !loading) void reloadValidation();
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
