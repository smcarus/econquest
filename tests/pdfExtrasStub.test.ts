import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import unavailable, { Canvg, sanitize } from '../src/vendor/pdfExtrasStub.ts';

test("jsPDF's unused HTML and SVG helpers are replaced in the build and fail with a plain message", () => {
  const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
  for (const name of ['html2canvas', 'dompurify', 'canvg']) assert.match(config, new RegExp(`${name}: path\\.resolve\\(import\\.meta\\.dirname, 'src/vendor/pdfExtrasStub\\.ts'\\)`));
  assert.throws(() => unavailable(), /PDFs from text only/);
  assert.throws(() => Canvg.fromString(), /PDFs from text only/);
  assert.throws(() => sanitize(), /PDFs from text only/);
});

test('the PDF writers use text only, never doc.html() or SVG images', () => {
  for (const f of ['../src/utils/memoPdf.ts', '../src/utils/briefExport.ts']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\.html\(|addSvgAsImage/, f);
  }
});
