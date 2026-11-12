import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachLanguage, defineMessages, LANGS, nextLang, parseLang, placeholders, translate } from '../src/i18n/lang';
import { ALL_CATALOGS } from '../src/i18n/messages';
import { ES } from '../src/i18n/es';

/** Words spelled the same in Portuguese and English; anything else left identical is untranslated. */
const SAME_IN_PORTUGUESE = new Set(['Menu', 'Offline', 'Quests', 'Markdown', 'Bootstrap', 'Cascade', 'Instrument', 'AI: Gemini', '{n} pt', '{n} pts', '{value} pts', 'BIS ({name}), {date}', 'carry', 'macro', 'Hash', 'Fiscal', 'Spread', 'Backtest', 'CDS (credit default swap)', ' · hash ']);
/** Words spelled the same in French and English; anything else left identical is untranslated. */
const SAME_IN_FRENCH = new Set(['Inflation (%)', 'Distance', 'Question {n}', 'momentum', 'macro', 'Document', '1 question', '{n} questions', 'Stable', '{n} pts', 'Sections', 'Markdown', 'Bootstrap', 'Notes', 'Communication', 'stable', 'Concentration', 'Options', 'Instrument', 'Type', 'Date', 'Sanctions', 'Question', 'Menu', 'Agents', '1 position', '{n} positions', '1 document', '{n} documents', 'Inflation', 'Cycle', 'Question', 'Instructions', '{n} pages, ', '1 page, ', 'Tests', 'Image', 'Documents', '{num} passages', '1 passage', 'Cascade',
  'Articles', 'Coefficient', 'Date', 'Excel', 'Inflation {inf}, {basis}{gap}', 'Option', 'Point', 'Programmes', 'Sanctions', 'Sources',
  'Violence', 'Violence (%)', 'violence', '{n} points', '{n} pt', '{n} pts', '{value} pts', 'Population', 'projection',
  ' · notes', 'Client', 'Duration', 'Inflation, %', 'Instrument', 'Long', 'long', 'Record', 'Source', 'Type', 'taylor', 'CDS (protection)',
  'Expansion', 'expansion', 'Expansion ({date})', 'Expansion, {detail} ({date})', '{num} points']);

