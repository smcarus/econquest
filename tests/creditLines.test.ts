import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creditsFor, framedSvg, shareModeBlock, wrapText } from '../src/utils/creditLines.ts';

test('credits follow each source register row, once each', () => {
  const c = creditsFor(['CFTC, week to 2026-10-28', 'CFTC, week to 2026-10-21', 'GDELT tone']);
  assert.equal(c.credits.length, 2);
  assert.match(c.credits[0], /CFTC/);
  assert.match(c.credits[1], /GDELT/);
  assert.deepEqual(c.notShareable, []);
});

test('a register attribution with a pattern to fill, or none, becomes "Source: <name>"', () => {
  assert.equal(creditsFor(['IMF WEO, 2025']).credits[0], 'Source: IMF (World Economic Outlook, Fiscal Monitor, International Liquidity, Balance of Payments, COFER).');
  assert.match(creditsFor(['Kalshi odds']).credits[0], /^Source: Kalshi/);
});

test('the app\'s own calculations carry no credit and are not held back', () => {
  assert.deepEqual(creditsFor(['HP filter on the series above']), { credits: [], notShareable: [] });
});

test('sharing mode blocks an export only when a source cannot be passed on', () => {
  assert.equal(shareModeBlock(['FRED'], false), null);
  assert.equal(shareModeBlock(['World Bank, 2024', 'IMF WEO', 'BIS'], true), null);
  assert.match(shareModeBlock(['World Bank, 2024', 'FRED'], true) ?? '', /^Sharing mode is on and this uses FRED/);
});

test('wrapText keeps lines within the width', () => {
  assert.deepEqual(wrapText('one two three four five six seven', 10), ['one two', 'three four', 'five six', 'seven']);
});

test('the framed SVG carries the title, the chart and every footer line, escaped', () => {
  const svg = framedSvg('<svg width="600" height="300"><g/></svg>', 600, 300, 'Brazil & Mexico', ['Sources: CFTC <weekly>', 'Credit: Source: CFTC.']);
  assert.match(svg, /^<svg xmlns/);
  assert.match(svg, /Brazil &amp; Mexico/);
  assert.match(svg, /<svg x="0" y="40" width="600"/);
  assert.match(svg, /CFTC &lt;weekly&gt;/);
  assert.match(svg, /Credit: Source: CFTC\./);
});
