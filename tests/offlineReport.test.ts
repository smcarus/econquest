import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offlineReportHtml } from '../src/utils/offlineReport.ts';

test('offline report: one self-contained page, figures with sources, Missing with reasons, text escaped, no scripts', () => {
  const rows = [
    ['TST', 'Testland', 'imf.debtToGdpPct', 'Government debt', 61.234, '% of GDP', 'Live', '2025', 'IMF WEO <Oct 2026>', '', '2026-11-23T10:00:00Z', 'IMF terms'],
    ['TST', 'Testland', 'wb.giniIndex', 'Income inequality (Gini)', null, '0 to 100', 'Missing', '', '', 'World Bank has no survey', '2026-11-23T10:00:00Z', ''],
  ];
  const html = offlineReportHtml({ iso3: 'TST', countryName: 'Testland', rows, pulledAt: '2026-11-23T10:00:00Z', madeAt: '2026-11-23T12:00:00Z', appUrl: 'https://github.com/e-conquest/econquest' });
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /61\.23/);
  assert.match(html, /IMF WEO &lt;Oct 2026&gt;/);
  assert.match(html, /World Bank has no survey/);
  assert.match(html, /1 figures with a value and source, 1 Missing/);
  assert.doesNotMatch(html, /<script|<link|src="/);
});
