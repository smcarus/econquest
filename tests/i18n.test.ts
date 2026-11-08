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

test('watchlist column headers in the message file match the columns the app defines', async () => {
  const { COLUMN_BY_ID } = await import('../src/utils/watchlistView');
  const { FIGURE_LABEL } = await import('../src/utils/liveFigures');
  const { WATCHLIST } = await import('../src/i18n/messages/watchlist');
  const en = WATCHLIST.en as Record<string, string>;
  for (const c of Object.values(COLUMN_BY_ID)) {
    assert.equal(en[`col_${c.id}`], c.label, `column ${c.id} header`);
    assert.equal(en[`help_${c.id}`], c.help, `column ${c.id} hover text`);
  }
  for (const [key, label] of Object.entries(FIGURE_LABEL)) assert.equal(en[`fig_${key}`], label, `figure ${key}`);
});

test('every reason a figure can show as Missing has Spanish, and nothing else is in the list', async () => {
  const { missingReason } = await import('../src/utils/liveFigures');
  const { cliMissing } = await import('../src/utils/oecdCli');
  const { SOVEREIGN_CATALOG } = await import('../src/data/presetsAndBaselines');
  const { MISSING_ES } = await import('../src/i18n/es/missing');
  const keys = ['cds', 'hcspread', 'yield', 'debt', 'reserves', 'cpi', 'policy'] as const;
  const isos = [...new Set([...SOVEREIGN_CATALOG.map((c) => c.iso3), 'XXX', 'GHA', 'EGY', 'TUR'])];
  const said = new Set<string>();
  for (const k of keys)
    for (const iso of isos) {
      const r = missingReason(k, iso);
      said.add(r.short);
      said.add(r.help);
    }
  for (const pulled of [true, false]) {
    const r = cliMissing(pulled);
    said.add(r.short);
    said.add(r.help);
  }
  for (const s of said) assert.ok(s in MISSING_ES, `no Spanish for: ${s}`);
  for (const k of Object.keys(MISSING_ES)) assert.ok(said.has(k), `Spanish for a reason the app no longer gives: ${k}`);
  for (const [en, es] of Object.entries(MISSING_ES)) assert.notEqual(es, en, `not translated: ${en}`);
});

test('Missing reasons swap whole, swap inside a joined text, and stay English when unknown', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  assert.equal(translateText('Needs setup', 'es'), 'Por configurar');
  assert.equal(translateText('Needs setup', 'en'), 'Needs setup');
  const help = Object.keys(ES_TEXT).find((k) => k.startsWith("Turkey's 10-year"))!;
  const other = Object.keys(ES_TEXT).find((k) => k.startsWith('No free official source of this'))!;
  const joined = `Turkey: ${help} Egypt: ${other}`;
  assert.equal(translateText(joined, 'es'), `Turkey: ${ES_TEXT[help]} Egypt: ${ES_TEXT[other]}`);
  assert.equal(translateText('Something new', 'es'), 'Something new');
  assert.equal(translateText('', 'es'), '');
});

test('Research section names and figure names in the message file match the ones the app defines', async () => {
  const { RESEARCH_SECTIONS } = await import('../src/utils/researchSections');
  const { HC_SPREAD_LABEL } = await import('../src/utils/hardCurrencySpread');
  const { RESEARCH } = await import('../src/i18n/messages/research');
  const en = RESEARCH.en as Record<string, string>;
  for (const s of RESEARCH_SECTIONS) assert.equal(en[`sec_${s.id}`], s.label, `section ${s.id}`);
  assert.equal(en.fig_spread, HC_SPREAD_LABEL);
});

