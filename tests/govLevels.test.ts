import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// An empty data folder, as on a first run (read by the download below).
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gov-levels-'));

const gl = await import('../src/utils/govLevels.ts');
const { govLevelRows, economistBrief } = await import('../src/utils/countryNotes.ts');
const { buildBaselineOpenData } = await import('../src/data/presetsAndBaselines.ts');
const { figureHelp } = await import('../src/data/glossary.ts');
const { DATA_LICENCES } = await import('../src/data/dataLicences.ts');
const { planCouncil, runCouncil } = await import('../src/utils/askCouncil.ts');
const { checkConnections } = await import('../src/utils/connectionCheck.ts');
type Item = import('../src/types/council.ts').WatchlistItem;
type Run = import('../src/types/council.ts').CouncilAssessmentRun;

// DBnomics IMF GFSMAB layout (% of GDP unit): Brazil with all levels, Japan with central and local, Mexico central only.
// A domestic-currency copy of a Brazil series must not be read as a share.
const doc = (code: string, period: string[], value: Array<number | string>) => ({ series_code: code, period, value });
const DBN = {
  series: {
    docs: [
      doc('A.BR.S1311.XDC_R_B1GQ.G2M__Z', ['2022', '2023'], [24.1, 25.0]),
      doc('A.BR.S1312.XDC_R_B1GQ.G2M__Z', ['2022', '2023'], [11.9, 12.2]),
      doc('A.BR.S1313.XDC_R_B1GQ.G2M__Z', ['2022', '2023'], [7.0, 'NA']),
      doc('A.BR.S1314.XDC_R_B1GQ.G2M__Z', ['2023'], [0.0000001]),
      doc('A.BR.S13.XDC_R_B1GQ.G2M__Z', ['2022', '2023'], [38.5, 39.0]),
      doc('A.BR.S1311.XDC_R_B1GQ.G1__Z', ['2023'], [22.4]),
      doc('A.BR.S1312.XDC_R_B1GQ.G1__Z', ['2023'], [10.1]),
      doc('A.JP.S1311.XDC_R_B1GQ.G2M__Z', ['2021'], [16.0]),
      doc('A.JP.S1313.XDC_R_B1GQ.G2M__Z', ['2021'], [12.0]),
      doc('A.MX.S1311.XDC_R_B1GQ.G2M__Z', ['2023'], [25.0]),
      doc('A.MX.S1314.XDC_R_B1GQ.G2M__Z', ['2023'], [3.0]),
      doc('A.XX.S1311.XDC_R_B1GQ.G2M__Z', ['2023'], [1]),
      doc('A.BR.S1311.XDC.G2M__Z', ['2024'], [5000000]),
    ],
  },
};
// Eurostat JSON-stat for gov_10a_main: Germany, sectors central and state, total expenditure, two years.
const EURO = {
  id: ['freq', 'unit', 'sector', 'na_item', 'geo', 'time'],
  size: [1, 1, 2, 1, 1, 2],
  dimension: {
    sector: { category: { index: { S1311: 0, S1312: 1 } } },
    na_item: { category: { index: { TE: 0 } } },
    geo: { category: { index: { DE: 0 } } },
    time: { category: { index: { '2023': 0, '2024': 1 } } },
  },
  value: { '0': 12.0, '1': 12.4, '2': 11.0, '3': 11.3 },
};

test('IMF GFS through DBnomics: the newest year with central and another level; scale errors dropped; catalogue codes only', () => {
  assert.equal(gl.imfLevelSeriesId('BR', 'state', 'revenue'), 'IMF/GFSMAB/A.BR.S1312.XDC_R_B1GQ.G1__Z');
  assert.equal(gl.imfLevelIds(['BR']).length, 10);
  const r = gl.parseDbnomicsLevels(DBN, { BR: 'BRA', JP: 'JPN', MX: 'MEX' });
  assert.deepEqual(r.BRA.spending, { year: '2023', table: 'imf', pct: { central: 25, state: 12.2, general: 39 } });
  assert.deepEqual(r.BRA.revenue!.pct, { central: 22.4, state: 10.1 });
  assert.equal(r.JPN.spending!.year, '2021');
  assert.deepEqual(r.MEX.spending!.pct, { central: 25, social: 3 });
  assert.equal(Object.keys(r).length, 3);
  assert.deepEqual(gl.parseDbnomicsLevels({ nope: 1 }, {}), {});
});

