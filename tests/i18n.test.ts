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
});

test('Menu dialogs: every key and setting in Settings has Spanish, and so do backup and morning brief lines', async () => {
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
});
