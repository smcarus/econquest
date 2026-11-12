import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cbwDateFromName, cbwPlain, cbwSentence, cbWordCount, CBW_DOVE, CBW_HAWK, CBW_NOUNS } from '../src/utils/cbWords.ts';
import { readCbStatements } from '../src/server/feeds/cbStatements.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';

test('the dictionary is the published one (Apel and Blix Grimaldi 2012, pp. 9-10)', () => {
  assert.deepEqual([...CBW_NOUNS].sort(), ['cyclical position', 'development', 'growth', 'inflation', 'oil price', 'price', 'wage']);
  assert.deepEqual([...CBW_HAWK].sort(), ['fast', 'faster', 'high', 'higher', 'increased', 'increasing', 'strong', 'stronger']);
  assert.deepEqual([...CBW_DOVE].sort(), ['decreased', 'decreasing', 'low', 'lower', 'slow', 'slower', 'weak', 'weaker']);
});

test('two-word phrases only, any noun ending, case ignored; oil price not also counted as price', () => {
  const c = cbWordCount('Higher inflation expectations and STRONG wage growth, but weaker growth and lower oil prices. Inflation is higher. Prices are rising faster.');
  assert.equal(c.hawk, 2);
  assert.equal(c.dove, 2);
  assert.equal(c.net, 1);
  assert.deepEqual(c.phrases.map((p) => `${p.phrase}:${p.side}:${p.n}`), ['higher inflation:hawk:1', 'lower oil price:dove:1', 'strong wage:hawk:1', 'weaker growth:dove:1']);
  assert.deepEqual(c.byNoun['oil price'], { hawk: 0, dove: 1 });
  assert.deepEqual(c.byNoun.price, { hawk: 0, dove: 0 });
  // Words inside other words do not count ("below", "highly").
  assert.equal(cbWordCount('below growth, highly inflationary').hawk + cbWordCount('below growth, highly inflationary').dove, 0);
  // The same text always gives the same count.
  assert.deepEqual(cbWordCount('Slower growth and decreasing inflation.'), cbWordCount('Slower growth and decreasing inflation.'));
  assert.equal(cbWordCount('Slower growth and decreasing inflation.').net, 0);
  assert.equal(cbWordCount('No phrase here.').net, null);
});

test('saved web pages: tags, scripts and entities out; dates from file names', () => {
  assert.equal(cbwPlain('<style>x{}</style><p>Higher&nbsp;<b>inflation</b></p>'), 'Higher inflation');
  assert.equal(cbWordCount('<p>Higher&nbsp;<b>inflation</b></p>').hawk, 1);
  assert.equal(cbwDateFromName('2026-10-29.txt'), '2026-10-29');
  assert.equal(cbwDateFromName('fomc-20260917-statement.html'), '2026-09-17');
  assert.equal(cbwDateFromName('2026-07 minutes.md'), '2026-07');
  assert.equal(cbwDateFromName('statement.txt'), null);
});

test('statements you save in data/local/cb-statements/<ISO3>/ are read in date order; others named', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbw-'));
  const at = path.join(dir, 'local', 'cb-statements', 'TST');
  fs.mkdirSync(at, { recursive: true });
  fs.writeFileSync(path.join(at, '2026-10-29.txt'), 'Weaker growth and lower inflation.');
  fs.writeFileSync(path.join(at, '2026-09-17.html'), '<p>Higher inflation and stronger growth. Weaker growth.</p>');
  fs.writeFileSync(path.join(at, 'notes.txt'), 'no date');
  fs.writeFileSync(path.join(at, 'image.png'), 'x');
  const r = readCbStatements('TST', dir);
  assert.equal(r.dir, 'data/local/cb-statements/TST/');
  assert.deepEqual(r.statements.map((s) => [s.date, s.hawk, s.dove, s.net]), [['2026-09-17', 2, 1, 1.333], ['2026-10-29', 0, 2, 0]]);
  assert.deepEqual(r.skipped.map((s) => s.file), ['notes.txt']);
  assert.equal(cbwSentence(r.statements, 'Testland'), 'Testland: the statement of 2026-10-29 has net index 0.00 (0 hawkish, 2 dovish phrases), against 1.33 on 2026-09-17. Dictionary: Apel and Blix Grimaldi (2012).');
  assert.deepEqual(readCbStatements('NONE', dir).statements, []);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('wired: register, tool, panel, route; no downloads', () => {
  assert.equal(registerEntry('cb_word_count')!.status, 'descriptive');
  assert.equal(READY_BY_ID.cb_word_count.target.anchor, 'tool-cb-words');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-cb-words"/);
  assert.match(page, /CbWordsPanel/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/cb-words\/:iso3/);
  assert.doesNotMatch(fs.readFileSync('src/server/feeds/cbStatements.ts', 'utf8'), /fetch\(/);
});
