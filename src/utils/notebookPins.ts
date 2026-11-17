/**
 * Working-paper bundle (R1): a Chart Agent chart pinned to a research notebook, with the day its
 * figures run to and a fingerprint (SHA-256) of the figures as they were when pinned, and the
 * notebook exported as one zip:
 *
 *   draft.md                  your notes, saved conversations and documents (notebookExport.ts),
 *                             then a list of the pinned figures with their As of day and fingerprint
 *   figures/NN-<title>/       for each pinned figure, its replication pack (replicationPack.ts):
 *                             data.csv, replicate.py / .R / .do, README.md, data-manifest.csv,
 *                             CITATION.cff
 *   CITATION.cff              how to cite the app and the notebook
 *   MANIFEST.txt              the SHA-256 of every file in the zip
 *
 * Nothing new is downloaded: a pin keeps the chart's own figures (at most MAX_PIN_POINTS points a
 * line, like a saved chart). Browser-safe; the zip is built by notebookBundle.ts.
 */
import type { ChartResult } from './councilChart';

/** Same as MAX_SAVED_POINTS in councilChart.ts (kept here so this file stays small). */
export const MAX_PIN_POINTS = 600;

export const MAX_PINS = 20;

export interface NotebookPin {
  id: string;
  title: string;
  pinnedAt: string;
  /** The last date in the pinned figures (YYYY, YYYY-MM or YYYY-MM-DD), or the pin day when the chart has no dates. */
  asOf: string;
  /** SHA-256 of pinFingerprintText(chart). */
  fingerprint: string;
  chart: ChartResult;
}

/** The chart kept small: each line's latest points, at most MAX_PIN_POINTS. */
export function trimChart(c: ChartResult): ChartResult {
  return { ...c, lines: c.lines.map((l) => (l.points.length > MAX_PIN_POINTS ? { ...l, points: l.points.slice(-MAX_PIN_POINTS) } : l)) };
}

/** The text the fingerprint is taken over: each line (by key) with its label, unit and source, then "date,value" lines; across countries, the pairs. */
export function pinFingerprintText(c: Pick<ChartResult, 'lines' | 'scatter'>): string {
  const out: string[] = [];
  for (const l of [...c.lines].sort((a, b) => a.key.localeCompare(b.key))) {
    out.push(`# ${l.key}|${l.label}|${l.unit}|${l.source}`);
    for (const p of [...l.points].sort((a, b) => a.date.localeCompare(b.date))) out.push(`${p.date},${p.value}`);
  }
  if (c.scatter) {
    out.push(`# scatter|${c.scatter.xLabel}|${c.scatter.yLabel}`);
    for (const p of [...c.scatter.pairs].sort((a, b) => a.date.localeCompare(b.date))) out.push(`${p.date},${p.x},${p.y}`);
  }
  return out.join('\n');
}

export function pinAsOf(c: Pick<ChartResult, 'lines' | 'last'>, today: string): string {
  const last = c.lines.flatMap((l) => l.points.map((p) => p.date)).sort().pop();
  return last || c.last || today;
}

/** Is this a chart the app drew (title, lines with points)? */
export function isChart(v: unknown): v is ChartResult {
  const c = v as Partial<ChartResult> | null;
  if (!c || typeof c.title !== 'string' || !c.title.trim() || !Array.isArray(c.lines) || !Array.isArray(c.tests)) return false;
  const pointsOk = c.lines.every((l) => l && typeof l.key === 'string' && typeof l.label === 'string' && Array.isArray(l.points) && l.points.every((p) => p && typeof p.date === 'string' && typeof p.value === 'number' && Number.isFinite(p.value)));
  return pointsOk && (c.lines.length > 0 || Boolean(c.scatter && Array.isArray(c.scatter.pairs)));
}

/** A pin, worked out from the chart; sha256 is passed in so this stays synchronous for tests. */
export function makePin(chart: ChartResult, fingerprint: string, now: Date, takenIds: string[]): NotebookPin {
  const at = now.toISOString();
  let id = `p-${at.replace(/[^0-9]/g, '')}`;
  while (takenIds.includes(id)) id += 'x';
  const c = trimChart(chart);
  return { id, title: c.title.slice(0, 160), pinnedAt: at, asOf: pinAsOf(c, at.slice(0, 10)), fingerprint, chart: c };
}

export function parsePins(v: unknown): NotebookPin[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((p): p is NotebookPin => !!p && typeof p.id === 'string' && typeof p.fingerprint === 'string' && /^[0-9a-f]{64}$/.test(p.fingerprint) && typeof p.pinnedAt === 'string' && typeof p.asOf === 'string' && isChart(p.chart))
    .slice(0, MAX_PINS)
    .map((p) => ({ id: p.id.slice(0, 80), title: String(p.title || p.chart.title).slice(0, 160), pinnedAt: p.pinnedAt.slice(0, 40), asOf: p.asOf.slice(0, 10), fingerprint: p.fingerprint, chart: trimChart(p.chart) }));
}

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 50).replace(/^-|-$/g, '') || 'chart';
export const pinFolder = (i: number, p: Pick<NotebookPin, 'title'>) => `figures/${String(i + 1).padStart(2, '0')}-${slug(p.title)}`;

/** The pinned figures as a Markdown section, for draft.md and the Markdown export. */
export function pinsMarkdown(pins: NotebookPin[]): string {
  if (!pins.length) return '';
  const lines = ['## Pinned figures', '', 'Each figure is kept as the app drew it, with the last date it runs to (As of) and a fingerprint (SHA-256) of its figures, so a reader can check nothing changed. In the zip bundle each has its own folder with the data and the scripts that redo its tests.', ''];
  pins.forEach((p, i) => {
    const sources = [...new Set(p.chart.lines.map((l) => l.source).concat(p.chart.sources ?? []))].filter(Boolean);
    lines.push(`### Figure ${i + 1}. ${p.title}`, '', `- As of: ${p.asOf}`, `- Pinned: ${p.pinnedAt.slice(0, 16).replace('T', ' ')} UTC`, `- Fingerprint (SHA-256): \`${p.fingerprint}\``, `- Folder in the bundle: \`${pinFolder(i, p)}/\``);
    if (sources.length) lines.push(`- Sources: ${sources.join('; ')}`);
    for (const t of p.chart.tests) lines.push(`- ${t.title}: ${t.reading}`);
    lines.push('');
  });
  return lines.join('\n');
}