test('Eurostat gov_10a_main and the merge: the newer year wins, Eurostat on a tie', () => {
  assert.match(gl.eurostatLevelsUrl(['DE'], 2016), /gov_10a_main\?geo=DE&sector=S1311&sector=S1312&sector=S1313&sector=S1314&sector=S13&na_item=TR&na_item=TE&unit=PC_GDP&sinceTimePeriod=2016&format=JSON$/);
  const e = gl.parseEurostatLevels(EURO, { DE: 'DEU' });
  assert.deepEqual(e.DEU.spending, { year: '2024', table: 'eurostat', pct: { central: 12.4, state: 11.3 } });
  const imf = { DEU: { spending: { year: '2024', table: 'imf' as const, pct: { central: 1, state: 1 } } } };
  assert.equal(gl.mergeLevels(e, imf).DEU.spending!.table, 'eurostat', 'tie goes to Eurostat');
  const newer = { DEU: { spending: { year: '2025', table: 'imf' as const, pct: { central: 1, local: 1 } } } };
  assert.equal(gl.mergeLevels(e, newer).DEU.spending!.year, '2025');
});

test('words: each level as % of GDP and the state and local share of the levels, labelled', () => {
  const f = { year: '2023', table: 'imf' as const, pct: { central: 25, state: 12.2, local: 5, general: 39 } };
  assert.equal(gl.subNationalShare(f), 41);
  assert.equal(gl.levelsValue(f), "central 25.0%, state 12.2%, local 5.0% of GDP (2023); state and local 41% of the levels' total");
  assert.equal(gl.subNationalShare({ year: '2023', table: 'imf', pct: { central: 25, social: 3 } }), undefined);
});

const run = (tweak: (s: ReturnType<typeof buildBaselineOpenData>) => void = () => {}) => {
  const s = buildBaselineOpenData('BRA');
  s.dataStatus = { verifiedLiveSources: [], checkedAt: '2026-11-12T12:00:00Z' };
  s.liveFields = {};
  tweak(s);
  return s;
};

