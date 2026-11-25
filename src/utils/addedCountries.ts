/**
 * Countries you add (Menu > Add a country) in the daily download (LI1).
 *
 * The page keeps the countries you add in the workspace (key econquest_custom_sovereigns_v1). Until
 * now the server only knew its built-in countries, so an added country was fetched live when you
 * opened it but never saved: no history, no As-of day, no alerts. The server now reads the added
 * countries from every workspace on disk (the shared one and each account's own) and puts them in
 * its own country list, so the start-up download and the daily run save them like the built-in
 * ones.
 *
 * At most ADDED_COUNTRIES_MAX are taken, in the order they were added, so the daily run stays
 * short; the rest are named on the Offline data page with the reason.
 *
 * Browser-safe (no fs).
 */
import type { AddedCountry } from '../types/council';
import { isCountryIso3 } from '../data/iso3166';

export const ADDED_COUNTRIES_KEY = 'econquest_custom_sovereigns_v1';
/** Added countries the daily download takes, across all workspaces. */
export const ADDED_COUNTRIES_MAX = 25;

export interface AddedCountriesPick {
  /** Countries to put in the server's list, in the order first seen. */
  countries: AddedCountry[];
  /** Valid added countries left out because the limit was reached. */
  overLimit: string[];
}

/**
 * The added countries to download from the given workspace values. Codes that are not ISO 3166
 * alpha-3 country codes are dropped; built-in countries (`builtIn`) are left out, because they are
 * downloaded already; the same country added in two workspaces counts once.
 */
export function pickAddedCountries(
  workspaceValues: Array<Record<string, string | undefined>>,
  builtIn: Set<string>,
  max = ADDED_COUNTRIES_MAX,
): AddedCountriesPick {
  const seen = new Set<string>();
  const countries: AddedCountry[] = [];
  const overLimit: string[] = [];
  for (const values of workspaceValues) {
    const list = parseList(values[ADDED_COUNTRIES_KEY]);
    for (const raw of list) {
      const iso3 = String(raw?.iso3 || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(iso3) || !isCountryIso3(iso3) || builtIn.has(iso3) || seen.has(iso3)) continue;
      seen.add(iso3);
      if (countries.length >= max) {
        overLimit.push(iso3);
        continue;
      }
      countries.push({
        iso3,
        countryName: cleanText(raw?.countryName) || iso3,
        region: cleanText(raw?.region),
        currencyCode: cleanText(raw?.currencyCode).toUpperCase().slice(0, 3),
      });
    }
  }
  return { countries, overLimit };
}

function parseList(text: string | undefined): Array<Partial<AddedCountry>> {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [];
  } catch {
    return [];
  }
}

function cleanText(v: unknown): string {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) : '';
}

/**
 * Of the `candidates`, the countries on any saved watchlist or added list in the given workspaces
 * (Sam, 25 November 2026): the countries on the IMF low-income debt list are built in and show in
 * every list, but the daily download saves only those someone follows.
 */
export function watchedCountries(workspaceValues: Array<Record<string, string | undefined>>, candidates: ReadonlySet<string>): Set<string> {
  const out = new Set<string>();
  const add = (raw: unknown) => {
    const iso3 = String(raw || '').trim().toUpperCase();
    if (candidates.has(iso3)) out.add(iso3);
  };
  for (const values of workspaceValues) {
    for (const group of parseJsonArray(values[WATCHLISTS_KEY])) {
      const items = (group as { items?: unknown })?.items;
      if (Array.isArray(items)) for (const it of items) add((it as { iso3?: unknown })?.iso3);
    }
    for (const c of parseList(values[ADDED_COUNTRIES_KEY])) add(c?.iso3);
  }
  return out;
}

/** Workspace key of the saved watchlists. */
export const WATCHLISTS_KEY = 'sovereign_council_watchlists_v1';

function parseJsonArray(text: string | undefined): unknown[] {
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