test('languages: English, Spanish, French and Portuguese; anything else reads as English', () => {
  assert.deepEqual(LANGS.map((l) => l.code), ['en', 'es', 'fr', 'pt']);
  assert.equal(parseLang('pt'), 'pt');
  assert.equal(parseLang('es'), 'es');
  assert.equal(parseLang('fr'), 'fr');
  for (const bad of [undefined, null, '', 'ES', 'FR', 'PT', 'pt-BR', 'de', 'xx']) assert.equal(parseLang(bad), 'en');
  assert.equal(nextLang('en'), 'es');
  assert.equal(nextLang('es'), 'fr');
  assert.equal(nextLang('fr'), 'pt');
  assert.equal(nextLang('pt'), 'en');
  assert.equal(LANGS.find((l) => l.code === 'pt')?.reviewed, false);
  // Neither translation has been checked by a native speaker yet, so the app says so beside the switch.
  assert.equal(LANGS.find((l) => l.code === 'es')?.reviewed, false);
  assert.equal(LANGS.find((l) => l.code === 'fr')?.reviewed, false);
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
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('fr', FR, FR_TEXT);
  const noFrench = [...need].filter((s) => translateText(s, 'fr') === s && !SAME_IN_FRENCH.has(s));
  assert.deepEqual(noFrench, [], 'brief text with no French');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('pt', PT, PT_TEXT);
  const noPortuguese = [...need].filter((s) => translateText(s, 'pt') === s && !SAME_IN_PORTUGUESE.has(s));
  assert.deepEqual(noPortuguese, [], 'brief text with no Portuguese');
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

test('the one-country panels: sentences, labels and reasons the app builds in English have Spanish', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { dsaSentence } = await import('../src/utils/debtSustainability');
  const { debtFanSentence } = await import('../src/utils/debtFan');
  const { bohnSentence } = await import('../src/utils/bohnTest');
  const { gfnSentence } = await import('../src/utils/grossFinancingNeed');
  const { ruleFamilySentence } = await import('../src/utils/ruleFamily');
  const { eventSentence } = await import('../src/utils/eventStudy');
  const { beerSentence } = await import('../src/utils/beer');
  const { lpSentence } = await import('../src/utils/localProjections');
  const { reserveAdequacySentence } = await import('../src/utils/reserveAdequacy');
  const { replaySentence } = await import('../src/utils/decisionReplay');
  const { trackRecordSentence } = await import('../src/utils/trackRecord');
  const { scenarioSentence, FACTORS, RESPONSES, PRESETS } = await import('../src/utils/scenarioEngine');
  const { multiplierView } = await import('../src/utils/fiscalMultipliers');
  const { STATUS_LABEL } = await import('../src/data/modelRegister');
  const { GRADE_LABEL } = await import('../src/utils/evidenceGrade');
  const { STANDARD_OPTIONS } = await import('../src/utils/costedOptions');
  attachLanguage('es', ES, ES_TEXT);
  const tx = (s: string) => translateText(s, 'es');
  const s: string[] = [];
  const sc = (id: string, label: string, end: number) => ({ id, label, about: '', end, path: [{ year: '2031', debt: end }] });
  const dsa = { debtNow: 86.4, lastOutturnYear: '2025', scenarios: [sc('baseline', 'Baseline (IMF inputs)', 92.1)], worst: sc('combined', 'Combined shock', 101.2), stabilisingPb: 1.2, projectedPb: -0.4 };
  s.push(dsaSentence(dsa as never), dsaSentence({ ...dsa, projectedPb: undefined } as never), dsaSentence({ ...dsa, worst: undefined, stabilisingPb: undefined } as never));
  s.push(debtFanSentence({ sample: { from: '1995', to: '2025' }, years: [{ year: '2030', p10: 80, p50: 90, p90: 104 }], probAboveNow: 0.62 } as never));
  for (const verdict of ['responds', 'weak', 'no_response']) s.push(bohnSentence({ verdict, rho: { value: 0.05, se: 0.01, p: 0.01 }, from: '1990', to: '2024', n: 35 } as never, 'Brazil'));
  s.push(gfnSentence({ peak: { value: 18.2, year: '2026' }, aboveBenchmark: true, years: [] } as never, 'Brazil'));
  s.push(gfnSentence({ peak: { value: 8.2, year: '2026' }, aboveBenchmark: false, years: [] } as never, 'Brazil'));
  s.push(gfnSentence({ years: [{ deficit: 3 }] } as never, 'Brazil'), gfnSentence({ years: [] } as never, 'Brazil'));
  for (const position of ['inside the range', 'above the range', 'below the range']) s.push(ruleFamilySentence({ rows: [{ pct: 1 }, { pct: 2 }], position, policyPct: 10.5, range: { lo: 8, hi: 11 }, rStar: 2 } as never, 'Brazil'));
  for (const bank of ['own', 'fed']) {
    s.push(eventSentence('Brazil', { bank, groups: [{ ok: true, n: 12, kind: 'hike', end: 1.2, dayZero: 0.3 }, { ok: true, n: 8, kind: 'cut', end: -0.4, dayZero: -0.1 }] } as never));
    s.push(eventSentence('Brazil', { bank, groups: [] } as never));
  }
  for (const gapPct of [6.1, -3]) s.push(beerSentence('Brazil', { latest: { gapPct, month: '2026-09', fairValueYear: '2025' }, coef: [{ name: 'Terms of trade', signOk: true }], n: 25, r2: 0.61 } as never));
  for (const [beta, lo, hi] of [[-0.3, -0.6, 0.1], [0.4, 0.1, 0.7]]) s.push(lpSentence({ steps: [{ h: 12, beta, lo, hi }], from: '2005-01', to: '2026-08' } as never, 'Brazil'));
  for (const reading of ['below', 'ok']) s.push(reserveAdequacySentence({ reading, latest: { year: 2024, ratioFloatingMax: 80, ratioFixedMax: 70 } } as never, 'Brazil'));
  for (const [action, signal, matched] of [['raised', 'raise', true], ['cut', 'hold', false], ['held', 'cut', false]] as const)
    s.push(replaySentence({ action, rateBeforePct: 10.5, rateAfterPct: 11, rule: { pct: 12, signal }, matched, missing: [] } as never));
  s.push(replaySentence({ action: 'held', rateBeforePct: 10.5, rateAfterPct: 10.5, missing: ['monthly inflation'] } as never));
  s.push(trackRecordSentence({ entries: [] } as never), trackRecordSentence({ entries: [1, 2], calls: 0 } as never), trackRecordSentence({ entries: [1], calls: 3, scored: 0, horizonDays: 90 } as never));
  s.push(trackRecordSentence({ entries: [1, 2], calls: 3, scored: 2, followed: 1, pending: 1, smallSample: true, horizonDays: 90 } as never));
  s.push(scenarioSentence('Brazil', 'Fed raises 1 point', [{ response: 'fx', value: 2.1, lo: 0.5, hi: 3.8 }, { response: 'policy', value: -0.42, lo: -0.8, hi: -0.1 }] as never));
  for (const group of [{ debtPctGdp: { value: 86, year: '2025' }, outputGap: { year: '2025', pct: -1.2, source: 'imf' } }, { outputGap: { year: '2025', pct: 1.2, source: 'estimate' }, policyRatePct: 0.25 }, {}]) {
    for (const iso3 of ['BRA', 'DEU']) {
      const mv = multiplierView({ iso3, ...group } as never);
      s.push(mv.sentence, mv.cycle.note, mv.guide.why, ...(mv.lowerBound ? [mv.lowerBound.why] : []), ...mv.characteristics.flatMap((c) => [c.label, c.why]), ...mv.literature.map((l) => l.finding));
    }
  }
  s.push(...Object.values(STATUS_LABEL), ...Object.values(GRADE_LABEL), ...STANDARD_OPTIONS.map((o) => o.label));
  s.push(...FACTORS.map((f) => f.label), ...Object.values(RESPONSES).flatMap((r) => [r.label, r.note]), ...PRESETS.map((p) => p.label));
  const { spikeSentence } = await import('../src/utils/unrestSpikes');
  const { v1Figures } = await import('../src/utils/gdeltDaily');
  const { sanctionsSentence } = await import('../src/utils/sanctionsLists');
  const { grVarSentence } = await import('../src/utils/grVar');
  const spike = { month: '2026-09', spikes: ['protests', 'violence'], episodes: ['protests'], protestZ: 2.4, violenceZ: 2.1 };
  s.push(spikeSentence('Brazil', [spike] as never), spikeSentence('Brazil', [{ ...spike, spikes: [], episodes: [] }] as never), spikeSentence('Brazil', []));
  s.push(...v1Figures({ month: '2026-09', from: '1979-01', months: 500, protestPct: 9, protestPctile: 95, violencePct: 4, violencePctile: 92, goldsteinMean: -2, goldsteinPctile: 5 } as never).sentences);
  s.push(sanctionsSentence('Brazil', { byList: [{ entries: 12, short: 'OFAC SDN' }], programs: [{ program: 'SDGT', list: 'ofac_sdn', entries: 9 }] } as never, { files: [1] } as never));
  s.push(sanctionsSentence('Brazil', { byList: [], programs: [] } as never, { files: [] } as never));
  for (const scenario of [undefined, { value: 1.2, lo: 0.2, hi: 2.4 }])
    s.push(grVarSentence('Brazil', { blocks: [{ basis: 'world', stress: { months: 40, var95: 6.1, es95: 8.2 }, all: { months: 300, var95: 4.2, es95: 6 }, scenario }] } as never));
  const untranslated = s.filter((x) => tx(x) === x || / the | weaker | stronger | points? lower| higher than/.test(tx(x)));
  assert.deepEqual(untranslated, [], 'panel text with no Spanish');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('fr', FR, FR_TEXT);
  const noFrench = s.filter((x) => (translateText(x, 'fr') === x && !SAME_IN_FRENCH.has(x)) || / the | weaker | stronger | points? lower| higher than/.test(translateText(x, 'fr')));
  assert.deepEqual(noFrench, [], 'panel text with no French');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('pt', PT, PT_TEXT);
  const noPortuguese = s.filter((x) => (translateText(x, 'pt') === x && !SAME_IN_PORTUGUESE.has(x)) || / the | weaker | stronger | points? lower| higher than/.test(translateText(x, 'pt')));
  assert.deepEqual(noPortuguese, [], 'panel text with no Portuguese');
});

test('Holdings and Tools: tool names, briefs, signals and tool reasons the app builds in English have Spanish', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  const tx = (x: string) => translateText(x, 'es');
  const { READY_TOOLS, TOOL_CATEGORIES, HIDDEN_GROUPS } = await import('../src/data/toolsCatalog');
  const { bookView, pmBookBrief, clientBrief } = await import('../src/utils/bookNote');
  const { buildExercises } = await import('../src/utils/exercises');
  const { convertAll } = await import('../src/utils/unitConverters');
  const { taylorSandbox, filterSandbox } = await import('../src/utils/modelSandboxes');
  const { ASSET_CLASS_LABEL } = await import('../src/utils/holdings');
  const s: string[] = [];
  s.push(...TOOL_CATEGORIES.flatMap((c) => [c.title, c.purpose]), ...READY_TOOLS.flatMap((t) => [t.title, t.what]));
  s.push(...HIDDEN_GROUPS.flatMap((g) => [g.title, ...g.desks.flatMap((d) => [d.label, d.needs])]).filter((x) => x !== 'Macro'));
  s.push(...Object.values(ASSET_CLASS_LABEL));
  // Countries, positions, event titles and source names stay as written; the sentences around them change.
  const keep = new Set(['Brazil', 'Mexico']);
  const holdings = [
    { id: 'a', iso3: 'BRA', instrument: 'x', assetClass: 'HC_BOND', side: 'LONG', notionalUsdMm: 10, durationYears: 5 },
    { id: 'b', iso3: 'MEX', instrument: 'y', assetClass: 'LC_BOND', side: 'SHORT', notionalUsdMm: 30 },
  ];
  const items = [{ iso3: 'BRA', countryName: 'Brazil', yield10YPct: 13.2, yield10YSource: 'official' }, { iso3: 'MEX', countryName: 'Mexico' }];
  for (const b of [pmBookBrief(bookView(holdings as never, items as never, items as never)), clientBrief(bookView(holdings as never, items as never, items as never)), pmBookBrief(bookView([], [], [])), clientBrief(bookView([], [], []))])
    s.push(b.headline, ...b.judgements.filter((j) => !/official events? in the next|official dates? in the next|; the next is/.test(j)), ...b.groups.flatMap((g) => [g.title, ...g.rows.filter((r) => !r.verified).flatMap((r) => [r.label, r.source])]));
  const ex = buildExercises({ countryName: 'Brazil', month: '2025-12', series: {} as never });
  s.push(...ex.notSet.map((n) => n.reason));
  const conv = convertAll(1e6, '2024', '2025', {});
  s.push(...conv.flatMap((r) => (r.ok ? [] : [r.label, r.reason])));
  s.push(...taylorSandbox({ rStar: 2, pi: 4, target: 3, gap: -1, aPi: 0.5, aGap: 0.5 }).terms.map((t) => t.label));
  const f = filterSandbox([], 100, 2);
  if ('reason' in f) s.push(f.reason);
  const untranslated = s.filter((x) => !keep.has(x) && !/^[\d.%$,mm −-]+$/.test(x) && (tx(x) === x || / the | your | of the /.test(tx(x))));
  assert.deepEqual(untranslated, [], 'tool text with no Spanish');
  { const { FR, FR_TEXT } = await import('../src/i18n/fr'); attachLanguage('fr', FR, FR_TEXT); }
  const fx = (x: string) => translateText(x, 'fr');
  const noFrench = s.filter((x) => !keep.has(x) && !SAME_IN_FRENCH.has(x) && !/^[\d.%$,mm −-]+$/.test(x) && (fx(x) === x || / the | your | of the /.test(fx(x))));
  assert.deepEqual(noFrench, [], 'tool text with no French');
  { const { PT, PT_TEXT } = await import('../src/i18n/pt'); attachLanguage('pt', PT, PT_TEXT); }
  const px = (x: string) => translateText(x, 'pt');
  const noPortuguese = s.filter((x) => !keep.has(x) && !SAME_IN_PORTUGUESE.has(x) && !/^[\d.%$,mm −-]+$/.test(x) && (px(x) === x || / the | your | of the /.test(px(x))));
  assert.deepEqual(noPortuguese, [], 'tool text with no Portuguese');
});

