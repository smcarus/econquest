import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { addMonths, binomialUpperTail, cftcCrowdingCases, cliTurnPolicyCases, judge, judgeWithRobustness, monthlyRuns, robustness, taylorGapCases, type BacktestCase, type BacktestSpec } from '../src/utils/backtest';
import { targetIn } from '../src/data/inflationTargetHistory';
import { loadSpecs, runBacktests, sha256 } from '../src/utils/backtestRun';
import { registerEntry } from '../src/data/modelRegister';

const SPEC_DIR = path.join(process.cwd(), 'docs', 'validation', 'preregistered');
const spec = (over: Partial<BacktestSpec> = {}): BacktestSpec => ({
  id: 'x',
  version: 1,
  registeredOn: '2026-11-05',
  registeredBy: 'test',
  hypothesis: 'h',
  method: 'cli_turn_policy',
  params: {},
  sample: { from: '1990-01' },
  passMark: { minCases: 5, minLiftPts: 10, maxPValue: 0.05 },
  knownLimits: [],
  ...over,
});

test('every registered test file matches its hash in manifest.json and names a register entry', () => {
  const specs = loadSpecs(SPEC_DIR);
  assert.ok(specs.length >= 2);
  for (const s of specs) {
    assert.equal(s.problem, undefined, `${s.file}: ${s.problem}`);
    assert.ok(registerEntry(s.spec!.id), `${s.file} names no register entry`);
    assert.equal(`${s.spec!.id}.json`, s.file);
  }
});

test('a test file changed after registration is refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-'));
  fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify(spec({ id: 'a' })));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ files: { 'a.json': sha256('something else') } }));
  fs.writeFileSync(path.join(dir, 'b.json'), '{}');
  const [a, b] = loadSpecs(dir);
  assert.match(a.problem!, /changed after it was registered/);
  assert.match(b.problem!, /not in manifest/);
});

test('binomialUpperTail matches exact values', () => {
  assert.ok(Math.abs(binomialUpperTail(10, 8, 0.5) - 56 / 1024) < 1e-12);
  assert.equal(binomialUpperTail(10, 0, 0.3), 1);
  assert.equal(binomialUpperTail(10, 11, 0.3), 0);
});

test('judge: too few cases, pass and fail follow the pass mark fixed in the spec', () => {
  const mk = (n: number, hits: number, base: number): BacktestCase[] => Array.from({ length: n }, (_, i) => ({ where: 'A', when: `2000-${i}`, what: '', hit: i < hits, base }));
  assert.equal(judge(spec(), mk(4, 4, 0.2)).status, 'too_few_cases');
  const pass = judge(spec(), mk(20, 12, 0.3));
  assert.equal(pass.status, 'passed');
  assert.equal(pass.liftPts, 30);
  const weak = judge(spec(), mk(20, 7, 0.3));
  assert.equal(weak.status, 'failed');
  assert.match(weak.verdict, /^Failed\. Followed 7 of 20/);
});

test('monthlyRuns splits at gaps', () => {
  const runs = monthlyRuns([{ period: '2020-01' }, { period: '2020-02' }, { period: '2020-04' }]);
  assert.deepEqual(runs.map((r) => r.length), [2, 1]);
  assert.equal(addMonths('2020-11', 3), '2021-02');
});

/** A CLI rising to a peak in 2001-06, then falling: two months each way confirm it. */
const cliPeak = () => {
  const pts: { period: string; value: number }[] = [];
  for (let i = 0; i < 36; i++) pts.push({ period: addMonths('2000-01', i), value: i <= 17 ? 99 + i * 0.1 : 99 + 17 * 0.1 - (i - 17) * 0.1 });
  return pts;
};

test('CLI turn: dated when it could be known, hit when the bank cuts within the window, base rate from all months', () => {
  const cli = cliPeak();
  // Turn month 2001-06; known 2001-09 (2 confirm + 1 publication). Cut in 2001-12.
  const policy = cli.map((p) => ({ period: p.period, pct: p.period >= '2001-12' ? 5 : 6 }));
  const cases = cliTurnPolicyCases(spec({ params: { confirmMonths: 2, publicationLagMonths: 1, windowMonths: 6 } }), 'BRA', cli, policy);
  assert.equal(cases.length, 1);
  assert.equal(cases[0].when, '2001-09');
  assert.equal(cases[0].hit, true);
  assert.ok(cases[0].base > 0 && cases[0].base < 1);
  // A cut after the window does not count.
  const late = cli.map((p) => ({ period: p.period, pct: p.period >= '2002-05' ? 5 : 6 }));
  assert.equal(cliTurnPolicyCases(spec(), 'BRA', cli, late)[0].hit, false);
});

