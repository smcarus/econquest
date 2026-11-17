import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import {
  ecbCurveUrl,
  ecbMaturity,
  fitNss,
  fullCurveReading,
  mergeDays,
  nssYield,
  parDuration,
  parseEcbCurveCsv,
  parseUstCsv,
  ustMaturity,
  defaultCurveArea,
  CURVE_KEEP_DAYS,
  type CurveDay,
} from '../src/utils/fullCurves';

const UST = `Date,"1 Mo","1.5 Month","2 Mo","3 Mo","4 Mo","6 Mo","1 Yr","2 Yr","3 Yr","5 Yr","7 Yr","10 Yr","20 Yr","30 Yr"
11/14/2026,4.05,4.04,4.02,4.00,3.98,3.92,3.80,3.55,3.52,3.60,3.75,3.95,4.35,4.40
11/13/2026,4.06,,4.03,4.01,3.99,3.93,3.82,3.60,3.55,3.62,3.77,3.97,4.36,4.41
`;

test('maturity labels', () => {
  assert.equal(ustMaturity('"3 Mo"'), 0.25);
  assert.equal(ustMaturity('1.5 Month'), 0.125);
  assert.equal(ustMaturity('10 Yr'), 10);
  assert.equal(ustMaturity('Date'), null);
  assert.equal(ecbMaturity('SR_3M'), 0.25);
  assert.equal(ecbMaturity('SR_10Y'), 10);
  assert.equal(ecbMaturity('SR_1Y6M'), 1.5);
  assert.equal(ecbMaturity('BETA0'), null);
});

test('Treasury CSV: days oldest first, blanks skipped, MM/DD/YYYY to ISO', () => {
  const days = parseUstCsv(UST) as CurveDay[];
  assert.equal(days.length, 2);
  assert.equal(days[0].date, '2026-11-13');
  assert.equal(days[1].yields['10'], 3.95);
  assert.equal(days[1].yields['0.25'], 4);
  assert.equal(days[0].yields['0.125'], undefined);
  assert.ok('reason' in (parseUstCsv('x,y\n1,2') as object));
});

