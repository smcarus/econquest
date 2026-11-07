/**
 * Publication export (seven-groups plan, Phase 5, journalists and teachers): a chart as an SVG or
 * PNG image with its title, source, period, as-of date and a credit line from the licence register
 * (src/data/dataLicences.ts), so a published chart carries what the source asks for.
 *
 * A source whose terms do not allow free sharing (the register's share field is "restricted", or
 * the source needs permission and sharing is not settled) blocks the export until the user ticks
 * that they hold permission. Sources the register does not name are flagged, not guessed.
 *
 * Browser-safe, pure (the button in components/PublishChartButton.tsx does the drawing).
 */
import { LICENCE_SHARE_LABEL, LICENCE_STATUS_LABEL, type LicenceRow } from '../data/dataLicences';
import { licenceRowsForSource } from './licenceLookup';

export interface PublicationCheck {
  /** Credit lines, one per register row, placeholders filled from the figure's source text. */
  credits: string[];
  /** Rows that block the export until the user says they hold permission, with why. */
  blocked: Array<{ id: string; name: string; why: string }>;
  /** Rows whose sharing terms are unclear (export allowed, with a note). */
  unclear: Array<{ id: string; name: string; why: string }>;
  /** Source texts that name no register row. */
  unmapped: string[];
}

/** The register's attribution with "<...>" placeholders filled from the source text and examples dropped. */
export function creditLine(row: LicenceRow, source: string): string {
  let a = row.attribution.replace(/,?\s*e\.g\.\s.*$/i, '').trim();
  if (/^none stated\.?$/i.test(a)) return `Source: ${row.name}.`;
  let first = true;
  a = a.replace(/[,:;]?\s*<[^>]+>/g, (m) => {
    if (!first) return '';
    first = false;
    return `${/^[,:;]/.test(m) ? `${m[0]} ` : ' '}${source.trim()}`;
  });
  a = a.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim();
  return /[.)"]$/.test(a) ? a : `${a}.`;
}

export function publicationCheck(sources: string[]): PublicationCheck {
  const credits: string[] = [];
  const blocked: PublicationCheck['blocked'] = [];
  const unclear: PublicationCheck['unclear'] = [];
  const unmapped: string[] = [];
  const seen = new Set<string>();
  for (const src of sources.map((s) => s.trim()).filter(Boolean)) {
    const rows = licenceRowsForSource(src);
    if (!rows.length) {
      if (!unmapped.includes(src)) unmapped.push(src);
      continue;
    }
    for (const r of rows) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      credits.push(creditLine(r, src));
      if (r.share === 'restricted' || (r.status === 'permission' && r.share !== 'allowed'))
        blocked.push({ id: r.id, name: r.name, why: `${LICENCE_STATUS_LABEL[r.status]}; ${LICENCE_SHARE_LABEL[r.share].toLowerCase()}. ${r.shareNote}`.trim() });
      else if (r.share === 'unclear' || r.status === 'not_verified')
        unclear.push({ id: r.id, name: r.name, why: `${LICENCE_STATUS_LABEL[r.status]}; ${LICENCE_SHARE_LABEL[r.share].toLowerCase()}. ${r.shareNote}`.trim() });
    }
  }
  return { credits, blocked, unclear, unmapped };
}

export interface PublicationMeta {
  title: string;
  subtitle?: string;
  /** "Source: ..." as shown under the chart. */
  source: string;
  period: string;
  asOf: string;
  credit: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Split text into lines of at most `max` characters, at spaces. */
export function wrap(text: string, max: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + w).length > max) {
      out.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) out.push(line);
  return out;
}

/**
 * One standalone SVG: title and subtitle above the chart, source, period, as-of date and credit
 * below, on a white background. `chartSvg` is the chart's own <svg> element as text.
 */
export function publicationSvg(chartSvg: string, width: number, height: number, meta: PublicationMeta): string {
  const pad = 16;
  const per = Math.max(40, Math.floor((width - 2 * pad) / 6.6));
  const head = [{ t: meta.title, size: 16, weight: 600 }, ...(meta.subtitle ? [{ t: meta.subtitle, size: 12, weight: 400 }] : [])].flatMap((h) =>
    wrap(h.t, Math.floor(per * (12 / h.size))).map((t) => ({ ...h, t }))
  );
  const foot = [`Source: ${meta.source.replace(/^source:\s*/i, '')}`, `Period: ${meta.period}. As of ${meta.asOf}.`, meta.credit ? `Credit: ${meta.credit.replace(/^source:\s*/i, '')}` : ''].filter(Boolean).flatMap((t) => wrap(t, per));
  let y = pad;
  const lines: string[] = [];
  for (const h of head) {
    y += h.size + 4;
    lines.push(`<text x="${pad}" y="${y}" font-size="${h.size}" font-weight="${h.weight}" fill="#0f172a">${esc(h.t)}</text>`);
  }
  const chartY = y + 8;
  // The chart's own svg, nested at its size; currentColor resolves to a dark grey on white.
  const inner = chartSvg.replace(/currentColor/g, '#475569').replace(/^<svg\b/, `<svg x="0" y="${chartY}"`);
  y = chartY + height + 6;
  for (const t of foot) {
    y += 14;
    lines.push(`<text x="${pad}" y="${y}" font-size="11" fill="#475569">${esc(t)}</text>`);
  }
  const total = y + pad;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${total}" viewBox="0 0 ${width} ${total}" font-family="Inter, Helvetica, Arial, sans-serif">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    ...lines,
    inner,
    `</svg>`,
  ].join('\n');
}

export const PUBLICATION_METHOD =
  'The chart is redrawn on white with its title, the figure\'s source, the period shown, the date of the export and a credit line built from the attribution each source asks for in the licence register. A source whose terms restrict free sharing, or need permission where sharing is not settled, blocks the export until you tick that you hold permission; sources with unclear terms or not in the register are named. You are responsible for the terms of what you publish.';