test('brief rows under Fiscal and debt, or Missing with a reason', () => {
  const r = gl.parseDbnomicsLevels(DBN, { BR: 'BRA', JP: 'JPN', MX: 'MEX' });
  const s = run((x) => (x.govLevels = { pulledAt: '2026-11-12T03:00:00Z', reading: r.BRA }));
  const g = economistBrief({ iso3: 'BRA', countryName: 'Brazil', openData: s } as unknown as Run).groups.find((x) => x.title === 'Fiscal and debt')!;
  const sp = g.rows.find((x) => x.label === 'Spending by level of government')!;
  assert.match(sp.value, /^central 25\.0%, state 12\.2% of GDP \(2023\); state and local 33% of the levels' total$/);
  assert.match(sp.source, /IMF Government Finance Statistics.*before transfers between levels are netted out/);
  assert.ok(figureHelp(sp.label));
  const none = govLevelRows(run());
  assert.equal(none[0].source, 'Eurostat and IMF files not downloaded yet');
  assert.equal(govLevelRows(run((x) => (x.govLevels = { pulledAt: 'x' })))[0].source, 'Not in the Eurostat or IMF figures');
  assert.equal(govLevelRows(run((x) => (x.govLevels = { pulledAt: 'x', reading: r.MEX })))[0].source, 'No state or local figures published');
  assert.ok(none.every((x) => x.missing && x.value === 'Missing'));
});

test('the council: the Fiscal & Debt Agent quotes spending by level when state or local figures exist', () => {
  const r = gl.parseDbnomicsLevels(DBN, { BR: 'BRA', MX: 'MEX' });
  const item = (reading: unknown) => ({ iso3: 'BRA', countryName: 'Brazil', fiscal: { debtPctGdp: { value: 87, year: '2025' } }, govLevels: { pulledAt: 'x', reading } }) as unknown as Item;
  const q = 'Is Brazil debt sustainable?';
  const f = runCouncil(q, planCouncil(q, [item(r.BRA)]), [item(r.BRA)]).find((a) => a.id === 'fiscal')!.findings[0];
  assert.ok(f.figures.some((x) => x.label === 'Spending by level of government' && x.tag === 'official'));
  const m = runCouncil(q, planCouncil(q, [item(r.MEX)]), [item(r.MEX)]).find((a) => a.id === 'fiscal')!.findings[0];
  assert.ok(!m.figures.some((x) => x.label === 'Spending by level of government'));
});

test('licence rows and the Data health row, which counts countries with state or local figures', async () => {
  assert.match(DATA_LICENCES.find((r) => r.id === 'imf')!.usedFor, /level of government/);
  assert.match(DATA_LICENCES.find((r) => r.id === 'eurostat')!.usedFor, /gov_10a_main/);
  const rep = await checkConnections({ env: {}, only: ['imf_gov_levels'], fetchFn: async () => new Response(JSON.stringify(DBN), { status: 200 }) } as never);
  assert.equal(rep.results[0].state, 'connected');
  assert.match(rep.results[0].sample || '', /Central government spending for 4 of \d+ countries; state or local spending for 2 \(BR, JP\)/);
});

test('the download: saved to data/live, kept when a later run fails, read back from disk', async () => {
  const mod = await import('../src/server/feeds/govLevels.ts');
  mod.resetGovLevelsForTests();
  const realFetch = globalThis.fetch;
  let down = false;
  const asked: string[] = [];
  globalThis.fetch = (async (input: unknown) => {
    const url = String(input);
    asked.push(url);
    if (down) return new Response('busy', { status: 503 });
    return new Response(JSON.stringify(url.includes('eurostat') ? EURO : DBN), { status: 200 });
  }) as typeof fetch;
  try {
    const p = (await mod.fetchGovLevels())!;
    assert.equal(p.countries.BRA.spending!.pct.state, 12.2);
    assert.equal(p.countries.DEU.spending!.table, 'eurostat');
    assert.ok(asked.some((u) => u.includes('gov_10a_main')) && asked.some((u) => u.includes('GFSMAB')));
    const n = asked.length;
    await mod.fetchGovLevels();
    assert.equal(asked.length, n, 'a fresh copy is not downloaded again');
    down = true;
    assert.equal((await mod.fetchGovLevels({ force: true }))!.countries.JPN.spending!.year, '2021', 'a failed run keeps the copy');
    mod.resetGovLevelsForTests();
    assert.ok(mod.loadGovLevels()!.countries.MEX, 'read back from disk');
    assert.ok(fs.existsSync(path.join(process.env.DATA_DIR!, 'live', 'gov-levels.json')));
  } finally {
    globalThis.fetch = realFetch;
  }
});

// DBnomics' description of GFSMAB: units as an object, items as [code, label] pairs.
const DS = (unit: Record<string, string>) => ({
  datasets: {
    docs: [
      {
        code: 'GFSMAB',
        dimensions_values_labels: {
          FREQ: { A: 'Annual' },
          UNIT: unit,
          INDICATOR: [
            ['G1__Z', 'Revenue'],
            ['G2__Z', 'Expense'],
            ['G2M__Z', 'Expenditure'],
            ['G24__Z', 'Interest expense'],
          ],
        },
      },
    ],
  },
});

test('the GFSMAB description: the unit labelled as a percent of GDP and the revenue and expenditure items', () => {
  const p = gl.pickGfsCodes(DS({ XDC: 'Domestic currency', POGDP_PT: 'Percent of GDP' }));
  assert.deepEqual(p.codes, { unit: 'POGDP_PT', revenue: 'G1__Z', spending: 'G2M__Z' });
  assert.deepEqual(p.units, ['XDC (Domestic currency)', 'POGDP_PT (Percent of GDP)']);
  assert.equal(gl.pickGfsCodes(DS({ XDC: 'Domestic currency' })).codes.unit, undefined, 'no % of GDP unit: none picked');
  assert.deepEqual(gl.pickGfsCodes({ nope: 1 }), { codes: {}, units: [] });
  const r = gl.parseDbnomicsLevels({ series: { docs: [doc('A.BR.S1311.POGDP_PT.G2M__Z', ['2023'], [25]), doc('A.BR.S1312.POGDP_PT.G2M__Z', ['2023'], [12])] } }, { BR: 'BRA' }, { unit: 'POGDP_PT', revenue: 'G1__Z', spending: 'G2M__Z' });
  assert.deepEqual(r.BRA.spending!.pct, { central: 25, state: 12 });
});

test('the download asks again with the codes from the GFSMAB description when the first codes bring nothing', async () => {
  const mod = await import('../src/server/feeds/govLevels.ts');
  mod.resetGovLevelsForTests();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: unknown) => {
    const url = decodeURIComponent(String(input));
    if (url.includes('eurostat')) return new Response('busy', { status: 503 });
    if (url.endsWith('/datasets/IMF/GFSMAB')) return new Response(JSON.stringify(DS({ XDC: 'Domestic currency', POGDP_PT: 'Percent of GDP' })), { status: 200 });
    const docs = url.includes('POGDP_PT') ? [doc('A.BR.S1311.POGDP_PT.G2M__Z', ['2023'], [25]), doc('A.BR.S1313.POGDP_PT.G2M__Z', ['2023'], [6])] : [];
    return new Response(JSON.stringify({ series: { docs } }), { status: 200 });
  }) as typeof fetch;
  try {
    const p = (await mod.fetchGovLevels({ force: true }))!;
    assert.deepEqual(p.countries.BRA.spending!.pct, { central: 25, local: 6 });
  } finally {
    globalThis.fetch = realFetch;
    mod.resetGovLevelsForTests();
  }
});