test('the brief panels: every title, figure name, reason and meaning they build from the data has Spanish', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { economistBrief, splitMeaning } = await import('../src/utils/countryNotes');
  const { bankerBrief } = await import('../src/utils/bankerNote');
  const { officialBrief } = await import('../src/utils/officialNote');
  const { marketsMacroBrief } = await import('../src/utils/marketsMacro');
  const { buildBaselineOpenData, SOVEREIGN_CATALOG } = await import('../src/data/presetsAndBaselines');
  const { upcomingOfficialEvents } = await import('../src/data/officialCalendar');
  const { markLive, TEST_FEED_VALUES } = await import('./helpers/live');
  attachLanguage('es', ES, ES_TEXT);
  const now = new Date('2026-11-04T12:00:00Z');
  const isos = SOVEREIGN_CATALOG.map((c) => c.iso3);
  // Calendar event titles are the source's own names and stay as they are.
  const events = new Set(upcomingOfficialEvents(isos, 400, now).map((e) => e.title));
  const SECTION: Record<string, string> = { imf: 'imfIndicators', wb: 'worldBankIndicators', gdelt: 'gdeltMetrics', market: 'monetaryAndMarket' };
  const need = new Set<string>();
  for (const iso of isos)
    // No live figures, then every figure live at a few different values, so each rule's branches show.
    for (const scale of [0, 1, -1, 0.2, 3]) {
      const openData = buildBaselineOpenData(iso);
      openData.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-04T12:00:00Z' } as never;
      if (scale) {
        for (const [p, v] of Object.entries(TEST_FEED_VALUES)) {
          const [pre, k] = p.split('.');
          const sec = (openData as unknown as Record<string, Record<string, number>>)[SECTION[pre!]!];
          if (sec) sec[k!] = v * scale;
        }
        markLive(openData, Object.keys(TEST_FEED_VALUES));
      }
      const run = { iso3: iso, countryName: openData.countryName, openData } as never;
      for (const b of [economistBrief(run, now), bankerBrief(run, [], now), officialBrief(run, now), marketsMacroBrief(run, [])]) {
        if (b.sampleWarning) need.add(b.sampleWarning);
        if (/yet\.$|are live\.$/.test(b.headline)) need.add(b.headline);
        for (const j of b.judgements) {
          const m = splitMeaning(j).meaning;
          if (m) need.add(m);
        }
        for (const g of b.groups) {
          need.add(g.title);
          for (const r of g.rows) {
            if (!events.has(r.label)) need.add(r.label);
            if (!/\d/.test(r.value)) need.add(r.value);
            if (r.help) need.add(r.help);
            if (/did not answer|^Needs |^No |^Not |^live |^model|^official calendar|^no official/.test(r.source)) need.add(r.source);
          }
        }
      }
    }
  const untranslated = [...need].filter((s) => translateText(s, 'es') === s);
  assert.deepEqual(untranslated, [], 'brief text with no Spanish');
});

test('a pattern swaps a whole sentence and keeps what the app put in it', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  assert.equal(translateText('Spot FX (BRL per USD)', 'es'), 'Tipo de cambio al contado (BRL por USD)');
  assert.equal(translateText('Brazil: inflation 4.6% against a 3.0% target.', 'es'), 'Brazil: inflación del 4.6% frente a una meta del 3.0%.');
  assert.equal(translateText('Brazil: inflation 4.6%.', 'es'), 'Brazil: inflación del 4.6%.');
  assert.match(translateText('18 of 19 figures for Brazil are missing, because their source is not connected or did not answer. They read Missing, and no built-in or estimated value is shown in their place. Tap "Why missing?" on any of them for the reason and what would fill it.', 'es'), /^Faltan 18 de 19 cifras de Brazil,/);
  // A sentence with figures that no pattern covers stays English.
  assert.equal(translateText('Brazil: inflation 4.6% against a 3.0% target, 10Y 15.29%.', 'es'), 'Brazil: inflation 4.6% against a 3.0% target, 10Y 15.29%.');
  assert.equal(translateText('Growth is moderate at 2.8% a year.', 'es'), 'Growth is moderate at 2.8% a year.');
});
