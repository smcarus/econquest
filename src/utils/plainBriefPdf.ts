/**
 * PDF of the one-page policy brief (G39). Always one A4 page: the text is set at 10 pt and made
 * smaller, down to 7.5 pt, until it fits; if it still does not fit, the last lines are cut and the
 * page says so. Browser and Node (jspdf is loaded when asked for).
 */
import { pdfSafe } from './briefExport';
import { BRIEF_TEXT, briefFooter, briefLines, type BriefLine, type PlainBrief } from './plainBrief';

const SIZES = [10, 9.5, 9, 8.5, 8, 7.5];
const STYLE: Record<BriefLine['kind'], { scale: number; style: 'normal' | 'bold' | 'italic'; gap: number; indent: number }> = {
  title: { scale: 1.5, style: 'bold', gap: 1, indent: 0 },
  sub: { scale: 0.9, style: 'italic', gap: 2, indent: 0 },
  banner: { scale: 0.85, style: 'italic', gap: 2.5, indent: 0 },
  heading: { scale: 1.15, style: 'bold', gap: 1, indent: 0 },
  body: { scale: 1, style: 'normal', gap: 1, indent: 0 },
  bullet: { scale: 1, style: 'normal', gap: 0.6, indent: 3 },
  small: { scale: 0.75, style: 'italic', gap: 1, indent: 0 },
};

export interface BriefPdf {
  bytes: ArrayBuffer;
  /** Body size used, pt. */
  size: number;
  /** True when lines had to be cut to keep one page. */
  cut: boolean;
  pages: number;
}

export async function plainBriefPdf(b: PlainBrief, savedAt: string, hash: string): Promise<BriefPdf> {
  const { jsPDF } = await import('jspdf');
  const all = briefLines(b);
  // The notice lines at the end always print in full; only the body above them is ever cut.
  const tail = all.filter((l) => l.kind === 'small');
  const body = all.filter((l) => l.kind !== 'small');
  const margin = 16;
  const width = 210 - margin * 2;
  const bottom = 297 - 14;
  type Doc = InstanceType<typeof jsPDF>;
  const layout = (lines: BriefLine[], size: number, doc: Doc, draw: boolean, y0: number, stopAt: number) => {
    let y = y0;
    for (const l of lines) {
      const s = STYLE[l.kind];
      const pt = size * s.scale;
      doc.setFont('helvetica', s.style);
      doc.setFontSize(pt);
      const lh = pt * 0.42;
      if (l.kind === 'heading') y += 1.5;
      const wrapped: string[] = doc.splitTextToSize(pdfSafe(l.kind === 'bullet' ? `- ${l.text}` : l.text), width - s.indent);
      for (const w of wrapped) {
        if (y + lh > stopAt) return { fits: false, y };
        if (draw) doc.text(w, margin + s.indent, y);
        y += lh;
      }
      y += s.gap;
    }
    return { fits: true, y };
  };
  const probe = new jsPDF({ unit: 'mm', format: 'a4' });
  const tailHeight = (size: number) => layout(tail, size, probe, false, 0, Infinity).y;
  let size = SIZES[SIZES.length - 1];
  let cut = true;
  for (const s of SIZES) {
    if (layout(body, s, probe, false, margin + 2, bottom - tailHeight(s)).fits) {
      size = s;
      cut = false;
      break;
    }
  }
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cutNote = cut ? 5 : 0;
  const lowest = bottom - tailHeight(size);
  const end = layout(body, size, doc, true, margin + 2, lowest - cutNote).y;
  // The notice follows the text; it sits at the foot of the page only when the text runs that far.
  const tailTop = cut ? lowest : Math.min(end + 2, lowest);
  if (cut) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(pdfSafe(BRIEF_TEXT[b.lang].cut), margin, tailTop - 2);
  }
  layout(tail, size, doc, true, tailTop + 3, Infinity);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(pdfSafe(briefFooter(b.lang, savedAt, hash)), margin, 297 - 7);
  return { bytes: doc.output('arraybuffer'), size, cut, pages: doc.getNumberOfPages() };
}
