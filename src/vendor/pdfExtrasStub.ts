/**
 * Stand-in for jsPDF's optional helpers (html2canvas, DOMPurify, canvg). jsPDF loads them only for
 * doc.html() and SVG images; the app writes its PDFs from text (src/utils/memoPdf.ts,
 * src/utils/briefExport.ts) and never calls either, so the real libraries (about 380 KB) are left
 * out of the build (vite.config.ts aliases). A call that reaches here fails with a plain message.
 */
const unavailable = (): never => {
  throw new Error('Not included in this build: the app writes PDFs from text only (no HTML or SVG pages).');
};
export default unavailable;
export const Canvg = { from: unavailable, fromString: unavailable };
export const sanitize = unavailable;
