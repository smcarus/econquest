/**
 * What this means for you (src/utils/priceGroups.ts): the official consumer price groups for one
 * country. Eurostat for EU members; the IMF groups for others when IMF_CPI_GROUPS=on (after the Mac
 * check, src/utils/imfCpiGroups.ts); otherwise food, energy and the rest from the Inflation drivers
 * sources. Kept 12 hours in memory (an hour after a miss).
 */
import { fetchJsonWithTimeout } from '../http';
import { EUROSTAT_GEO } from '../../utils/nationalCpi';
import { eurostatGroups, groupsManrUrl, groupsMinrUrl, groupsWeightsUrl, partsGroups, type PriceGroupsOutcome } from '../../utils/priceGroups';
import { imfGroupsOn, pullImfGroups } from '../../utils/imfCpiGroups';
import type { ImfCpiStructure } from '../../utils/imfCpi';
import { fetchInflationDrivers } from './inflationDrivers';
import { loadImfCpi } from './imf';

const cache = new Map<string, { at: number; value: PriceGroupsOutcome }>();
let imfStructure: { at: number; s: ImfCpiStructure } | null = null;

async function eurostat(iso3: string, geo: string, now: Date): Promise<PriceGroupsOutcome> {
  const since = `${now.getUTCFullYear() - 3}-01`;
  const minr = await fetchJsonWithTimeout(groupsMinrUrl(geo, since), 20000).catch(() => null);
  let r = eurostatGroups(iso3, { minr });
  // Older classification only when the newer one sent no groups.
  const classification = r.ok ? r.classification : 'ecoicop';
  const manr = r.ok ? undefined : await fetchJsonWithTimeout(groupsManrUrl(geo, since), 20000).catch(() => null);
  const weights = await fetchJsonWithTimeout(groupsWeightsUrl(classification === 'coicop2018' ? 'coicop2018' : 'ecoicop', geo, now.getUTCFullYear() - 2), 20000).catch(() => null);
  r = eurostatGroups(iso3, { minr, manr, weights });
  return r;
}

async function imf(iso3: string): Promise<PriceGroupsOutcome | null> {
  const saved = loadImfCpi()?.series?.[iso3];
  if (!saved?.points?.length) return null;
  const fresh = imfStructure && Date.now() - imfStructure.at < 7 * 24 * 60 * 60 * 1000 ? imfStructure.s : null;
  const r = await pullImfGroups({ fetchFn: (u, i) => fetch(u, i), timeoutMs: 30000, structure: fresh, headline: saved.points, headlineLabel: saved.long }, iso3);
  if (r.structure) imfStructure = { at: Date.now(), s: r.structure };
  if (!r.outcome.ok) console.warn(`[IMF CPI groups] ${iso3}: ${r.note}`);
  return r.outcome.ok ? r.outcome : null;
}

/** The groups for one country; `oecdCovered` as for Inflation drivers. */
export async function fetchPriceGroups(iso3: string, oecdCovered: boolean, now = new Date()): Promise<PriceGroupsOutcome> {
  const hit = cache.get(iso3);
  if (hit && Date.now() - hit.at < (hit.value.ok ? 12 : 1) * 60 * 60 * 1000) return hit.value;
  let value: PriceGroupsOutcome | null = null;
  const geo = EUROSTAT_GEO[iso3];
  if (geo) value = await eurostat(iso3, geo, now);
  else if (imfGroupsOn(process.env)) value = await imf(iso3).catch(() => null);
  if (!value || !value.ok) {
    const covered = Boolean(geo) || iso3 === 'USA' || oecdCovered;
    const parts = covered ? partsGroups(iso3, await fetchInflationDrivers(iso3, oecdCovered, now).catch(() => null)) : partsGroups(iso3, null);
    // Keep Eurostat's reason when the three parts did not answer either.
    value = parts.ok || !value ? parts : value;
  }
  cache.set(iso3, { at: Date.now(), value });
  return value;
}
