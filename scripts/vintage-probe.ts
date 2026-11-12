/**
 * Looks at the two free sources of figures as first published that the app plans to read (G12 euro
 * area, G13 UK) and prints their layout, so the readers can be written against the real files:
 *
 *   npm run check:vintages
 *
 * - ECB Data Portal, Euro Area Real-Time Database (dataset RTD): the code lists for the
 *   real-time concept, denomination and adjustment, the series the dataset holds, and a few
 *   observations of the GDP, HICP and unemployment series in CSV, with and without history.
 * - ONS revision triangles for UK GDP (ABMI): the dataset page's file list, the files inside the
 *   latest zip, and the first rows of each worksheet.
 *
 * Needs no key and no running server. Prints to the screen and saves the same text to
 * data/local/vintage-probe.txt. Downloads nothing else and changes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { DATA_DIR } from '../src/server/config.ts';
import { readXlsxSheet, xlsxSheetNames } from '../src/utils/xlsxRead.ts';

const out: string[] = [];
const say = (s = '') => {
  console.log(s);
  out.push(s);
};

async function get(url: string): Promise<{ ok: boolean; status: number; type: string; bytes: Uint8Array; text: string }> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'econquest-vintage-probe' }, signal: AbortSignal.timeout(90000) });
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { ok: res.ok, status: res.status, type: res.headers.get('content-type') || '', bytes, text: new TextDecoder().decode(bytes) };
  } catch (e) {
    return { ok: false, status: 0, type: String((e as Error)?.message || e), bytes: new Uint8Array(), text: '' };
  }
}

const head = (text: string, n: number) => text.split(/\r?\n/).slice(0, n).map((l) => (l.length > 400 ? `${l.slice(0, 400)}...` : l));

// --- ECB RTD ---
const ECB = 'https://data-api.ecb.europa.eu/service';
say('=== ECB Euro Area Real-Time Database (RTD)');
const codes: Record<string, Array<{ id: string; name: string }>> = {};
for (const list of ['CL_RT_ECON_CONCEPT', 'CL_RT_DENOM', 'CL_ADJUSTMENT', 'CL_AREA_EE']) {
  const r = await get(`${ECB}/codelist/ECB/${list}`);
  if (!r.ok) {
    say(`${list}: HTTP ${r.status} ${r.type}`);
    continue;
  }
  codes[list] = [...r.text.matchAll(/<str:Code\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/str:Code>/g)].map((m) => ({
    id: m[1],
    name: (m[2].match(/<com:Name\b[^>]*xml:lang="en"[^>]*>([^<]*)</) || m[2].match(/<com:Name\b[^>]*>([^<]*)</) || [])[1] || '',
  }));
  const all = codes[list];
  const pick = list === 'CL_RT_ECON_CONCEPT' ? all.filter((c) => /gdp|domestic product|hicp|consumer price|unemploy/i.test(c.name)) : list === 'CL_AREA_EE' ? all.filter((c) => /^(S0|U2|I8|I9|DE|FR|IT|ES)$/.test(c.id)) : all;
  say(`${list}: ${all.length} codes; showing ${pick.length}`);
  for (const c of pick.slice(0, 80)) say(`  ${c.id}  ${c.name}`);
}

const list = await get(`${ECB}/data/RTD?detail=nodata&format=csvdata`);
let keys: string[] = [];
if (list.ok) {
  const lines = list.text.split(/\r?\n/).filter(Boolean);
  say(`\nRTD series (detail=nodata): ${lines.length - 1} rows. Header: ${lines[0]}`);
  keys = lines.slice(1).map((l) => l.split(',')[0] === 'RTD' ? l.split(',').slice(0, 6).join('.') : l.split(',')[0]);
  for (const l of lines.slice(1)) say(`  ${l.length > 300 ? `${l.slice(0, 300)}...` : l}`);
} else say(`\nRTD series list: HTTP ${list.status} ${list.type}`);

const wanted = (codes.CL_RT_ECON_CONCEPT || []).filter((c) => /gdp|domestic product|hicp|unemploy/i.test(c.name)).map((c) => c.id);
const samples = keys.filter((k) => wanted.some((w) => k.includes(`.${w}.`))).slice(0, 6);
say(`\nSample series picked: ${samples.join(', ') || 'none (the list or the code lists did not answer)'}`);
for (const k of samples) {
  const key = k.replace(/^RTD\./, '');
  for (const extra of ['lastNObservations=6', 'lastNObservations=6&includeHistory=true']) {
    const r = await get(`${ECB}/data/RTD/${key}?format=csvdata&${extra}`);
    say(`\n--- RTD/${key} (${extra}): HTTP ${r.status}`);
    if (r.ok) for (const l of head(r.text, 14)) say(`  ${l}`);
  }
}

// --- ONS revision triangles ---
say('\n=== ONS revision triangles (UK GDP, ABMI)');
const PAGE = 'https://www.ons.gov.uk/economy/grossdomesticproductgdp/datasets/revisionstrianglesforukgdpabmi';
const page = await get(`${PAGE}/data`);
let fileUri = '';
if (page.ok) {
  try {
    const j = JSON.parse(page.text) as { datasets?: Array<{ uri?: string }>; description?: { releaseDate?: string; nextRelease?: string } };
    say(`release ${j.description?.releaseDate || '?'}; next ${j.description?.nextRelease || '?'}`);
    for (const d of j.datasets || []) {
      const ed = await get(`https://www.ons.gov.uk${d.uri}/data`);
      if (!ed.ok) continue;
      const e = JSON.parse(ed.text) as { downloads?: Array<{ file?: string }>; description?: { edition?: string } };
      say(`  edition: ${e.description?.edition || d.uri}; files: ${(e.downloads || []).map((x) => x.file).join(', ')}`);
      if (!fileUri && e.downloads?.[0]?.file) fileUri = `${d.uri}/${e.downloads[0].file}`;
    }
  } catch (e) {
    say(`page JSON not read: ${(e as Error).message}; first lines: ${head(page.text, 3).join(' | ')}`);
  }
} else say(`dataset page: HTTP ${page.status} ${page.type}`);
if (!fileUri) fileUri = '/economy/grossdomesticproductgdp/datasets/revisionstrianglesforukgdpabmi/quarter2aprtojune2026quarterlynationalaccounts/abmi.zip';
const fileUrl = `https://www.ons.gov.uk/file?uri=${encodeURIComponent(fileUri)}`;
const file = await get(fileUrl);
say(`\nfile ${fileUrl}: HTTP ${file.status} ${file.type}, ${file.bytes.length} bytes`);

async function showWorkbook(name: string, bytes: Uint8Array) {
  if (!/\.xlsx$/i.test(name)) {
    say(`  ${name}: ${bytes.length} bytes (not xlsx; first bytes ${[...bytes.slice(0, 8)].map((b) => b.toString(16)).join(' ')})`);
    return;
  }
  const sheets = await xlsxSheetNames(bytes);
  say(`  ${name}: sheets ${sheets.join(' | ')}`);
  for (const s of sheets.slice(0, 8)) {
    const rows = (await readXlsxSheet(bytes, s)) || [];
    say(`  --- sheet "${s}": ${rows.length} rows, widest ${Math.max(0, ...rows.map((r) => r.length))} columns`);
    for (const r of rows.slice(0, 12)) say(`    ${r.slice(0, 9).map((c) => String(c ?? '').slice(0, 28)).join(' | ')}`);
    if (rows.length > 12) say(`    ... last row: ${rows[rows.length - 1].slice(0, 9).join(' | ')}`);
  }
}

if (file.ok && file.bytes[0] === 0x50 && file.bytes[1] === 0x4b) {
  let inner: Record<string, Uint8Array> = {};
  try {
    inner = unzipSync(file.bytes);
  } catch {
    inner = {};
  }
  const names = Object.keys(inner);
  if (names.some((n) => n.startsWith('xl/'))) await showWorkbook('abmi.xlsx', file.bytes);
  else {
    say(`zip holds: ${names.join(', ')}`);
    for (const n of names) await showWorkbook(n, inner[n]);
  }
} else if (file.ok) say(`not a zip; first lines: ${head(file.text, 3).join(' | ')}`);

const searchUrl = 'https://www.ons.gov.uk/search/data?q=revisions%20triangle&filter=datasets';
const search = await get(searchUrl);
say(`\nONS search for other revision triangles: HTTP ${search.status}`);
if (search.ok) {
  const uris = [...new Set([...search.text.matchAll(/"uri"\s*:\s*"([^"]*datasets\/[^"]*)"/g)].map((m) => m[1]))];
  for (const u of uris.slice(0, 30)) say(`  ${u}`);
}

const dest = path.join(DATA_DIR, 'local', 'vintage-probe.txt');
try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${out.join('\n')}\n`);
  console.log(`\nSaved to ${dest}`);
} catch (e) {
  console.log(`\nCould not save ${dest}: ${(e as Error).message}`);
}