test('ECB csvdata: one row per series and day, merged by day', () => {
  const csv = ['KEY,FREQ,REF_AREA,DATA_TYPE_FM,TIME_PERIOD,OBS_VALUE', 'YC.B.U2.EUR.4F.G_N_C.SV_C_YM.SR_2Y,B,U2,SR_2Y,2026-11-13,2.1', 'YC.B.U2.EUR.4F.G_N_C.SV_C_YM.SR_10Y,B,U2,SR_10Y,2026-11-13,2.9', 'YC.B.U2.EUR.4F.G_N_C.SV_C_YM.SR_10Y,B,U2,SR_10Y,2026-11-12,2.95'].join('\n');
  const days = parseEcbCurveCsv(csv) as CurveDay[];
  assert.deepEqual(days.map((d) => d.date), ['2026-11-12', '2026-11-13']);
  assert.deepEqual(days[1].yields, { '2': 2.1, '10': 2.9 });
  assert.ok('reason' in (parseEcbCurveCsv('a,b\n1,2') as object));
  const many = Array.from({ length: CURVE_KEEP_DAYS + 5 }, (_, i) => ({ date: `2025-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, yields: { '1': i } }));
  assert.equal(mergeDays(many, []).length, CURVE_KEEP_DAYS);
});

test('Nelson-Siegel-Svensson fit recovers a known curve', () => {
  const truth = { b0: 4, b1: -1, b2: 1.5, b3: -0.8, t1: 1.4, t2: 6 };
  const ms = [0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30];
  const fit = fitNss(ms.map((m) => ({ m, y: nssYield(truth, m) })))!;
  assert.ok(fit.rmseBp < 1, `fit gap ${fit.rmseBp} bp`);
  for (const m of [1.5, 4, 15]) assert.ok(Math.abs(nssYield(fit, m) - nssYield(truth, m)) < 0.03);
  assert.equal(fitNss(ms.slice(0, 5).map((m) => ({ m, y: 3 }))), null);
  assert.ok(Math.abs(parDuration(10, 0) - 10) < 1e-9);
  assert.ok(parDuration(10, 4) < 10 && parDuration(10, 4) > 7);
});

test('reading: factors, moves, carry and roll-down; Missing when not downloaded', () => {
  const days = parseUstCsv(UST) as CurveDay[];
  const r = fullCurveReading({ area: 'us', days }, '2026-11-14T22:00:00Z');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.kind, 'par');
  assert.equal(r.date, '2026-11-14');
  assert.deepEqual(r.factors && { level: r.factors.level, slope: r.factors.slope, curvature: r.factors.curvature }, { level: 3.95, slope: 0.4, curvature: -0.3 });
  assert.equal(r.factors!.d1!.slope, 3);
  const ten = r.points.find((p) => p.m === 10)!;
  assert.equal(ten.label, '10Y');
  assert.equal(ten.d1, -2);
  assert.ok(Math.abs(ten.carry! + 1.25) <= 0.051); // (3.95 - 4.00) x 0.25 x 100, to 0.1 bp
  assert.ok(typeof ten.roll === 'number');
  assert.equal(r.points.find((p) => p.m === 0.25)!.carry, undefined);
  const none = fullCurveReading({ area: 'ea', days: [] });
  assert.ok(!none.ok && /ECB curve has not been downloaded/.test(none.reason));
  assert.equal(defaultCurveArea('DEU'), 'ea');
  assert.equal(defaultCurveArea('BRA'), 'us');
});

test('ECB curve asked one maturity at a time; Zenodo and the ECB told who is asking', () => {
  assert.match(ecbCurveUrl(5, ['SR_10Y']), /SV_C_YM\.SR_10Y\?format=csvdata&lastNObservations=5$/);
  assert.match(ecbCurveUrl(), /SR_3M\+SR_6M/);
  const feed = fs.readFileSync('src/server/feeds/fullCurves.ts', 'utf8');
  assert.match(feed, /for \(const tenor of ECB_CURVE_TENORS\)/);
  assert.match(feed, /'User-Agent': RESEARCH_USER_AGENT/);
  const cc = fs.readFileSync('src/utils/connectionCheck.ts', 'utf8');
  assert.match(cc, /ecbCurveUrl\(5, \['SR_10Y'\]\),\s*Math\.max\(T, 30_000\)/);
  assert.match(cc, /\.\.\.ZENODO_HEADERS/);
  assert.match(cc, /ecbSpfUrl\(key, 8\),\s*Math\.max\(T, 30_000\)/);
  assert.match(fs.readFileSync('src/server/feeds/regional.ts', 'utf8'), /doseLatestUrl\(\), 'DOSE', \{ \.\.\.ZENODO_HEADERS/);
});

test('wiring: daily step, route, connection checks, licence, panel, translations', () => {
  assert.match(fs.readFileSync('server.ts', 'utf8'), /case 'world:curves'/);
  assert.match(fs.readFileSync('src/utils/preload.ts', 'utf8'), /'world:curves'/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/yield-curves/);
  const cc = fs.readFileSync('src/utils/connectionCheck.ts', 'utf8');
  for (const id of ['ust_curve', 'ecb_curve']) assert.match(cc, new RegExp(`'${id}'`));
  assert.match(fs.readFileSync('src/data/dataLicences.ts', 'utf8'), /id: 'ust_curve'/);
  assert.match(fs.readFileSync('src/components/CountryPage.tsx', 'utf8'), /lazyNamed\(\(\) => import\('\.\/FullCurvesPanel'\)/);
  assert.match(fs.readFileSync('src/utils/countryTools.ts', 'utf8'), /'tool-full-curves'/);
  for (const f of ['es', 'fr', 'pt']) assert.match(fs.readFileSync(`src/i18n/${f}/panels.ts`, 'utf8'), /fyc_method/);
});