test('Compare countries: divergence lines, quadrants, MarketEdge notes, scenarios, leads and the Fed balance sheet have Spanish', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  const tx = (x: string) => translateText(x, 'es');
  const { QUALITY_LABEL, rankDivergences } = await import('../src/utils/divergences');
  const { QUADRANT_NOTE, regimeMap } = await import('../src/utils/regimeQuadrant');
  const { SCENARIOS, scenarioImpact, priceShock } = await import('../src/utils/scenarioExposure');
  const { recordLead, revisionLeads } = await import('../src/utils/storyLeads');
  const { cliTrendText } = await import('../src/utils/marketTrends');
  const { benchmarkRows } = await import('../src/utils/marketEdgeAnchors');
  const { FED_SOURCE } = await import('../src/utils/fedBalanceSheet');
  const s: string[] = [];
  s.push(...Object.values(QUALITY_LABEL), ...Object.keys(QUADRANT_NOTE), ...Object.values(QUADRANT_NOTE), ...SCENARIOS.flatMap((x) => [x.name, x.shock]));
  const items = [
    { iso3: 'BRA', countryName: 'Brazil', policyRatePct: 15, policyRateSource: 'bis', policyRateBank: 'BCB', policyRateDate: '2026-09', cpiInflationPct: 5, cpiSource: 'live', yield10YPct: 13.5, yield10YSource: 'official', yield10YPeriod: '2026-09', reerGapPct: 12, reerPeriod: '2026-09', intlBondsDue1yUsdBn: 9, intlBondsUsdBn: 30, intlBondsAsOf: '2026-Q2' },
    { iso3: 'TUR', countryName: 'Turkey', policyRatePct: 20, policyRateSource: 'bis', cpiInflationPct: 40, cpiSource: 'live', yield10YPct: 30, yield10YSource: 'official', yield10YPeriod: '2026-09', reerGapPct: -15 },
    { iso3: 'MEX', countryName: 'Mexico', policyRatePct: 8, policyRateSource: 'bis', cpiInflationPct: 3.8, cpiSource: 'live', yield10YPct: 9, yield10YSource: 'official', yield10YPeriod: '2026-09' },
  ];
  for (const c of rankDivergences(items as never, { BRA: { yield10YPct: 13, yieldSource: 'official' } } as never))
    s.push(...[c.top, ...c.others].flatMap((d) => [d.label, d.headline, d.soWhat, ...d.evidence.flatMap((e) => [e.text, e.source])]), ...(c.change ? [c.change] : []));
  const rq = regimeMap([{ iso3: 'BRA', countryName: 'Brazil', oecdCli: { change6m: 0.4, month: '2026-09' }, oecdCpi: { change3mPts: -0.3, month: '2026-09', basis: 'national' } }, { iso3: 'X', countryName: 'X' }] as never);
  s.push(...rq.points.flatMap((p) => [p.quadrant, p.cpiSource]), ...rq.missing.flatMap((m) => m.missing));
  const trade = { fuelImportsPctMerch: 15, fuelExportsPctMerch: 5, importsPctGdp: 20, exportsPctGdp: 18, wbYear: '2024', witsYear: 2022, brentUsd: 80, pricesAsOf: '2026-09', gulfImportSharePct: 6.2, chinaExportSharePct: 25, russiaExportSharePct: 1, russiaImportSharePct: 2, exportMixPct: { '74': 30, '26': 10 }, exportMixYear: '2023' };
  for (const id of ['hormuz', 'taiwan', 'russia'] as const) s.push(scenarioImpact(id, trade as never)!.basis);
  s.push(scenarioImpact('taiwan', { ...trade, taiwanExportSharePct: 3 } as never)!.basis);
  s.push(priceShock(trade as never, { COPPER: 12, IRON_ORE: -5, CRUDE_BRENT: -8 })!.basis);
  const series = { id: 'gdp', label: 'Real GDP growth', unit: '%', source: 'IMF WEO', points: Array.from({ length: 15 }, (_, i) => ({ date: String(2011 + i), value: i === 14 ? 9 : 2 })), revisions: [] };
  const rec = recordLead('BRA', 'Brazil', series as never, new Date('2026-06-01'));
  if (rec) s.push(rec.text.replace('Real GDP growth', 'Crecimiento'));
  void revisionLeads;
  s.push(cliTrendText({ level: 99.5, change1m: -0.12, phase: 'slowdown', month: '2026-08' } as never), cliTrendText({ level: 100.2, month: '2026-08' } as never));
  for (const b of benchmarkRows([{ iso3: 'CHN', countryName: 'China', noYieldReason: 'No free official source wired in yet', cli: { level: 100.1, month: '2026-08', phase: 'expansion' } }, { iso3: 'RUS', countryName: 'Russia', noYieldReason: 'OECD series stopped in Jun 2018; no free current source', noCdsReason: 'No CDS market since the 2022 credit event and sanctions' }] as never, []))
    s.push(b.yieldNote, b.cdsNote, b.cliNote);
  s.push(FED_SOURCE, 'Total assets', 'Bank reserves at the Fed', 'Treasury General Account', 'Overnight reverse repos', 'Wednesday level', 'Week average');
  const untranslated = s.filter((x) => x !== 'BIS' && (tx(x) === x || / the | your | of the | since /.test(tx(x))));
  assert.deepEqual(untranslated, [], 'compare text with no Spanish');
  { const { FR, FR_TEXT } = await import('../src/i18n/fr'); attachLanguage('fr', FR, FR_TEXT); }
  const fx = (x: string) => translateText(x, 'fr');
  const noFrench = s.filter((x) => x !== 'BIS' && !SAME_IN_FRENCH.has(x) && (fx(x) === x || / the | your | of the | since /.test(fx(x))));
  assert.deepEqual(noFrench, [], 'compare text with no French');
  { const { PT, PT_TEXT } = await import('../src/i18n/pt'); attachLanguage('pt', PT, PT_TEXT); }
  const px = (x: string) => translateText(x, 'pt');
  const noPortuguese = s.filter((x) => x !== 'BIS' && !SAME_IN_PORTUGUESE.has(x) && (px(x) === x || / the | your | of the | since /.test(px(x))));
  assert.deepEqual(noPortuguese, [], 'compare text with no Portuguese');
});

