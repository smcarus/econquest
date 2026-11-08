import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachLanguage, defineMessages, LANGS, nextLang, parseLang, placeholders, translate } from '../src/i18n/lang';
import { ALL_CATALOGS } from '../src/i18n/messages';
import { ES } from '../src/i18n/es';

test('languages: English and Spanish; anything else reads as English', () => {
  assert.deepEqual(LANGS.map((l) => l.code), ['en', 'es']);
  assert.equal(parseLang('es'), 'es');
  for (const bad of [undefined, null, '', 'ES', 'fr', 'xx']) assert.equal(parseLang(bad), 'en');
  assert.equal(nextLang('en'), 'es');
  assert.equal(nextLang('es'), 'en');
  // Spanish is marked as not yet checked by a native speaker, so the app says so beside the switch.
  assert.equal(LANGS.find((l) => l.code === 'es')?.reviewed, false);
});

test('translate fills placeholders and falls back to English, never to a bare key', () => {
  const c = defineMessages('demo', { hi: 'Hello {name}', only: 'English only' }, { hi: 'Hola {name}' });
  assert.equal(translate(c, 'es', 'hi', { name: 'Sam' }), 'Hola Sam');
  assert.equal(translate(c, 'en', 'hi', { name: 'Sam' }), 'Hello Sam');
  assert.equal(translate(c, 'es', 'only'), 'English only');
  assert.equal(translate(c, 'es', 'hi'), 'Hola {name}');
  assert.equal(translate(c, 'es', 'hi', { other: 1 }), 'Hola {name}');
});

test('every message file is complete in Spanish and keeps every placeholder', () => {
  assert.ok(ALL_CATALOGS.length >= 1);
  const areas = new Set<string>();
  for (const c of ALL_CATALOGS) {
    assert.ok(!areas.has(c.area), `two message files are called ${c.area}`);
    areas.add(c.area);
    const spanish = ES[c.area];
    assert.ok(spanish, `${c.area} has no Spanish file in src/i18n/es/index.ts`);
    for (const [key, en] of Object.entries(c.en)) {
      const es = spanish[key];
      assert.ok(es && es.trim(), `${c.area}.${key} has no Spanish`);
      assert.deepEqual(placeholders(es), placeholders(en), `${c.area}.${key} changes the placeholders`);
      // Short labels such as "EN" may read the same; anything longer must be translated.
      if (en.length > 3) assert.notEqual(es, en, `${c.area}.${key} is still English`);
    }
    for (const key of Object.keys(spanish)) assert.ok(key in c.en, `${c.area}.${key} is in Spanish only`);
  }
  for (const area of Object.keys(ES)) assert.ok(areas.has(area), `Spanish for ${area}, which has no English file in src/i18n/messages/index.ts`);
});

test('Spanish loads on its own and reaches message files defined before and after it', () => {
  const before = defineMessages('demo-before', { a: 'Apple' });
  assert.equal(translate(before, 'es', 'a'), 'Apple');
  attachLanguage('es', { 'demo-before': { a: 'Manzana' }, 'demo-after': { b: 'Pera' } });
  assert.equal(translate(before, 'es', 'a'), 'Manzana');
  // A screen opened later (a lazy dialog) defines its file after the Spanish arrived.
  const after = defineMessages('demo-after', { b: 'Pear' });
  assert.equal(translate(after, 'es', 'b'), 'Pera');
  assert.equal(translate(after, 'en', 'b'), 'Pear');
});