test('CFTC crowding: bands from past weeks only, entry then unwind counts as a hit', () => {
  const weeks = Array.from({ length: 120 }, (_, i) => {
    const share = i < 75 ? Math.sin(i / 3) * 5 : i < 80 ? -5 : i === 80 ? 20 : i < 84 ? 19 : 10;
    const date = new Date(Date.UTC(2010, 0, 5 + i * 7)).toISOString().slice(0, 10);
    return { date, openInterest: 1000, levNet: share * 10, assetMgrNet: 0 };
  });
  const cases = cftcCrowdingCases(spec({ method: 'cftc_crowding', sample: { from: '2010-01-01' } }), 'BRL', weeks);
  const entry = cases.find((c) => c.when === weeks[80].date);
  assert.ok(entry, 'the jump to 20% is an entry into crowded long');
  assert.equal(entry!.hit, true);
  assert.match(entry!.what, /crowded long/);
});

test('runBacktests pulls the histories once, judges each registered test and saves the verdicts', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-'));
  const resultFile = path.join(dataDir, 'local', 'validation', 'results.json');
  const cli = cliPeak();
  const bisCsv = ['FREQ,REF_AREA,UNIT_MEASURE,TIME_PERIOD,OBS_VALUE', ...cli.map((p) => `M,BR,368,${p.period},${p.period >= '2001-12' ? 5 : 6}`)].join('\n');
  const dbn = { series: { docs: [{ dimensions: { REF_AREA: 'BRA', FREQ: 'M', MEASURE: 'LI', ADJUSTMENT: 'AA', METHODOLOGY: 'H', UNIT_MEASURE: 'IX', TRANSFORMATION: 'IX' }, period: cli.map((p) => p.period), value: cli.map((p) => p.value) }] } };
  const urls: string[] = [];
  const out = await runBacktests({
    specDir: SPEC_DIR,
    resultFile,
    now: new Date('2026-11-05T21:00:00Z'),
    fetcher: async (url) => {
      urls.push(url);
      if (url.includes('stats.bis.org')) return bisCsv;
      if (url.includes('DF_PRICES_ALL')) throw new Error('HTTP 502');
      if (url.includes('db.nomics')) return JSON.stringify(dbn);
      throw new Error('HTTP 503');
    },
  });
  assert.equal(urls.length, 4, 'BIS, leading indicator, CFTC and consumer prices, each once');
  assert.ok(urls.some((u) => u.includes('startPeriod=1990-01')));
  assert.ok(urls.some((u) => u.includes('2006-06-01')));
  const r = out.results.cli_turn_policy;
  assert.equal(r.status, 'too_few_cases');
  assert.equal(r.cases, 1);
  assert.equal(r.specHash, loadSpecs(SPEC_DIR).find((s) => s.file === 'cli_turn_policy.json')!.hash);
  assert.equal(out.results.cftc_crowding, undefined);
  assert.ok(out.problems.some((p) => /CFTC did not answer/.test(p)));
  assert.ok(out.problems.some((p) => /OECD consumer prices did not answer/.test(p)));
  assert.equal(out.results.taylor_gap, undefined, 'no verdict without inflation history');
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(resultFile, 'utf8')).results), ['cli_turn_policy']);
});

test('targetIn gives the target as it stood in that month, and nothing before the first row', () => {
  assert.equal(targetIn('BRA', '2010-06')?.pct, 4.5);
  assert.equal(targetIn('BRA', '2024-03')?.pct, 3);
  assert.equal(targetIn('ZAF', '2025-10')?.pct, 4.5);
  assert.equal(targetIn('ZAF', '2025-11')?.pct, 3);
  assert.equal(targetIn('USA', '2011-12'), undefined, 'no numeric Fed target before 2012');
  assert.equal(targetIn('TUR', '2020-01'), undefined, 'Turkey is left out');
});

test('taylorGapCases calls tight and loose at the start of each run, with inflation lagged, and checks the move', () => {
  const months = Array.from({ length: 30 }, (_, i) => addMonths('2014-01', i));
  // Inflation 2% on a 2% target: rule = 2 + 2 + 0 = 4%.
  const inflation = months.map((period) => ({ period, value: 2 }));
  // Policy 4% (neutral) for 6 months, 6% (tight) from 2014-07, cut to 5.5% (still tight) in 2014-11,
  // 1% (loose) from 2015-09, hiked to 1.5% (still loose) in 2015-12.
  const policy = months.map((period, i) => ({ period, pct: i < 6 ? 4 : i < 10 ? 6 : i < 20 ? 5.5 : i < 23 ? 1 : 1.5 }));
  const cases = taylorGapCases(spec({ method: 'taylor_gap', sample: { from: '2014-01' }, params: { publicationLagMonths: 2, windowMonths: 6, bandPts: 1 } }), 'USA', inflation, policy);
  assert.equal(cases.length, 2, 'one call per run, not one per month');
  const tight = cases.find((c) => c.when === '2014-07');
  assert.ok(tight, 'first tight month is a call');
  assert.equal(tight!.hit, true, 'cut 4 months later');
  assert.match(tight!.what, /tight: policy 6\.00% vs rule 4\.00%/);
  const loose = cases.find((c) => c.when === '2015-09');
  assert.ok(loose);
  assert.equal(loose!.hit, true);
});