test('Menu dialogs: every key and setting in Settings has Spanish, French and Portuguese, and so do backup and morning brief lines', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  const tx = (x: string) => translateText(x, 'es');
  const { API_KEY_FIELDS } = await import('../src/data/apiKeyFields');
  const { nextRunText } = await import('../src/utils/morningBrief');
  const { parseBackup } = await import('../src/utils/backup');
  const s: string[] = [];
  for (const f of API_KEY_FIELDS) s.push(f.label, f.feeds, f.withoutIt, f.getKeySteps, ...(f.choices || []).map((c) => c.label));
  const file = { settings: { enabled: true, time: '07:00', timeZone: 'UTC', questions: [], watchlistId: '' } } as never;
  s.push(nextRunText(file, new Date('2026-11-08T05:00:00Z')), nextRunText(file, new Date('2026-11-08T09:00:00Z')));
  for (const raw of ['not json', '{}']) {
    const r = parseBackup(raw);
    if (!r.ok) s.push(r.error);
  }
  const untranslated = s.filter((x) => tx(x) === x);
  assert.deepEqual(untranslated, [], 'Settings text with no Spanish');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('fr', FR, FR_TEXT);
  const fx = (x: string) => translateText(x, 'fr');
  assert.deepEqual(s.filter((x) => !SAME_IN_FRENCH.has(x) && fx(x) === x), [], 'Settings text with no French');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('pt', PT, PT_TEXT);
  const px = (x: string) => translateText(x, 'pt');
  assert.deepEqual(s.filter((x) => !SAME_IN_PORTUGUESE.has(x) && px(x) === x), [], 'Settings text with no Portuguese');
});

