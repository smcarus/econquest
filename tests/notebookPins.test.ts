import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import type { ChartResult } from '../src/utils/councilChart';
import { MAX_PINS, isChart, makePin, parsePins, pinAsOf, pinFingerprintText, pinsMarkdown, trimChart } from '../src/utils/notebookPins';
import { notebookBundleFiles, notebookBundleZip } from '../src/utils/notebookBundle';
import { notebookMarkdown } from '../src/utils/notebookExport';
import { addNotebook, addPin, removePin, summarise, EMPTY_LIBRARY, parseLibrary } from '../src/utils/researchLibrary';
import { sha256Hex } from '../src/engine/ownSeries';
import { CHAT } from '../src/i18n/messages/chat';
import { TOOLS } from '../src/i18n/messages/tools';

const chart: ChartResult = {
  title: 'Brazil: inflation and the policy rate',
  freq: 'M',
  transform: 'level',
  lines: [
    { key: 'b', label: 'Policy rate', unit: '%', axis: 'left', source: 'BIS central bank policy rates', points: [{ date: '2026-08', value: 15 }, { date: '2026-09', value: 15 }] },
    { key: 'a', label: 'Inflation', unit: '%', axis: 'left', source: 'IBGE IPCA', points: [{ date: '2026-09', value: 5.2 }, { date: '2026-08', value: 5.1 }] },
  ],
  tests: [{ test: 'correlation', title: 'Do they move together?', reading: 'Correlation 0.4 over 2 months.', figures: [] }],
  missing: [],
  notes: [],
} as unknown as ChartResult;
const NOW = new Date('2026-11-17T15:00:00Z');

test('fingerprint: same figures give the same text whatever the order; a changed value changes it', async () => {
  const text = pinFingerprintText(chart);
  assert.equal(text, '# a|Inflation|%|IBGE IPCA\n2026-08,5.1\n2026-09,5.2\n# b|Policy rate|%|BIS central bank policy rates\n2026-08,15\n2026-09,15');
  const swapped = { ...chart, lines: [...chart.lines].reverse() };
  assert.equal(await sha256Hex(pinFingerprintText(swapped)), await sha256Hex(text));
  const revised = { ...chart, lines: [chart.lines[0], { ...chart.lines[1], points: [{ date: '2026-08', value: 5.1 }, { date: '2026-09', value: 5.3 }] }] };
  assert.notEqual(await sha256Hex(pinFingerprintText(revised)), await sha256Hex(text));
});

test('a pin: As of is the last date, long lines kept to the latest 600 points, only real charts accepted', () => {
  assert.equal(pinAsOf(chart, '2026-11-17'), '2026-09');
  assert.equal(pinAsOf({ lines: [] }, '2026-11-17'), '2026-11-17');
  const long = { ...chart, lines: [{ ...chart.lines[0], points: Array.from({ length: 700 }, (_, i) => ({ date: `x${String(i).padStart(4, '0')}`, value: i })) }] };
  assert.equal(trimChart(long).lines[0].points.length, 600);
  assert.equal(trimChart(long).lines[0].points[0].value, 100);
  const p = makePin(chart, 'f'.repeat(64), NOW, []);
  assert.equal(p.id, 'p-20261117150000000');
  assert.equal(makePin(chart, 'f'.repeat(64), NOW, [p.id]).id, `${p.id}x`);
  assert.ok(isChart(chart));
  assert.ok(!isChart({ title: 'x', lines: [{ key: 'a', label: 'a', points: [{ date: '2026', value: 'high' }] }], tests: [] }));
  assert.ok(!isChart({ title: '', lines: [], tests: [] }));
  assert.equal(parsePins([p, { id: 'bad', fingerprint: 'nothex' }]).length, 1);
});

