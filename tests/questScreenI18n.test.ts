import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachLanguage, translate, translateText, type Lang } from '../src/i18n/lang';
import { QUESTS } from '../src/i18n/messages/quests';
import { describeRule, RULE_WORDS, type QuestRule, type RuleWords } from '../src/utils/questRules';
import { describeOutcome, OUTCOME_WORDS, type OutcomeWords } from '../src/utils/questResolve';
import { SIGNAL_METHODS, describeTestVerdict } from '../src/utils/questSignal';
import { STANCE_AXES, stanceWords } from '../src/utils/questStances';
import { QUEST_SERIES } from '../src/utils/questSeries';
import { QUEST_TOPICS } from '../src/utils/quests';

async function loadAll() {
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('fr', FR, FR_TEXT);
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('pt', PT, PT_TEXT);
}

const words = <W extends Record<string, string>>(en: W, lang: Lang) => Object.fromEntries(Object.keys(en).map((k) => [k, translate(QUESTS, lang, k as keyof typeof QUESTS.en)])) as W;

const rule: QuestRule = { kind: 'direction', ref: { country: 'TUR', series: 'policy_rate' }, from: 'closesOn', to: { on: '2027-06-30' }, op: 'lower' };
const annual: QuestRule = { kind: 'threshold', ref: { country: 'BRA', series: 'debt_gdp' }, at: { on: '2027-10-15', period: '2026' }, op: 'above', value: 80 };

test('the English rule and result read as before', () => {
  assert.equal(describeRule(rule), 'Yes if Central bank policy rate (TUR) on the first value published on or after 2027-06-30 is lower than on the first value published on or after the day entries close.');
  assert.equal(describeRule(annual), 'Yes if Government debt (BRA) for 2026 (as first published on or after 2027-10-15) is above 80 % of GDP.');
  assert.equal(
    describeOutcome({ kind: 'settled', readings: [{ value: 40, date: '2026-12-11' }, { value: 38, date: '2027-06-30' }], outcome: { answer: 'probability', happened: true, baseRate: 0.25 } }),
    'Yes, it happened (40 on 2026-12-11, then 38 on 2027-06-30). In past periods of the same length this happened 25% of the time.',
  );
});

test('a rule and a result read as whole sentences in Spanish, French and Portuguese', async () => {
  await loadAll();
  const es = describeRule(rule, words<RuleWords>(RULE_WORDS, 'es'), (s) => translateText(s, 'es'));
  assert.equal(es, 'Sí si Tipo de interés oficial del banco central (TUR) en el primer valor publicado a partir del 2027-06-30 es menor que en el primer valor publicado a partir del día en que se cierran las respuestas.');
  const fr = describeRule(annual, words<RuleWords>(RULE_WORDS, 'fr'), (s) => translateText(s, 'fr'));
  assert.equal(fr, 'Oui si Dette publique (BRA) pour 2026 (selon la première publication à partir du 2027-10-15) est supérieur à 80 % du PIB.');
  const pt = describeOutcome({ kind: 'unresolvable', reason: 'The feed did not answer' }, words<OutcomeWords>(OUTCOME_WORDS, 'pt'), (s) => translateText(s, 'pt'));
  assert.equal(pt, 'Sem solução: A fonte não respondeu.');
  for (const lang of ['es', 'fr', 'pt'] as const) {
    const out = describeOutcome({ kind: 'settled', via: 'fallback', readings: [{ value: 3.1, date: '2027-01-05' }], outcome: { answer: 'level', value: 3.1, noChange: 2.9 } }, words<OutcomeWords>(OUTCOME_WORDS, lang));
    assert.doesNotMatch(out, / the | was | entries /, `${lang}: ${out}`);
    assert.match(out, /3\.1.*2027-01-05.*2\.9/);
  }
});