test('taylorGapCases: no move within the window is a miss, and no target means no case', () => {
  const months = Array.from({ length: 24 }, (_, i) => addMonths('2014-01', i));
  const inflation = months.map((period) => ({ period, value: 2 }));
  const policy = months.map((period, i) => ({ period, pct: i < 4 ? 4 : i < 16 ? 6 : 5 }));
  const s = spec({ method: 'taylor_gap', sample: { from: '2014-01' }, params: { publicationLagMonths: 2, windowMonths: 6, bandPts: 1 } });
  const cases = taylorGapCases(s, 'USA', inflation, policy);
  assert.equal(cases.length, 1);
  assert.equal(cases[0].when, '2014-05');
  assert.equal(cases[0].hit, false, 'the cut comes 12 months later');
  assert.deepEqual(taylorGapCases(s, 'TUR', inflation, policy), []);
});

/* ------------------------------------------------------------------ method 2 */

const yearCases = (years: number, perYear: number, hitsPerYear: number, base: number, where = (y: number, i: number) => `S${i % 4}`): BacktestCase[] =>
  Array.from({ length: years }, (_, y) =>
    Array.from({ length: perYear }, (_, i) => ({ where: where(y, i), when: `${2000 + y}-0${(i % 9) + 1}`, what: '', hit: i < hitsPerYear, base }))
  ).flat();

test('method 2: the same cases always give the same p-value (fixed seed)', () => {
  const cases = yearCases(15, 8, 5, 0.4);
  const a = robustness(spec(), cases);
  const b = robustness(spec(), cases);
  assert.equal(a.pValue, b.pValue);
  assert.deepEqual(a.liftRangePts, b.liftRangePts);
  assert.equal(a.years, 15);
});

test('method 2: a lift spread evenly over many years and series passes', () => {
  const r = robustness(spec({ passMark: { minCases: 30, minLiftPts: 10, maxPValue: 0.05 } }), yearCases(20, 8, 5, 0.4));
  assert.equal(r.status, 'passed', r.verdict);
  assert.ok(r.liftRangePts[0] > 0);
  assert.equal(r.seriesPositive, r.seriesTested);
});

test('method 2: a lift that comes from two clustered years fails, though method 1 passes', () => {
  // 18 quiet years at the base rate, then two years where every case is a hit.
  const quiet = yearCases(18, 6, 2, 0.35);
  const burst = Array.from({ length: 2 }, (_, y) => Array.from({ length: 30 }, (_, i) => ({ where: `S${i % 4}`, when: `${2030 + y}-01`, what: '', hit: true, base: 0.35 }))).flat();
  const cases = [...quiet, ...burst];
  const s = spec({ passMark: { minCases: 30, minLiftPts: 10, maxPValue: 0.05 } });
  assert.equal(judge(s, cases).status, 'passed', 'independent cases: looks strong');
  const r = robustness(s, cases);
  assert.equal(r.status, 'failed', r.verdict);
  assert.match(r.verdict, /same year/);
});

test('method 2: a lift carried by one series fails the spread check and names it', () => {
  const cases = yearCases(20, 8, 0, 0.3, () => 'B').map((c, i) => (i % 2 ? c : { ...c, where: 'A', hit: true }));
  const s = spec({ passMark: { minCases: 30, minLiftPts: 10, maxPValue: 0.05 } });
  const r = robustness(s, cases);
  assert.equal(r.seriesTested, 2);
  assert.equal(r.seriesPositive, 1);
  assert.equal(r.worstWithoutOne?.without, 'A');
  assert.ok(r.worstWithoutOne!.liftPts < 0);
});

test('method 2: too few years is too few cases', () => {
  const r = robustness(spec({ passMark: { minCases: 5, minLiftPts: 10, maxPValue: 0.05 } }), yearCases(4, 10, 8, 0.3));
  assert.equal(r.status, 'too_few_cases');
});

test('judgeWithRobustness: a method 1 test keeps its verdict; a framework 2 test is judged by method 2', () => {
  const quiet = yearCases(18, 6, 2, 0.35);
  const burst = Array.from({ length: 2 }, (_, y) => Array.from({ length: 30 }, (_, i) => ({ where: `S${i % 4}`, when: `${2030 + y}-01`, what: '', hit: true, base: 0.35 }))).flat();
  const cases = [...quiet, ...burst];
  const pm = { minCases: 30, minLiftPts: 10, maxPValue: 0.05 };
  const v1 = judgeWithRobustness(spec({ passMark: pm }), cases);
  assert.equal(v1.framework, 1);
  assert.equal(v1.status, 'passed');
  assert.equal(v1.robustness.status, 'failed');
  const v2 = judgeWithRobustness(spec({ passMark: pm, framework: 2 }), cases);
  assert.equal(v2.framework, 2);
  assert.equal(v2.status, 'failed');
  assert.equal(v2.pValue, v2.robustness.pValue);
  assert.match(v2.verdict, /method 2/);
});
