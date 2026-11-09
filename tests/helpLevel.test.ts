import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, figureHelp } from '../src/data/glossary.ts';
import { CHART_GUIDES } from '../src/data/chartGuides.ts';
import { DEFAULT_HELP_LEVEL, nextHelpLevel, parseHelpLevel, showFigureHelp, showGuides, showMissingHelp, showRanges, HELP_LEVELS } from '../src/utils/helpLevel.ts';
import { joinMeaning, MEANS, splitMeaning } from '../src/utils/countryNotes.ts';

test('three levels, key help by default, the header button cycles key, full, off', () => {
  assert.equal(DEFAULT_HELP_LEVEL, 1);
  assert.equal(parseHelpLevel('2'), 2);
  assert.equal(parseHelpLevel('0'), 0);
  assert.equal(parseHelpLevel('x'), 1);
  assert.deepEqual([nextHelpLevel(1), nextHelpLevel(2), nextHelpLevel(0)], [2, 0, 1]);
});

test('figure help: none when off, the main figures at key help (about half), all at full help', () => {
  const withMatch = GLOSSARY.filter((e) => e.match?.length);
  const key = withMatch.filter((e) => showFigureHelp(e, 1));
  assert.ok(key.length >= withMatch.length * 0.3 && key.length <= withMatch.length * 0.6, `${key.length} of ${withMatch.length}`);
  assert.equal(withMatch.filter((e) => showFigureHelp(e, 2)).length, withMatch.length);
  assert.equal(withMatch.filter((e) => showFigureHelp(e, 0)).length, 0);
  for (const label of ['Real GDP growth', 'CPI inflation', 'Policy rate', 'Debt / GDP', 'FX reserves']) assert.ok(showFigureHelp(figureHelp(label), 1), label);
  assert.equal(showFigureHelp(figureHelp('2s10s curve slope'), 1), false);
  assert.deepEqual([showGuides(0), showGuides(1), showGuides(2)], [false, true, true]);
  assert.deepEqual([showMissingHelp(0), showMissingHelp(1)], [false, true]);
});

test('every chart guide says how to read it and what it means in real life, with no figures', () => {
  for (const [id, g] of Object.entries(CHART_GUIDES)) {
    assert.ok(g.read.length > 60 && g.life.length > 60, id);
  }
});

test('an observation splits into its fact and its plain meaning; reports join them', () => {
  const j = `Policy is tight.${MEANS}Borrowing is dear.`;
  assert.deepEqual(splitMeaning(j), { fact: 'Policy is tight.', meaning: 'Borrowing is dear.' });
  assert.deepEqual(splitMeaning('No meaning.'), { fact: 'No meaning.' });
  assert.equal(joinMeaning(j), 'Policy is tight. Borrowing is dear.');
});

test('forecast ranges show at key and full help and hide at Help off, which says so', async () => {
  assert.deepEqual([showRanges(0), showRanges(1), showRanges(2)], [false, true, true]);
  assert.match(HELP_LEVELS[0].note, /no explanations or forecast ranges/);
  const { SHELL } = await import('../src/i18n/messages/shell.ts');
  const { SHELL_ES } = await import('../src/i18n/es/shell.ts');
  const { SHELL_FR } = await import('../src/i18n/fr/shell.ts');
  const keys = ['rangesHidden', 'noRange', 'noRangeImf', 'noRangeOwn', 'noRangeGfn'] as const;
  for (const k of keys) {
    const en = SHELL.en[k];
    assert.ok(en, k);
    assert.ok(SHELL_ES[k] && SHELL_ES[k] !== en, `es ${k}`);
    assert.ok(SHELL_FR[k] && SHELL_FR[k] !== en, `fr ${k}`);
  }
  assert.match(SHELL_ES.noRange, /^Sin rango disponible: \{reason\}$/);
});
