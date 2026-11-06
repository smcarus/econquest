import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creditLine, publicationCheck, publicationSvg, wrap } from '../src/utils/publicationExport.ts';
import { licenceRow } from '../src/utils/licenceLookup.ts';

test('credit lines come from the register, placeholders filled from the source, examples dropped', () => {
  assert.equal(creditLine(licenceRow('worldbank')!, 'World Bank WDI'), 'The World Bank: World Bank WDI.');
  assert.equal(creditLine(licenceRow('bis')!, 'BIS central bank policy rates'), 'Source: BIS (Bank for International Settlements), BIS central bank policy rates.');
  assert.equal(creditLine(licenceRow('kalshi')!, 'Kalshi'), `Source: ${licenceRow('kalshi')!.name}.`);
  assert.doesNotMatch(creditLine(licenceRow('imf')!, 'IMF World Economic Outlook'), /</);
});

test('restricted sources block; unclear and unmapped are named; open sources pass', () => {
  const open = publicationCheck(['World Bank WDI']);
  assert.equal(open.blocked.length, 0);
  assert.equal(open.credits.length, 1);
  const kalshi = publicationCheck(['Kalshi market']);
  assert.deepEqual(kalshi.blocked.map((b) => b.id), ['kalshi']);
  const oecd = publicationCheck(['OECD via DBnomics']);
  assert.equal(oecd.blocked.length, 0);
  assert.deepEqual(oecd.unclear.map((u) => u.id), ['oecd']);
  assert.deepEqual(publicationCheck(['my spreadsheet']).unmapped, ['my spreadsheet']);
  // The same register row twice gives one credit.
  assert.equal(publicationCheck(['World Bank WDI', 'World Bank WGI']).credits.length, 1);
});

test('the SVG carries title, source, period, as-of date and credit, escaped, around the chart', () => {
  const svg = publicationSvg('<svg width="400" height="200"><path stroke="currentColor"/></svg>', 400, 200, {
    title: 'Debt, Turkey & friends',
    source: 'IMF WEO',
    period: '2000 to 2025',
    asOf: '2026-11-06',
    credit: 'Source: International Monetary Fund, IMF WEO.',
  });
  assert.match(svg, /^<svg xmlns/);
  assert.match(svg, /Debt, Turkey &amp; friends/);
  assert.match(svg, /Source: IMF WEO/);
  assert.match(svg, /Period: 2000 to 2025\. As of 2026-11-06\./);
  assert.match(svg, /International Monetary Fund/);
  assert.match(svg, /<svg x="0" y="\d+" width="400"/);
  assert.doesNotMatch(svg, /currentColor/);
  assert.deepEqual(wrap('a bb ccc dddd', 6), ['a bb', 'ccc', 'dddd']);
});

test('a BIS policy rate for Turkey, "(CBRT)" in its source, is not read as the EVDS feed', () => {
  assert.deepEqual(publicationCheck(['BIS central bank policy rates (CBRT)']).credits.length, 1);
});
