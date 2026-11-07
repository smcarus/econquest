/**
 * The saved workspace session and the countries the user added (browser storage).
 */
import type { AddedCountry, WorkspaceSessionSnapshot } from '../types/council';

export const WORKSPACE_SESSION_STORAGE_KEY = 'econquest_turnkey_workspace_session_v1';
export const CUSTOM_SOVEREIGNS_STORAGE_KEY = 'econquest_custom_sovereigns_v1';

/**
 * Keeps only the names of an added country. Older versions saved typed-in figures with each
 * country; those are dropped here, so they never reach a screen.
 */
export function toAddedCountry(raw: unknown): AddedCountry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const iso3 = String(r.iso3 ?? '').trim().toUpperCase().slice(0, 3);
  const countryName = String(r.countryName ?? '').trim();
  if (!/^[A-Z]{3}$/.test(iso3) || !countryName) return null;
  return {
    iso3,
    countryName,
    region: String(r.region ?? '').trim(),
    currencyCode: String(r.currencyCode ?? '').trim().toUpperCase().slice(0, 3),
  };
}

export function saveWorkspaceSessionToStorage(snapshot: WorkspaceSessionSnapshot): void {
  try {
    localStorage.setItem(WORKSPACE_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    localStorage.setItem(CUSTOM_SOVEREIGNS_STORAGE_KEY, JSON.stringify(snapshot.customOnboardedSovereigns || []));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadWorkspaceSessionFromStorage(): WorkspaceSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.schemaVersion === 'ECONQUEST-SESSION-1.0') {
      return parsed as WorkspaceSessionSnapshot;
    }
  } catch {
    // Ignore malformed JSON
  }
  return null;
}

export function loadAddedCountriesFromStorage(): AddedCountry[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SOVEREIGNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(toAddedCountry).filter((c): c is AddedCountry => c !== null);
  } catch {
    // Ignore
  }
  return [];
}