test('connection check: no GFSMAB series back is not OK, and the codes DBnomics holds are listed', async () => {
  const fetchFn = async (u: string) =>
    new Response(
      JSON.stringify(
        u.includes('/series/IMF/GFSMAB?dimensions=')
          ? {
              series: {
                docs: [
                  { series_code: 'A.BR.S1311.XDC.G24__Z', series_name: 'Annual – Brazil – Central government – Domestic currency – Interest expense' },
                  { series_code: 'A.BR.S1311.XDC.G2M__Z', series_name: 'Annual – Brazil – Central government – Domestic currency – Expenditure' },
                  { series_code: 'A.BR.S1311.XDC.G1__Z', series_name: 'Annual – Brazil – Central government – Domestic currency – Revenue' },
                ],
              },
            }
          : u.endsWith('/datasets/IMF/GFSMAB')
            ? DS({ XDC: 'Domestic currency' })
            : { series: { docs: [] } }
      ),
      { status: 200 }
    );
  const row = (await checkConnections({ env: {}, only: ['imf_gov_levels'], fetchFn } as never)).results[0];
  assert.equal(row.state, 'bad_reply');
  assert.match(row.detail, /none of the \d+ GFSMAB series the app asks for \(for example IMF\/GFSMAB\/A\.BR\.S1311\.XDC_R_B1GQ\.G2M__Z\) came back/);
  assert.match(row.detail, /unit none labelled as a percent of GDP, revenue G1__Z, expenditure G2M__Z; units listed: XDC \(Domestic currency\)/);
  assert.match(row.detail, /DBnomics holds: A\.BR\.S1311\.XDC\.G2M__Z \(.*Expenditure\); A\.BR\.S1311\.XDC\.G1__Z .*; A\.BR\.S1311\.XDC\.G24__Z/);
});

test('connection check: the % of GDP unit from the description is tried and named', async () => {
  const fetchFn = async (u: string) => {
    const url = decodeURIComponent(u);
    if (url.endsWith('/datasets/IMF/GFSMAB')) return new Response(JSON.stringify(DS({ XDC: 'Domestic currency', POGDP_PT: 'Percent of GDP' })), { status: 200 });
    const docs = url.includes('POGDP_PT') ? [{ series_code: 'A.BR.S1311.POGDP_PT.G2M__Z', value: [25] }] : [];
    return new Response(JSON.stringify({ series: { docs } }), { status: 200 });
  };
  const row = (await checkConnections({ env: {}, only: ['imf_gov_levels'], fetchFn } as never)).results[0];
  assert.equal(row.state, 'connected');
  assert.match(row.sample || '', /Central government spending for 1 of \d+ countries.*Uses IMF\/GFSMAB\/A\.BR\.S1311\.POGDP_PT\.G2M__Z/);
});