test('library: add and remove pins, at most 20, kept through a reload, counted in the summary', () => {
  const made = addNotebook(EMPTY_LIBRARY, 'Brazil disinflation', NOW)!;
  let lib = made.lib;
  for (let i = 0; i < MAX_PINS; i++) lib = addPin(lib, made.id, { ...makePin(chart, 'a'.repeat(64), NOW, []), id: `p${i}` }, NOW)!;
  assert.equal(addPin(lib, made.id, makePin(chart, 'a'.repeat(64), NOW, []), NOW), null);
  const back = parseLibrary(JSON.parse(JSON.stringify(lib)));
  assert.equal(back.notebooks[0].pins!.length, MAX_PINS);
  assert.equal(summarise(back).notebooks[0].pins, MAX_PINS);
  const less = removePin(back, made.id, 'p0', NOW)!;
  assert.equal(less.notebooks[0].pins!.length, MAX_PINS - 1);
  assert.equal(removePin(less, made.id, 'p0', NOW), null);
  assert.equal(addPin(lib, 'nope', makePin(chart, 'a'.repeat(64), NOW, []), NOW), null);
});

test('the bundle: draft with the pinned figures, a replication pack per figure, citation, README, manifest of fingerprints', async () => {
  const made = addNotebook(EMPTY_LIBRARY, 'Brazil disinflation', NOW)!;
  const sha = await sha256Hex(pinFingerprintText(chart));
  const lib = addPin(made.lib, made.id, makePin(chart, sha, NOW, []), NOW)!;
  const nb = lib.notebooks[0];
  const md = notebookMarkdown(nb, [], [], NOW);
  assert.match(md, /## Pinned figures/);
  assert.match(md, new RegExp(`Fingerprint \\(SHA-256\\): \`${sha}\``));
  assert.match(pinsMarkdown(nb.pins!), /As of: 2026-09/);
  const files = await notebookBundleFiles(nb, md, sha256Hex, NOW);
  const folder = 'figures/01-brazil-inflation-and-the-policy-rate';
  for (const f of ['draft.md', 'CITATION.cff', 'README.md', 'MANIFEST.txt', `${folder}/data.csv`, `${folder}/replicate.py`, `${folder}/replicate.R`, `${folder}/replicate.do`, `${folder}/README.md`]) assert.ok(f in files, f);
  assert.match(files['CITATION.cff'], /If you use this notebook/);
  const manifest = files['MANIFEST.txt'];
  assert.ok(manifest.includes(`${await sha256Hex(files['draft.md'])}  draft.md`));
  const zip = unzipSync(notebookBundleZip(files, 'notebook-brazil'));
  assert.equal(strFromU8(zip['notebook-brazil/draft.md']), files['draft.md']);
  const empty = await notebookBundleFiles(made.lib.notebooks[0], 'x', sha256Hex, NOW);
  assert.match(empty['README.md'], /No figure is pinned yet/);
});

test('wiring: routes, pin button, notebook list and text keys', () => {
  const server = readFileSync('server.ts', 'utf8');
  for (const r of [/app\.post\('\/api\/research\/notebooks\/:id\/pins'/, /app\.delete\('\/api\/research\/notebooks\/:id\/pins\/:pinId'/, /app\.get\('\/api\/export\/notebook\/:id\.zip'/]) assert.match(server, r);
  assert.match(readFileSync('src/components/CouncilChart.tsx', 'utf8'), /<PinToNotebook result=\{result\} \/>/);
  assert.match(readFileSync('src/components/ResearchNotebooks.tsx', 'utf8'), /data-notebook-bundle="true"/);
  for (const k of ['ch_pin', 'ch_pinTitle', 'ch_pinPick', 'ch_pinSave', 'ch_pinNone', 'ch_pinned']) assert.ok(k in CHAT.en, k);
  for (const k of ['nb_pins', 'nb_noPins', 'nb_pinMeta', 'nb_unpin', 'nb_bundle', 'nb_bundleTitle']) assert.ok(k in TOOLS.en, k);
});
