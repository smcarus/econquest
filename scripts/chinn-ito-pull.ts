/**
 * `npm run chinn-ito:pull`: downloads the Chinn-Ito capital account openness file (KAOPEN,
 * web.pdx.edu/~ito/Chinn-Ito_website.htm) into data/local/chinn-ito/ as published (.xls), where
 * src/utils/chinnItoStore.ts reads it. The authors update it about once a year, so a file saved in
 * the last 30 days is left alone (`-- --force` downloads it again). The newest kaopen_<year>.xls
 * linked from the page is taken; a download is kept only if it reads as the Chinn-Ito table, and an
 * older copy is replaced only by one that reads.
 *
 * The file is for this computer only: the authors give no licence ("All rights reserved") and ask
 * that the index be credited to Chinn and Ito (2006). The app shows it with that citation and never
 * re-publishes the file.
 *
 * Exit code 1 when no readable file could be saved and none was there already.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chinnItoDir, chinnItoXlsRows } from '../src/utils/chinnItoStore.ts';
import { CHINN_ITO_PAGE, chinnItoLinks, parseChinnItoRows } from '../src/utils/chinnIto.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const dir = chinnItoDir(dataDir);
fs.mkdirSync(dir, { recursive: true });

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const force = process.argv.includes('--force');
const HEADERS = { Accept: '*/*', 'User-Agent': 'econquest open-source research' };

const saved = fs
  .readdirSync(dir)
  .filter((n) => /^kaopen_\d{4}\.xlsx?$/i.test(n))
  .map((n) => ({ n, mtime: fs.statSync(path.join(dir, n)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime)[0];
if (!force && saved && Date.now() - saved.mtime < MAX_AGE_MS) {
  console.log(`Chinn-Ito file ${saved.n} saved ${new Date(saved.mtime).toISOString().slice(0, 10)}; less than 30 days old, left alone.`);
  process.exit(0);
}

const tried: string[] = [];
let links: string[] = [];
try {
  const r = await fetch(CHINN_ITO_PAGE, { signal: AbortSignal.timeout(60_000), headers: HEADERS });
  if (r.ok) links = chinnItoLinks(await r.text());
  else tried.push(`page HTTP ${r.status}`);
} catch (e: any) {
  tried.push(`page: ${String(e?.message || e)}`);
}
if (!links.length && !tried.length) tried.push('the page links no kaopen_<year>.xls file');

let ok = false;
for (const url of links.slice(0, 3)) {
  const name = decodeURIComponent(url.split('/').pop() || 'kaopen.xls');
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(120_000), headers: HEADERS });
    if (!r.ok) {
      tried.push(`${name}: HTTP ${r.status}`);
      continue;
    }
    const bytes = new Uint8Array(await r.arrayBuffer());
    const rows = chinnItoXlsRows(bytes);
    const table = rows.length ? parseChinnItoRows(rows) : { reason: 'not an Excel .xls file' };
    if ('reason' in table) {
      tried.push(`${name} did not read as the Chinn-Ito table (${table.reason})`);
      continue;
    }
    const target = path.join(dir, name);
    fs.writeFileSync(`${target}.tmp`, bytes);
    fs.renameSync(`${target}.tmp`, target);
    console.log(`Saved ${name} (${Object.keys(table.countries).length} countries, ${table.firstYear}-${table.lastYear}) from ${url}`);
    ok = true;
    break;
  } catch (e: any) {
    tried.push(`${name}: ${String(e?.message || e)}`);
  }
}
if (!ok) {
  console.log(`Not saved: Chinn-Ito file: ${tried.join('; ')} (download kaopen_<year>.xls by hand from ${CHINN_ITO_PAGE} into ${dir})`);
  if (!saved) process.exitCode = 1;
  else console.log(`The copy ${saved.n} saved ${new Date(saved.mtime).toISOString().slice(0, 10)} is still used.`);
}
console.log(`Folder: ${dir}`);