test('help and glossary: every glossary entry, chart guide, panel introduction and the glossary page have Spanish, French and Portuguese', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  const tx = (x: string) => translateText(x, 'es');
  const { GLOSSARY, GLOSSARY_GROUPS, PANEL_INTROS, glossaryMarkdown } = await import('../src/data/glossary');
  const { CHART_GUIDES } = await import('../src/data/chartGuides');
  const s: string[] = [...Object.values(GLOSSARY_GROUPS), ...PANEL_INTROS.map((p) => p.intro)];
  for (const e of GLOSSARY) s.push(e.term, e.what, e.why, ...(e.read ? [e.read] : []), ...(e.limits ? [e.limits] : []));
  for (const g of Object.values(CHART_GUIDES)) s.push(g.read, g.life);
  const untranslated = s.filter((x) => tx(x) === x);
  assert.deepEqual(untranslated, [], 'help text with no Spanish');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('fr', FR, FR_TEXT);
  const fx = (x: string) => translateText(x, 'fr');
  assert.deepEqual(s.filter((x) => !SAME_IN_FRENCH.has(x) && fx(x) === x), [], 'help text with no French');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('pt', PT, PT_TEXT);
  const px = (x: string) => translateText(x, 'pt');
  assert.deepEqual(s.filter((x) => !SAME_IN_PORTUGUESE.has(x) && px(x) === x), [], 'help text with no Portuguese');
  assert.ok(glossaryMarkdown(px).startsWith('# Glossário'), 'the glossary page title is Portuguese');
  const page = glossaryMarkdown(tx);
  assert.ok(page.startsWith('# Glosario'), 'the glossary page title is Spanish');
  assert.ok(!page.includes('**Why it matters.**'), 'the glossary page labels are Spanish');
  assert.equal(glossaryMarkdown(), glossaryMarkdown((x) => x), 'the English page is unchanged');
});

