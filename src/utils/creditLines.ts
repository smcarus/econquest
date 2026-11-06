/**
 * Credit lines for anything that leaves the app as a picture or a file: the attribution each source
 * asks for in its own terms (src/data/dataLicences.ts), and the sources whose terms do not let the
 * figures be passed on for free (the register's `share` field). Sharing mode (src/utils/shareMode.ts)
 * uses the second list to refuse an export rather than send figures the user may not pass on.
 *
 * Browser-safe.
 */
import { licenceRowsForSource } from './licenceLookup';

export interface ExportCredits {
  /** One line per register source, as its terms ask to be credited; no duplicates. */
  credits: string[];
  /** Sources marked "Do not pass on" or "Sharing unclear" in the register. */
  notShareable: string[];
}

/** The register's attribution, or "Source: <name>" where the register gives only a pattern to fill in or none. */
function creditText(attribution: string, name: string): string {
  return /<[^>]+>/.test(attribution) || /^none stated/i.test(attribution.trim()) ? `Source: ${name}.` : attribution;
}

export function creditsFor(sources: Array<string | undefined>): ExportCredits {
  const credits: string[] = [];
  const notShareable: string[] = [];
  const add = (list: string[], s: string) => {
    if (!list.includes(s)) list.push(s);
  };
  for (const raw of sources) {
    const source = (raw || '').trim();
    if (!source) continue;
    // A source the register does not name is the app's own calculation: no credit, nothing held back.
    for (const row of licenceRowsForSource(source)) {
      add(credits, creditText(row.attribution, row.name));
      if (row.share !== 'allowed') add(notShareable, row.name);
    }
  }
  return { credits, notShareable };
}

/** Why sharing mode refuses this export, or null when it may go out. */
export function shareModeBlock(sources: Array<string | undefined>, shareMode: boolean): string | null {
  if (!shareMode) return null;
  const { notShareable } = creditsFor(sources);
  return notShareable.length ? `Sharing mode is on and this uses ${notShareable.join('; ')}, whose terms do not let the figures be passed on, or do not say (Menu > About & data licences).` : null;
}

/** Breaks text into lines of at most `width` characters, at spaces. */
export function wrapText(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > width) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A stand-alone SVG file: the title on top, the chart's own SVG in the middle, and under it every
 * line of the footer (sources, credits, date, notice), so the picture carries its sources wherever
 * it is pasted.
 */
export function framedSvg(chartSvg: string, width: number, height: number, title: string, footer: string[]): string {
  const pad = 16;
  const lineH = 15;
  const wrapAt = Math.max(40, Math.floor((width - 2 * pad) / 6.2));
  const foot = footer.flatMap((f) => wrapText(f, wrapAt));
  const top = 40;
  const total = top + height + 12 + foot.length * lineH + pad;
  const inner = chartSvg.replace(/^<svg\b/, `<svg x="0" y="${top}"`);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${total}" viewBox="0 0 ${width} ${total}" font-family="Helvetica, Arial, sans-serif" color="#0f172a">`,
    `<rect width="100%" height="100%" fill="#ffffff"/>`,
    `<text x="${pad}" y="26" font-size="15" font-weight="600" fill="#0f172a">${esc(title)}</text>`,
    inner,
    ...foot.map((l, i) => `<text x="${pad}" y="${top + height + 12 + (i + 1) * lineH - 3}" font-size="11" fill="#475569">${esc(l)}</text>`),
    `</svg>`,
  ].join('\n');
}
