/**
 * Consumer price sub-indices for one country (G26, src/utils/inflationDrivers.ts): Eurostat HICP for
 * EU members, BLS CPI-U on FRED for the United States, OECD consumer prices (via DBnomics) for other
 * OECD members. Kept 12 hours in memory (an hour after a miss).
 */
import { fetchJsonWithTimeout } from '../http';
import { fetchFredHistory } from './rates';
import { oecdFetch } from './oecd';
import { EUROSTAT_GEO, parseEurostatHicp } from '../../utils/nationalCpi';
import { dbnomicsUrl, parseOecdReply, seriesByArea } from '../../utils/oecdSdmx';
import { CPI_DATASET } from '../../utils/oecdInflation';
import { BLS_FRED, driversManrUrl, driversMinrUrl, driversWeightsUrl, OECD_PARTS, parseEurostatYears, yoyFromIndex, type DriverInputs, type DriverPart } from '../../utils/inflationDrivers';

const PARTS: DriverPart[] = ['headline', 'core', 'food', 'energy'];
const cache = new Map<string, { at: number; value: DriverInputs | null }>();

async function eurostat(iso3: string, geo: string, now: Date): Promise<DriverInputs> {
  const since = `${now.getUTCFullYear() - 3}-01`;
  const rates: DriverInputs['rates'] = {};
  const labels: DriverInputs['labels'] = {};
  const problems: string[] = [];
  await Promise.all(
    PARTS.map(async (part) => {
      const minr = parseEurostatHicp(await fetchJsonWithTimeout(driversMinrUrl(part, geo, since), 15000))[geo];
      if (minr?.length) {
        rates[part] = minr;
        labels[part] = 'Eurostat HICP, annual rate of change (prc_hicp_minr)';
        return;
      }
      const manr = parseEurostatHicp(await fetchJsonWithTimeout(driversManrUrl(part, geo, since), 15000))[geo];
      if (manr?.length) {
        rates[part] = manr;
        labels[part] = 'Eurostat HICP, annual rate of change (prc_hicp_manr, to December 2025)';
      } else problems.push(`Eurostat HICP ${part} for ${iso3}`);
    })
  );
  const weights: DriverInputs['weights'] = {};
  await Promise.all(
    (['core', 'food', 'energy'] as const).map(async (part) => {
      const w = parseEurostatYears(await fetchJsonWithTimeout(driversWeightsUrl(part, geo, now.getUTCFullYear() - 2), 15000));
      if (Object.keys(w).length) weights[part] = w;
    })
  );
  return { source: 'eurostat', rates, weights, labels, problems };
}

async function bls(now: Date): Promise<DriverInputs> {
  const from = `${now.getUTCFullYear() - 4}-01-01`;
  const rates: DriverInputs['rates'] = {};
  const labels: DriverInputs['labels'] = {};
  const problems: string[] = [];
  await Promise.all(
    PARTS.map(async (part) => {
      const obs = await fetchFredHistory(BLS_FRED[part], from).catch(() => null);
      const yoy = obs?.length ? yoyFromIndex(obs.map((o) => ({ period: o.date.slice(0, 7), value: o.value }))) : [];
      if (yoy.length) {
        rates[part] = yoy;
        labels[part] = `BLS CPI-U, not seasonally adjusted, via FRED (${BLS_FRED[part]})`;
      } else problems.push(`FRED ${BLS_FRED[part]}`);
    })
  );
  return { source: 'bls', rates, labels, problems };
}

async function oecd(iso3: string): Promise<DriverInputs> {
  const url = dbnomicsUrl(CPI_DATASET, { REF_AREA: [iso3], FREQ: ['M'], MEASURE: ['CPI'], EXPENDITURE: PARTS.map((p) => OECD_PARTS[p]), TRANSFORMATION: ['GY'] });
  const res = await oecdFetch(url, 20000).catch(() => null);
  const obs = res && res.status === 200 ? parseOecdReply(res.text, 60) : null;
  const rates: DriverInputs['rates'] = {};
  const labels: DriverInputs['labels'] = {};
  for (const part of PARTS) {
    const pts = obs ? seriesByArea(obs, { EXPENDITURE: [OECD_PARTS[part]], TRANSFORMATION: ['GY'] }, { METHODOLOGY: ['N', 'HICP'], ADJUSTMENT: ['N'] })[iso3] : undefined;
    if (pts?.length) {
      rates[part] = pts;
      labels[part] = 'OECD consumer prices via DBnomics (DF_PRICES_ALL), y/y';
    }
  }
  return { source: 'oecd', rates, labels, problems: obs ? [] : [`OECD consumer prices via DBnomics${res ? ` (HTTP ${res.status})` : ''}`] };
}

/** null when no source the app reads covers the country. */
export async function fetchInflationDrivers(iso3: string, oecdCovered: boolean, now = new Date()): Promise<DriverInputs | null> {
  const hit = cache.get(iso3);
  if (hit && Date.now() - hit.at < (hit.value?.rates.headline?.length ? 12 : 1) * 60 * 60 * 1000) return hit.value;
  const geo = EUROSTAT_GEO[iso3];
  const value = geo ? await eurostat(iso3, geo, now) : iso3 === 'USA' ? await bls(now) : oecdCovered ? await oecd(iso3) : null;
  cache.set(iso3, { at: Date.now(), value });
  return value;
}