test('Council chat cards: assumptions, re-run notes, explanation lenses, chart controls and reasons have Spanish', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  const tx = (x: string) => translateText(x, 'es');
  const { APPROVAL_ASSUMPTIONS } = await import('../src/components/CouncilApprovalCard');
  const { TEST_TITLE } = await import('../src/utils/councilChart');
  const { TRANSFORM_LABEL } = await import('../src/utils/stats');
  const s: string[] = [];
  for (const a of APPROVAL_ASSUMPTIONS) s.push(a.label);
  s.push(APPROVAL_ASSUMPTIONS.find((a) => a.id === 'fxReserveAdequacyMonths')!.fmt(4.5), APPROVAL_ASSUMPTIONS.find((a) => a.id === 'brentCrudeShockUsd')!.fmt(10), APPROVAL_ASSUMPTIONS.find((a) => a.id === 'chokepointTransitDropPct')!.fmt(20));
  for (const t of Object.values(TEST_TITLE)) s.push(t.replace(/ \(.*\)$/, '').replace(/^Is the relationship stable\?/, 'Rolling correlation'));
  for (const k of ['level', 'change', 'yoy', 'index100', 'zscore'] as const) s.push(TRANSFORM_LABEL[k]);
  s.push(
    'Same answer, word for word.',
    'Different answer: the headline changed, 2 sentence(s) new, 1 gone.',
    'The sampling changed: temperature 0.2, seed 7 then; temperature 0, seed 7 now.',
    '3 figure(s) differ between the two runs.',
    'Monetary policy',
    'Fiscal Agent had no figures',
    'the summary did not cover it',
    'No AI model answered: no model is set up. Set it up or test it under Menu > Settings > AI model.',
    'The agents found no figures to answer with, so there is nothing to summarise.',
    'public investment',
  );
  const untranslated = s.filter((x) => tx(x) === x);
  assert.deepEqual(untranslated, [], 'chat card text with no Spanish');
  { const { FR, FR_TEXT } = await import('../src/i18n/fr'); attachLanguage('fr', FR, FR_TEXT); }
  const fx = (x: string) => translateText(x, 'fr');
  const noFrench = s.filter((x) => !SAME_IN_FRENCH.has(x) && fx(x) === x);
  assert.deepEqual(noFrench, [], 'chat card text with no French');
  { const { PT, PT_TEXT } = await import('../src/i18n/pt'); attachLanguage('pt', PT, PT_TEXT); }
  const px = (x: string) => translateText(x, 'pt');
  const noPortuguese = s.filter((x) => !SAME_IN_PORTUGUESE.has(x) && px(x) === x);
  assert.deepEqual(noPortuguese, [], 'chat card text with no Portuguese');
  const { splitSettingsLinks } = await import('../src/utils/settingsLinks');
  const parts = splitSettingsLinks(tx('No AI model answered: no model is set up. Set it up or test it under Menu > Settings > AI model.'));
  assert.ok(parts.some((p) => typeof p !== 'string' && p.page === 'ai'), 'the Spanish Settings link still opens the AI model page');
});

test('Reports pages: review steps, levers, lenses, memo types and section headings have Spanish, French and Portuguese', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  attachLanguage('es', ES, ES_TEXT);
  const tx = (x: string) => translateText(x, 'es');
  const { STEP_LABEL, STEP_HINT, STEP_STATE_LABEL } = await import('../src/utils/policyReview');
  const { LEVER_LABEL, LENS_LABEL } = await import('../src/utils/reviewOptions');
  const { GOAL_MOVE_LABEL } = await import('../src/utils/reviewOutcomes');
  const { COUNCIL_SECTIONS } = await import('../src/utils/askCouncil');
  const { AUDIENCE_INFO, sectionLabels } = await import('../src/components/IcMemoBuilder');
  const s: string[] = [
    ...Object.values(STEP_LABEL),
    ...Object.values(STEP_HINT),
    ...Object.values(STEP_STATE_LABEL),
    ...Object.values(LEVER_LABEL),
    ...Object.values(LENS_LABEL),
    ...Object.values(GOAL_MOVE_LABEL),
    ...Object.values(COUNCIL_SECTIONS),
  ];
  for (const [a, info] of Object.entries(AUDIENCE_INFO)) {
    s.push(info.tab, info.heading, info.help, ...Object.values(sectionLabels(a as keyof typeof AUDIENCE_INFO)));
  }
  // Words spelled the same in both languages.
  const SAME = new Set(['Fiscal']);
  const untranslated = [...new Set(s)].filter((x) => !SAME.has(x) && tx(x) === x);
  assert.deepEqual(untranslated, [], 'Reports text with no Spanish');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  attachLanguage('fr', FR, FR_TEXT);
  const fx = (x: string) => translateText(x, 'fr');
  assert.deepEqual([...new Set(s)].filter((x) => !SAME_IN_FRENCH.has(x) && fx(x) === x), [], 'Reports text with no French');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('pt', PT, PT_TEXT);
  const px = (x: string) => translateText(x, 'pt');
  assert.deepEqual([...new Set(s)].filter((x) => !SAME_IN_PORTUGUESE.has(x) && px(x) === x), [], 'Reports text with no Portuguese');
});

