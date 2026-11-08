/**
 * `npm run gpr:pull`: downloads the monthly Geopolitical Risk index file (Caldara and Iacoviello,
 * matteoiacoviello.com/gpr.htm, CC BY) into data/local/gpr/ as published (.xls), where
 * src/utils/gprStore.ts reads it. The authors update it at the start of each month, so a file
 * saved in the last 7 days is left alone (`-- --force` downloads it again). A download is kept only
 * if it reads as the GPR table; an older copy is replaced only by one that reads. If the site
 * refuses automated downloads, nothing is forced: download the monthly file by hand and save it in
 * the same folder.
 *
 * Exit code 1 when no readable file could be saved and none was there already.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gprDir, gprXlsRows } from '../src/utils/gprStore.ts';
import { parseGprRows } from '../src/utils/gprIndex.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const dir = gprDir(dataDir);
fs.mkdirSync(dir, { recursive: true });

const PAGE = 'https://www.matteoiacoviello.com/gpr.htm';
const URLS = ['https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls', 'https://matteoiacoviello.com/gpr_files/data_gpr_export.xls'];
const NAME = 'data_gpr_export.xls';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const target = path.join(dir, NAME);
const force = process.argv.includes('--force');

const savedAt = (() => {
  try {
    return fs.statSync(target).mtimeMs;
  } catch {
    return 0;
  }
})();
if (!force && savedAt && Date.now() - savedAt < MAX_AGE_MS) {
  console.log(`GPR file saved ${new Date(savedAt).toISOString().slice(0, 10)}; less than 7 days old, left alone.`);
  process.exit(0);
}

const tried: string[] = [];
let ok = false;
for (const url of URLS) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(120_000), headers: { Accept: '*/*', 'User-Agent': 'econquest open-source research' } });
    if (!r.ok) {
      tried.push(`HTTP ${r.status}`);
      continue;
    }
    const bytes = new Uint8Array(await r.arrayBuffer());
    const rows = gprXlsRows(bytes);
    const table = rows.length ? parseGprRows(rows) : { reason: 'not an Excel .xls file' };
    if ('reason' in table) {
      tried.push(`did not read as the GPR table (${table.reason})`);
      continue;
    }
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, bytes);
    fs.renameSync(tmp, target);
    const last = table.months.at(-1);
    console.log(`Saved ${NAME} (${(bytes.length / 1e6).toFixed(1)} MB, ${table.months.length} months to ${last}) from ${url}`);
    ok = true;
    break;
  } catch (e: any) {
    tried.push(String(e?.message || e));
  }
}
if (!ok) {
  console.log(`Not saved: ${NAME}: ${tried.join('; ')} (download the monthly file by hand from ${PAGE} into ${dir})`);
  if (!savedAt) process.exitCode = 1;
  else console.log(`The copy saved ${new Date(savedAt).toISOString().slice(0, 10)} is still used.`);
}
console.log(`Folder: ${dir}`);
