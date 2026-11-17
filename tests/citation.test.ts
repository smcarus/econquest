import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_CITATION, citation, citedSources, longDate, packCitationCff } from '../src/utils/citation.ts';

test('the app cites itself with the version in package.json and CITATION.cff', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const cff = readFileSync(new URL('../CITATION.cff', import.meta.url), 'utf8');
  assert.equal(APP_CITATION.version, pkg.version);
  assert.match(cff, new RegExp(`^version: ${APP_CITATION.version.replace(/\./g, '\\.')}$`, 'm'));
  assert.match(cff, new RegExp(`^title: "${APP_CITATION.title}"$`, 'm'));
});

test('a chart cites the app and each register source once, with the date read', () => {
  const c = citation({ kind: 'chart', title: 'Policy rate vs inflation, Turkey', sources: ['BIS policy rates', 'IMF WEO, 2025', 'BIS, month-end figures', undefined, ''], accessed: '2026-11-11', asOf: '2026-11-10' });
  assert.deepEqual(c.sources.map((s) => s.id).sort(), ['bis', 'imf']);
  assert.equal(c.ownCalculation, false);
  assert.match(c.text, /^EconQuest Terminal contributors \(2026\)\. "Policy rate vs inflation, Turkey" \[chart\]\. EconQuest Terminal, version 0\.1\.0\. Accessed 11 November 2026\./);
  assert.match(c.text, /Figures as read from their sources on 10 November 2026/);
  assert.match(c.text, /Source: International Monetary Fund, IMF WEO, 2025/);
  assert.match(c.text, /Retrieved through EconQuest Terminal on 10 November 2026/);
  assert.equal((c.bibtex.match(/^@misc\{/gm) || []).length, 3);
  assert.match(c.bibtex, /@misc\{econquest_policy_rate_vs_inflation_turkey_20261111,/);
  assert.match(c.bibtex, /urldate = \{2026-11-11\}/);
  assert.equal((c.ris.match(/^ER {2}- $/gm) || []).length, 3);
  assert.match(c.ris, /^TY {2}- DATA$/m);
  assert.match(c.ris, /^Y2 {2}- 2026\/11\/11$/m);
});

test("a source the register does not name is the app's own calculation, with no entry of its own", () => {
  const c = citation({ kind: 'answer', title: 'Is Brazil debt sustainable?', sources: ['model: reserves over imports'], accessed: '2026-11-11' });
  assert.equal(c.sources.length, 0);
  assert.equal(c.ownCalculation, true);
  assert.match(c.text, /worked out by the app/);
  assert.doesNotMatch(c.text, /Data sources:/);
  assert.match(c.ris, /^TY {2}- GEN$/m);
  assert.equal(citedSources(['World Bank WDI', 'model: x']).ownCalculation, true);
});

test('BibTeX keeps special characters as written', () => {
  const c = citation({ kind: 'table', title: 'Debt & deficits {50%}', sources: [], accessed: '2026-11-11' });
  assert.match(c.bibtex, /title = \{\{Debt \\& deficits \\\{50\\%\\\}\}\}/);
});

test('dates read in words, and the pack citation file names the app', () => {
  assert.equal(longDate('2026-01-05'), '5 January 2026');
  assert.equal(longDate('soon'), 'soon');
  const cff = packCitationCff('Turkey "rates"', '2026-11-11');
  assert.match(cff, /^cff-version: 1\.2\.0$/m);
  assert.match(cff, /^type: dataset$/m);
  assert.match(cff, /title: "Turkey \\"rates\\" \(replication pack from EconQuest Terminal\)"/);
  assert.match(cff, /date-released: "2026-11-11"/);
});

test('a citation names the code commit when the build recorded one, and the version alone when not', async () => {
  const { versionWithCommit, appCommit } = await import('../src/utils/buildInfo.ts');
  assert.equal(versionWithCommit('0.1.0', ''), '0.1.0');
  assert.equal(versionWithCommit('0.1.0', '1a2b3c4d5e6f'), '0.1.0 (commit 1a2b3c4d5e6f)');
  const withCommit = citation({ kind: 'chart', title: 'Policy rate, Brazil', sources: [], accessed: '2026-11-14', commit: '1a2b3c4d5e6f' });
  assert.match(withCommit.text, /version 0\.1\.0 \(commit 1a2b3c4d5e6f\)\./);
  assert.match(withCommit.bibtex, /howpublished = \{Chart in EconQuest Terminal, version 0\.1\.0 \(commit 1a2b3c4d5e6f\)\}/);
  assert.match(withCommit.ris, /N1  - .*Code commit 1a2b3c4d5e6f\./);
  const without = citation({ kind: 'chart', title: 'Policy rate, Brazil', sources: [], accessed: '2026-11-14', commit: '' });
  assert.match(without.text, /version 0\.1\.0\. Accessed/);
  assert.match(packCitationCff('Pack', '2026-11-14', 'abcdef123456'), /^ {4}commit: "abcdef123456"$/m);
  assert.doesNotMatch(packCitationCff('Pack', '2026-11-14', ''), /commit:/);
  const saved = process.env.APP_COMMIT;
  process.env.APP_COMMIT = 'ABCDEF1234567890';
  assert.equal(appCommit(), 'abcdef123456');
  process.env.APP_COMMIT = 'not a commit';
  assert.equal(appCommit(), '');
  if (saved === undefined) delete process.env.APP_COMMIT;
  else process.env.APP_COMMIT = saved;
});