test('every series name, unit, topic, test method, verdict and stance the screen shows has a translation', async () => {
  await loadAll();
  const need = new Set<string>();
  for (const s of QUEST_SERIES) {
    need.add(s.label);
    if (s.unit && s.unit !== '%' && s.unit !== '$/bbl') need.add(s.unit);
  }
  for (const t of QUEST_TOPICS) need.add(t);
  for (const m of Object.values(SIGNAL_METHODS)) need.add(m.label);
  for (const a of STANCE_AXES) {
    for (const s of [a.question, a.first, a.second, a.explain]) need.add(s);
    for (const v of [-2, -1, 0, 1, 2, undefined] as const) need.add(stanceWords(a, v));
  }
  for (const v of [{ verdict: 'too_few_cases' }, { verdict: 'failed' }, { verdict: 'passed' }] as const) {
    const d = describeTestVerdict({ ...v, p: 0.01, summary: 'Hit rate 0.61 against 0.50.' }, v.verdict === 'passed' ? { adjusted: 0.02, holds: true } : undefined);
    need.add(d.label).add(d.text);
  }
  need.add(describeTestVerdict({ verdict: 'passed', p: 0.04, summary: 'x.' }, { adjusted: 0.2, holds: false }).text);
  const same: Record<string, Set<string>> = { es: new Set(), fr: new Set(['inflation']), pt: new Set() };
  for (const lang of ['es', 'fr', 'pt'] as const) {
    const missing = [...need].filter((s) => translateText(s, lang) === s && !same[lang]!.has(s));
    assert.deepEqual(missing, [], `${lang}: no translation`);
  }
  assert.equal(translateText(stanceWords(STANCE_AXES[0]!, -2), 'es'), 'Se inclina claramente hacia: Mantener baja la inflación');
});

test('the server reasons and notes the screen shows are swapped whole, keeping their dates and numbers', async () => {
  await loadAll();
  const cases: Array<[string, string, Lang]> = [
    ['Entries close 2026-12-15; result due 2027-01-05', 'Las respuestas se cierran el 2026-12-15; resultado previsto el 2027-01-05', 'es'],
    ['Scored after 2027-01-05', 'Noté après le 2027-01-05', 'fr'],
    ['No result yet (due 2027-01-05)', 'Ainda sem resultado (previsto para 2027-01-05)', 'pt'],
    ["Reproduces the app's 0.061 (difference 0.001, within 0.005)", 'Reproduce el 0.061 de la aplicación (diferencia 0.001, dentro de 0.005)', 'es'],
    ['Ranked after 12 settled forecasts with a base rate (3 so far)', 'Classé après 12 prévisions tranchées avec un taux de base (3 pour l’instant)', 'fr'],
    ['Entries open on 2026-12-01', 'As respostas abrem em 2026-12-01', 'pt'],
  ];
  for (const [en, want, lang] of cases) assert.equal(translateText(en, lang), want);
  // A list of problems joined with "; " is swapped item by item.
  assert.equal(translateText('A probability from 0 to 1; No Quest with that id', 'es'), 'Una probabilidad de 0 a 1; No hay ningún reto con ese identificador');
});

test('the Quests screen speaks formally: usted in Spanish, vous in French, você in Portuguese', async () => {
  const { QUESTS_ES } = await import('../src/i18n/es/quests');
  const { QUESTS_FR } = await import('../src/i18n/fr/quests');
  const { QUESTS_PT } = await import('../src/i18n/pt/quests');
  const { QUEST_TEXT_ES } = await import('../src/i18n/es/questText');
  const { QUEST_TEXT_FR } = await import('../src/i18n/fr/questText');
  const { QUEST_TEXT_PT } = await import('../src/i18n/pt/questText');
  const all = (d: Record<string, string>) => Object.values(d).join('\n');
  assert.doesNotMatch(all({ ...QUESTS_ES, ...QUEST_TEXT_ES }), /(?<!\p{L})(tú|tu|tus|tienes|puedes|quieres|eres|estás|te)(?!\p{L})/iu, 'Spanish uses usted');
  assert.doesNotMatch(all({ ...QUESTS_FR, ...QUEST_TEXT_FR }), /(?<!\p{L})(tu|ton|ta|tes|toi)(?!\p{L})/iu, 'French uses vous');
  assert.doesNotMatch(all({ ...QUESTS_PT, ...QUEST_TEXT_PT }), /(?<!\p{L})(tu|teu|tua|teus|tuas|ti|contigo)(?!\p{L})/iu, 'Portuguese uses você');
  assert.doesNotMatch(all({ ...QUESTS_ES, ...QUEST_TEXT_ES }), /\bQuests?\b/, 'Spanish calls a Quest a reto');
  assert.doesNotMatch(all({ ...QUESTS_FR, ...QUEST_TEXT_FR }), /\bQuests?\b/, 'French calls a Quest a quête');
});
