/**
 * `npm run ucdp:pull`: fetches newer UCDP conflict data (ucdp.uu.se/downloads, free, CC BY 4.0)
 * into data/local/ucdp/, where src/utils/ucdpStore.ts reads it beside the release shipped in
 * datasets/ucdp/:
 *   - a newer yearly release (27.1, 28.1, ...) of the five datasets the app reads, once UCDP
 *     publishes it (usually in the spring);
 *   - the monthly Candidate Events files (GEDEvent_v<yy>_0_<m>.csv) for the months after the
 *     latest yearly release, which the app shows as preliminary.
 * Files already saved are left alone; a download is kept only if it reads as that UCDP file.
 * Nothing is forced: a month UCDP has not published yet is not there.
 *
 * Exit code 1 only when every download that should exist failed for a reason other than "not
 * published yet" (HTTP 404).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ucdpDir, UCDP_BUNDLED_DIR } from '../src/utils/ucdpStore.ts';
import { addUcdpCsv, emptyUcdpData } from '../src/utils/ucdpConflict.ts';
import { unzipSync, strFromU8 } from 'fflate';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const dir = ucdpDir(dataDir);
fs.mkdirSync(dir, { recursive: true });

const BASE = 'https://ucdp.uu.se/downloads';
const YEARLY = [
  { folder: 'ucdpprio', name: 'ucdp-prio-acd' },
  { folder: 'brd', name: 'ucdp-brd-conf' },
  { folder: 'nsos', name: 'ucdp-nonstate' },
  { folder: 'nsos', name: 'ucdp-onesided' },
  { folder: 'dyadic', name: 'ucdp-dyadic' },
];

const list = (d: string) => {
  try {
    return fs.readdirSync(d);
  } catch {
    return [];
  }
};
const have = new Set([...list(dir), ...list(UCDP_BUNDLED_DIR)]);
// Latest yearly release on disk, as two digits (26 for 26.1).
const latestYearly = Math.max(26, ...[...have].map((n) => Number(n.match(/-(\d{2})1-csv\.zip$/)?.[1] || 0)));
const now = new Date();
const thisYY = now.getUTCFullYear() % 100;

async function get(url: string): Promise<{ bytes: Uint8Array } | { status: number } | { error: string }> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(180_000), headers: { Accept: '*/*', 'User-Agent': 'econquest open-source research' } });
    if (!r.ok) return { status: r.status };
    return { bytes: new Uint8Array(await r.arrayBuffer()) };
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

function reads(name: string, bytes: Uint8Array): boolean {
  const data = emptyUcdpData();
  const texts = /\.zip$/i.test(name)
    ? Object.values(unzipSync(bytes, { filter: (f) => /\.csv$/i.test(f.name) && !f.name.startsWith('__MACOSX') })).map((u) => strFromU8(u))
    : [strFromU8(bytes)];
  return texts.some((t, i) => addUcdpCsv(data, `${name}#${i}`, t) !== null);
}

let saved = 0;
const problems: string[] = [];
let attemptsThatShouldExist = 0;

async function fetchOne(name: string, url: string, expected: boolean): Promise<void> {
  if (have.has(name)) return;
  const got = await get(url);
  if ('bytes' in got) {
    if (!reads(name, got.bytes)) {
      problems.push(`${name}: downloaded but did not read as a UCDP file`);
      return;
    }
    const tmp = path.join(dir, `${name}.tmp`);
    fs.writeFileSync(tmp, got.bytes);
    fs.renameSync(tmp, path.join(dir, name));
    have.add(name);
    saved++;
    console.log(`Saved ${name} (${(got.bytes.length / 1e6).toFixed(1)} MB) from ${url}`);
    return;
  }
  if ('status' in got && got.status === 404) {
    if (expected) problems.push(`${name}: not on the UCDP site (HTTP 404); UCDP may have renamed it, see ${BASE}/`);
    return;
  }
  if (expected) attemptsThatShouldExist++;
  problems.push(`${name}: ${'status' in got ? `HTTP ${got.status}` : got.error}`);
}

// 1. Newer yearly releases (none expected before UCDP announces one, so a 404 is quiet).
for (let yy = latestYearly + 1; yy <= thisYY; yy++)
  for (const d of YEARLY) await fetchOne(`${d.name}-${yy}1-csv.zip`, `${BASE}/${d.folder}/${d.name}-${yy}1-csv.zip`, false);
const yearly = Math.max(latestYearly, ...[...have].map((n) => Number(n.match(/-(\d{2})1-csv\.zip$/)?.[1] || 0)));

// 2. Monthly Candidate Events after the latest yearly release (release yy covers the year 20yy-1).
// A month is usually out about five weeks after it ends; a month older than 75 days that is still
// missing is reported.
for (let yy = yearly; yy <= thisYY; yy++) {
  for (let m = 1; m <= 12; m++) {
    const monthEnd = Date.UTC(2000 + yy, m, 0);
    if (monthEnd >= now.getTime()) break;
    const name = `GEDEvent_v${yy}_0_${m}.csv`;
    const expected = now.getTime() - monthEnd > 75 * 86400000;
    await fetchOne(name, `${BASE}/candidateged/${name}`, expected);
  }
}

console.log(`Saved ${saved} new UCDP file(s) in ${path.relative(root, dir) || dir}. Latest yearly release on disk: ${yearly}.1.`);
if (problems.length) {
  console.log(`Not saved (${problems.length}):`);
  for (const p of problems) console.log(`  ${p}`);
  if (attemptsThatShouldExist && !saved) process.exitCode = 1;
}
