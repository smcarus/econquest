/**
 * Client mode: one switch (Menu > Client mode) for when what you download is going to someone else.
 *
 * With it on, every table download (figures, series, Compare countries, As of; CSV and Excel) holds
 * back each value whose source's terms do not let it be shown to clients: sources marked
 * "Permission needed for client or commercial use" or "Terms not confirmed" in the licence register,
 * and sources the register does not name. The row stays, with its source, so the reader sees what
 * was held back and why; the value reads "Withheld". Off, downloads are as before (your own
 * research use). The switch is saved in data/local/workspace.json so the server applies it too.
 *
 * Browser-safe.
 */
import { clientSafeStatus, licenceForSource } from './licenceLookup';

export const CLIENT_MODE_KEY = 'econquest.clientMode.v1';

export function clientModeFromValue(value: string | null | undefined): boolean {
  return value === '1';
}

export function loadClientMode(): boolean {
  try {
    return clientModeFromValue(localStorage.getItem(CLIENT_MODE_KEY));
  } catch {
    return false;
  }
}

export function saveClientMode(on: boolean): void {
  try {
    localStorage.setItem(CLIENT_MODE_KEY, on ? '1' : '0');
  } catch {
    // blocked storage: the switch is not remembered in this browser
  }
}

/** Why a value from this source is held back in client mode, or null when it can be shown. */
export function withheldReason(source: string | undefined): string | null {
  const lic = licenceForSource(source);
  if (lic && clientSafeStatus(lic.status)) return null;
  return `Withheld in client mode: ${lic ? lic.label.toLowerCase() : 'source not in the licence register'} (Menu > About & data licences)`;
}

type Cell = string | number | null | undefined;

/**
 * Rows of a download table with client mode applied. Works on any table with `value` and `source`
 * columns. Tables with a `status` column read "Withheld" there and give the reason in
 * `reason_if_missing`; tables without one get "Withheld" in the value cell itself.
 */
export function withholdForClients(header: string[], rows: Cell[][]): Cell[][] {
  const v = header.indexOf('value');
  const src = header.indexOf('source');
  if (v < 0 || src < 0) return rows;
  const status = header.indexOf('status');
  const reason = header.indexOf('reason_if_missing');
  return rows.map((row) => {
    const value = row[v];
    if (value === null || value === undefined || value === '') return row;
    const why = withheldReason(String(row[src] ?? ''));
    if (!why) return row;
    const out = [...row];
    if (status >= 0) {
      out[v] = null;
      out[status] = 'Withheld';
      if (reason >= 0) out[reason] = why;
    } else {
      out[v] = 'Withheld';
    }
    return out;
  });
}