// French (FR1 to FR4). Areas arrive in parts; an area not translated yet shows in English, but
// every area that is here must be complete, and the parts done so far must stay here.
test('every French message file is complete, keeps every placeholder and matches an English file', async () => {
  const { FR } = await import('../src/i18n/fr');
  const byArea = new Map(ALL_CATALOGS.map((c) => [c.area, c]));
  for (const area of ['shell', 'common', 'workspace', 'council', 'chat', 'research', 'brief', 'panels', 'watchlist', 'ownData', 'gapModel', 'yourTests', 'tools', 'menu', 'reports']) assert.ok(FR[area], `${area} has no French in src/i18n/fr/index.ts`);
  for (const [area, french] of Object.entries(FR)) {
    const c = byArea.get(area);
    assert.ok(c, `French for ${area}, which has no English file in src/i18n/messages/index.ts`);
    for (const [key, en] of Object.entries(c!.en)) {
      const fr = french[key];
      assert.ok(fr && fr.trim(), `${area}.${key} has no French`);
      assert.deepEqual(placeholders(fr), placeholders(en), `${area}.${key} changes the placeholders`);
      if (en.length > 3 && !SAME_IN_FRENCH.has(en)) assert.notEqual(fr, en, `${area}.${key} is still English`);
    }
    for (const key of Object.keys(french)) assert.ok(key in c!.en, `${area}.${key} is in French only`);
  }
});

test('French sentences swapped at display time are known English sentences, keep their placeholders and are translated', async () => {
  const { FR_TEXT } = await import('../src/i18n/fr');
  const { ES_TEXT } = await import('../src/i18n/es');
  const { MISSING_FR } = await import('../src/i18n/fr/missing');
  const { MISSING_ES } = await import('../src/i18n/es/missing');
  // Every Missing reason the app can give (the Spanish list is checked against the app above).
  for (const en of Object.keys(MISSING_ES)) assert.ok(en in MISSING_FR, `no French for: ${en}`);
  for (const [en, fr] of Object.entries(FR_TEXT)) {
    assert.ok(en in ES_TEXT, `French for a sentence the app does not build: ${en}`);
    assert.deepEqual(placeholders(fr), placeholders(en), `placeholders changed in: ${en}`);
    if (en.length > 3 && !SAME_IN_FRENCH.has(en)) assert.notEqual(fr, en, `not translated: ${en}`);
  }
});

test('French uses the formal "vous" throughout, never "tu"', async () => {
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  const all = [...Object.values(FR).flatMap((d) => Object.values(d)), ...Object.values(FR_TEXT)];
  // "ton" is left out: it is also the noun "tone" (le ton de l'actualité).
  const informal = /(^|[\s'’(«-])(tu|toi|te|t’|t')(?=[\s,.;:!?»)]|$)/i;
  const found = all.filter((s) => informal.test(s));
  assert.deepEqual(found, [], 'informal French');
});

test('French loads on its own: it does not change the Spanish, and English stays English', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { FR, FR_TEXT } = await import('../src/i18n/fr');
  const { ES, ES_TEXT } = await import('../src/i18n/es');
  const { SHELL } = await import('../src/i18n/messages/shell');
  attachLanguage('es', ES, ES_TEXT);
  attachLanguage('fr', FR, FR_TEXT);
  assert.equal(translate(SHELL, 'fr', 'research'), 'Recherche');
  assert.equal(translate(SHELL, 'es', 'research'), ES.shell!.research);
  assert.equal(translate(SHELL, 'en', 'research'), 'Research');
  assert.equal(translateText('Needs setup', 'fr'), 'À configurer');
  assert.equal(translateText('Needs setup', 'es'), 'Por configurar');
  assert.equal(translateText('{num} months of imports'.replace('{num}', '4.2'), 'fr'), "4.2 mois d'importations");
  assert.equal(translateText('Brazil: inflation 4.6% against a 3.0% target.', 'fr'), 'Brazil : inflation de 4.6% pour une cible de 3.0%.');
  // An area with no French yet falls back to English, never to Spanish or a bare key.
  const later = defineMessages('demo-fr-later', { a: 'Apple' }, { a: 'Manzana' });
  assert.equal(translate(later, 'fr', 'a'), 'Apple');
});

test('the French file is its own download: it imports nothing from the Spanish', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  for (const f of readdirSync('src/i18n/fr')) assert.doesNotMatch(readFileSync(`src/i18n/fr/${f}`, 'utf8'), /from '\.\.\/es/, `${f} imports Spanish`);
});

// Portuguese (U2, Brazilian, polite "você"). Areas arrive in parts like the French; an area not
// translated yet shows in English, but every area that is here must be complete.
const PT_AREAS = ['shell', 'common', 'workspace', 'council', 'chat', 'research', 'brief', 'panels', 'watchlist', 'ownData', 'gapModel', 'yourTests', 'tools', 'menu', 'reports'];

