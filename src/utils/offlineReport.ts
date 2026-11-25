/**
 * Offline country report (group D, PD1; platform comparison gap CG14): one HTML file of a country's
 * saved figures that opens in any browser without the app, for journalists, students and slow
 * connections. Every figure keeps its value, unit, period, source and licence; a figure no feed has
 * filled shows Missing with the reason. No scripts, no outside files; prints on A4 or Letter.
 *
 * Browser-safe, pure.
 */
import type { Cell } from './csvExport';

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function num(v: Cell): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return String(v ?? '');
  const a = Math.abs(v);
  return a >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : a >= 100 ? v.toFixed(1) : v.toFixed(2);
}

export interface OfflineReportInput {
  iso3: string;
  countryName: string;
  /** Rows in FIGURES_HEADER order (utils/csvExport.ts). */
  rows: Cell[][];
  pulledAt?: string;
  madeAt: string;
  appUrl: string;
}

export function offlineReportHtml(r: OfflineReportInput): string {
  const live = r.rows.filter((x) => x[6] === 'Live');
  const missing = r.rows.filter((x) => x[6] !== 'Live');
  const licences = [...new Set(live.map((x) => String(x[11] || '')).filter(Boolean))].sort();
  const liveRows = live
    .map((x) => `<tr><td>${esc(x[3])}</td><td class="n">${esc(num(x[4]))}</td><td>${esc(x[5])}</td><td>${esc(x[7])}</td><td>${esc(x[8])}</td></tr>`)
    .join('\n');
  const missRows = missing.map((x) => `<tr><td>${esc(x[3])}</td><td>Missing</td><td colspan="3">${esc(x[9])}</td></tr>`).join('\n');
  const pulled = r.pulledAt ? r.pulledAt.slice(0, 16).replace('T', ' ') + ' UTC' : 'not recorded';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.countryName)}: figures as saved</title>
<style>
:root { --fg: #0f172a; --muted: #475569; --line: #cbd5e1; --bg: #ffffff; --head: #f1f5f9; }
@media (prefers-color-scheme: dark) { :root { --fg: #e2e8f0; --muted: #94a3b8; --line: #334155; --bg: #0f172a; --head: #1e293b; } }
body { font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--fg); background: var(--bg); margin: 0 auto; max-width: 960px; padding: 16px; }
h1 { font-size: 1.4rem; margin: 0 0 4px; } h2 { font-size: 1.05rem; margin: 24px 0 6px; }
p { margin: 4px 0; } .muted { color: var(--muted); font-size: 12px; }
.wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 13px; }
th, td { border-bottom: 1px solid var(--line); padding: 4px 6px; text-align: left; vertical-align: top; }
th { background: var(--head); } td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
@media print { body { max-width: none; padding: 0; font-size: 11px; } .wrap { overflow: visible; } tr { break-inside: avoid; } }
</style>
</head>
<body>
<h1>${esc(r.countryName)} (${esc(r.iso3)}): figures as saved</h1>
<p class="muted">Figures pulled ${esc(pulled)}; this file made ${esc(r.madeAt.slice(0, 10))} by EconQuest Terminal (${esc(r.appUrl)}). It opens without the app and holds no scripts.</p>
<p>${live.length} figures with a value and source, ${missing.length} Missing. A Missing figure is one no source filled; the reason is given. Nothing here is a built-in or estimated number.</p>
<h2>Figures</h2>
<div class="wrap"><table>
<thead><tr><th>Figure</th><th>Value</th><th>Unit</th><th>Period</th><th>Source</th></tr></thead>
<tbody>
${liveRows || '<tr><td colspan="5">No figure is saved for this country yet.</td></tr>'}
</tbody></table></div>
${missing.length ? `<h2>Missing</h2>\n<div class="wrap"><table>\n<thead><tr><th>Figure</th><th>Status</th><th colspan="3">Why</th></tr></thead>\n<tbody>\n${missRows}\n</tbody></table></div>` : ''}
<h2>Licences</h2>
<p class="muted">${licences.length ? licences.map(esc).join('; ') : 'None recorded.'} Check each source's terms before you republish a figure.</p>
<p class="muted">Not advice. Figures are as the sources published them on the day they were pulled; later revisions are not shown.</p>
</body>
</html>
`;
}
