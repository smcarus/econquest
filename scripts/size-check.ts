/**
 * Size check: fails when a build is bigger than its limit, so the app cannot quietly get heavier.
 *
 *   npm run size:check            checks every build that exists (web: dist/, phone: mobile/dist/)
 *   npm run size:check -- --report   prints the sizes without failing
 *
 * "Start code" is the JavaScript a browser or phone must load before the first screen: the entry
 * script in index.html plus every file it preloads. Files loaded later (the PDF reader, chart
 * pages) do not count towards it but do count towards the largest-file and total limits.
 *
 * The phone limits come from the mobile build plan. The web limits hold today's size as a
 * ceiling: the web build may shrink, never grow, until the shared-engine work brings it down.
 */
import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';

export type Limits = {
  startKB: number;
  startGzipKB: number;
  largestJsKB: number;
  totalMB: number;
};

export type Target = { name: string; dir: string; limits: Limits };

export const TARGETS: Target[] = [
  // Measured 8 Nov 2026: start 1 450 KB (447 KB compressed), largest file 1 242 KB (the PDF reader's
  // worker, loaded only when a PDF is opened), total 4.86 MB. Limits leave about 3% for small changes.
  { name: 'web', dir: 'dist', limits: { startKB: 1500, startGzipKB: 460, largestJsKB: 1280, totalMB: 5 } },
  { name: 'phone', dir: 'mobile/dist', limits: { startKB: 1000, startGzipKB: 300, largestJsKB: 400, totalMB: 20 } },
];

export type Measured = {
  startKB: number;
  startGzipKB: number;
  largestJsKB: number;
  largestJsFile: string;
  totalMB: number;
  startFiles: string[];
};

const KB = 1024;

function filesUnder(dir: string, rel = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const child = rel === '' ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...filesUnder(dir, child));
    else if (entry.isFile()) out.push(child);
  }
  return out;
}

/** The JavaScript files index.html loads at start: module scripts and module preloads. */
export function startFilesFromHtml(html: string): string[] {
  const found = new Set<string>();
  const tags = html.match(/<(script|link)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const isScript = /^<script/i.test(tag);
    const isPreload = /rel=["']?modulepreload/i.test(tag);
    if (!isScript && !isPreload) continue;
    const ref = /(?:src|href)=["']([^"']+\.m?js)["']/i.exec(tag)?.[1];
    if (ref && !/^https?:/i.test(ref)) found.add(ref.replace(/^\.?\//, ''));
  }
  return [...found];
}

export function measureBuild(dir: string): Measured {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const startFiles = startFilesFromHtml(html);
  let start = 0;
  let startGzip = 0;
  for (const rel of startFiles) {
    const bytes = fs.readFileSync(path.join(dir, rel));
    start += bytes.length;
    startGzip += gzipSync(bytes, { level: 9 }).length;
  }
  let total = 0;
  let largest = 0;
  let largestFile = '';
  for (const rel of filesUnder(dir)) {
    const size = fs.statSync(path.join(dir, rel)).size;
    total += size;
    if (/\.m?js$/.test(rel) && size > largest) {
      largest = size;
      largestFile = rel;
    }
  }
  return {
    startKB: Math.round(start / KB),
    startGzipKB: Math.round(startGzip / KB),
    largestJsKB: Math.round(largest / KB),
    largestJsFile: largestFile,
    totalMB: Math.round((total / KB / KB) * 100) / 100,
    startFiles,
  };
}

/** Plain-language lines for every limit that is broken; empty when the build fits. */
export function overLimits(m: Measured, limits: Limits): string[] {
  const out: string[] = [];
  if (m.startKB > limits.startKB) out.push(`Start code is ${m.startKB} KB; the limit is ${limits.startKB} KB.`);
  if (m.startGzipKB > limits.startGzipKB) out.push(`Start code is ${m.startGzipKB} KB compressed; the limit is ${limits.startGzipKB} KB.`);
  if (m.largestJsKB > limits.largestJsKB) out.push(`${m.largestJsFile} is ${m.largestJsKB} KB; no single file may pass ${limits.largestJsKB} KB.`);
  if (m.totalMB > limits.totalMB) out.push(`The whole build is ${m.totalMB} MB; the limit is ${limits.totalMB} MB.`);
  return out;
}

function main(argv: string[]): number {
  const reportOnly = argv.includes('--report');
  let failed = false;
  let checked = 0;
  for (const target of TARGETS) {
    if (!fs.existsSync(path.join(target.dir, 'index.html'))) {
      console.log(`${target.name}: no build in ${target.dir}/, skipped.`);
      continue;
    }
    checked += 1;
    const m = measureBuild(target.dir);
    const l = target.limits;
    console.log(`${target.name}: start ${m.startKB}/${l.startKB} KB (${m.startGzipKB}/${l.startGzipKB} KB compressed), largest file ${m.largestJsKB}/${l.largestJsKB} KB (${m.largestJsFile}), total ${m.totalMB}/${l.totalMB} MB`);
    const problems = overLimits(m, l);
    for (const p of problems) console.log(`  OVER: ${p}`);
    if (problems.length > 0) failed = true;
  }
  if (checked === 0) {
    console.log('No builds found. Run npm run build first.');
    return reportOnly ? 0 : 1;
  }
  return failed && !reportOnly ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  process.exit(main(process.argv.slice(2)));
}