test('every Portuguese message file is complete, keeps every placeholder and matches an English file', async () => {
  const { PT } = await import('../src/i18n/pt');
  const byArea = new Map(ALL_CATALOGS.map((c) => [c.area, c]));
  for (const area of PT_AREAS) assert.ok(PT[area], `${area} has no Portuguese in src/i18n/pt/index.ts`);
  for (const [area, pt] of Object.entries(PT)) {
    const c = byArea.get(area);
    assert.ok(c, `Portuguese for ${area}, which has no English file in src/i18n/messages/index.ts`);
    for (const [key, en] of Object.entries(c!.en)) {
      const tr = pt[key];
      if (en === '') continue;
      assert.ok(tr && tr.trim(), `${area}.${key} has no Portuguese`);
      assert.deepEqual(placeholders(tr), placeholders(en), `${area}.${key} changes the placeholders`);
      assert.equal(/^\s/.test(tr), /^\s/.test(en), `${area}.${key} loses or adds a leading space`);
      assert.equal(/\s$/.test(tr), /\s$/.test(en), `${area}.${key} loses or adds a trailing space`);
      if (en.length > 3 && !SAME_IN_PORTUGUESE.has(en) && !/^AI: /.test(en)) assert.notEqual(tr, en, `${area}.${key} is still English`);
    }
    for (const key of Object.keys(pt)) assert.ok(key in c!.en, `${area}.${key} is in Portuguese only`);
  }
});

test('Portuguese sentences swapped at display time are known English sentences, and every Missing reason has Portuguese', async () => {
  const { PT_TEXT } = await import('../src/i18n/pt');
  const { ES_TEXT } = await import('../src/i18n/es');
  const { MISSING_ES } = await import('../src/i18n/es/missing');
  const { MISSING_PT } = await import('../src/i18n/pt/missing');
  for (const en of Object.keys(MISSING_ES)) assert.ok(en in MISSING_PT, `no Portuguese for: ${en}`);
  for (const [en, pt] of Object.entries(PT_TEXT)) {
    assert.ok(en in ES_TEXT, `Portuguese for a sentence the app does not build: ${en}`);
    assert.deepEqual(placeholders(pt), placeholders(en), `placeholders changed in: ${en}`);
    if (en.length > 3 && !SAME_IN_PORTUGUESE.has(en)) assert.notEqual(pt, en, `not translated: ${en}`);
  }
});

test('Portuguese Council chat cards and reasons swap, and the Settings link still opens its page', async () => {
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  attachLanguage('pt', PT, PT_TEXT);
  const px = (x: string) => translateText(x, 'pt');
  const { APPROVAL_ASSUMPTIONS } = await import('../src/components/CouncilApprovalCard');
  const s: string[] = APPROVAL_ASSUMPTIONS.map((a) => a.label);
  s.push(
    APPROVAL_ASSUMPTIONS.find((a) => a.id === 'fxReserveAdequacyMonths')!.fmt(4.5),
    'Same answer, word for word.',
    'Different answer: the headline changed, 2 sentence(s) new, 1 gone.',
    '3 figure(s) differ between the two runs.',
    'Fiscal Agent had no figures',
    'No AI model answered: no model is set up. Set it up or test it under Menu > Settings > AI model.',
    'Needs setup',
  );
  assert.deepEqual(s.filter((x) => px(x) === x), [], 'chat card text with no Portuguese');
  const { splitSettingsLinks } = await import('../src/utils/settingsLinks');
  const parts = splitSettingsLinks(px('No AI model answered: no model is set up. Set it up or test it under Menu > Settings > AI model.'));
  assert.ok(parts.some((p) => typeof p !== 'string' && p.page === 'ai'), 'the Portuguese Settings link still opens the AI model page');
  assert.equal(px('Needs setup'), 'Precisa de configuração');
});

test('Portuguese uses "você", never "tu" or "o senhor"', async () => {
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  const all = [...Object.values(PT).flatMap((d) => Object.values(d)), ...Object.values(PT_TEXT)];
  const informal = /(^|[\s(“"-])(tu|teu|tua|teus|tuas|contigo|o senhor|a senhora|vós)(?=[\s,.;:!?”")]|$)/i;
  assert.deepEqual(all.filter((x) => informal.test(x)), [], 'Portuguese not in the "você" register');
});

test('the Portuguese file is its own download: it imports nothing from the Spanish or French, and English stays English', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  for (const f of readdirSync('src/i18n/pt')) assert.doesNotMatch(readFileSync(`src/i18n/pt/${f}`, 'utf8'), /from '\.\.\/(es|fr)/, `${f} imports another language`);
  const { attachLanguage, translateText } = await import('../src/i18n/lang');
  const { PT, PT_TEXT } = await import('../src/i18n/pt');
  const { SHELL } = await import('../src/i18n/messages/shell');
  attachLanguage('pt', PT, PT_TEXT);
  assert.equal(translate(SHELL, 'pt', 'research'), 'Pesquisa');
  assert.equal(translateText('Brazil: inflation 4.6% against a 3.0% target.', 'pt'), 'Brazil: inflação de 4.6% para uma meta de 3.0%.');
  assert.equal(translate(SHELL, 'en', 'research'), 'Research');
  const later = defineMessages('demo-pt-later', { a: 'Apple' }, { a: 'Manzana' });
  assert.equal(translate(later, 'pt', 'a'), 'Apple', 'an area with no Portuguese yet falls back to English, never Spanish');
});
