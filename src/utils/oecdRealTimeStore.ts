/**
 * Saved OECD editions (CG15): data/local/oecd-vintages/<gdp|cpi>/<ISO3>.json, one file per country
 * and measure, as ALFRED-style rows. `npm run oecd:vintages` adds editions not yet saved. Node only.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { AlfredRow } from './alfredVintages';
import { OECD_MEMBERS, OECD_RT_DEFS, type OecdRtMeasure } from './oecdRealTime';
import type { VintageSeriesInput } from './realTimeEval';

export interface OecdVintageFile {
  iso3: string;
  measure: OecdRtMeasure;
  pulledAt: string;
  rows: AlfredRow[];
}

export const oecdVintageDir = (dataDir: string, m: OecdRtMeasure) => path.join(dataDir, 'local', 'oecd-vintages', m);

export function readOecdVintages(dataDir: string, m: OecdRtMeasure, iso3: string): OecdVintageFile | null {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(oecdVintageDir(dataDir, m), `${iso3}.json`), 'utf8')) as OecdVintageFile;
    return Array.isArray(j?.rows) ? j : null;
  } catch {
    return null;
  }
}

export function writeOecdVintages(dataDir: string, f: OecdVintageFile): void {
  const dir = oecdVintageDir(dataDir, f.measure);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${f.iso3}.json`), JSON.stringify(f));
}

/** Every saved country for one measure, as inputs to the real-time tests. */
export function loadOecdVintageInputs(dataDir: string, m: OecdRtMeasure): VintageSeriesInput[] {
  return OECD_MEMBERS.map((iso3) => readOecdVintages(dataDir, m, iso3))
    .filter((f): f is OecdVintageFile => Boolean(f?.rows.length))
    .map((f) => ({ where: f.iso3, def: OECD_RT_DEFS[m], rows: f.rows }));
}
