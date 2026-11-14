import test from 'node:test';
import assert from 'node:assert/strict';
import { fitGev, gamma, gevCdf, gevQuantile, lmoments, rarity, raritySentence } from '../src/utils/extremeValues.ts';

const close = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('gamma and L-moments', () => {
  close(gamma(5), 24, 1e-9);
  close(gamma(0.5), Math.sqrt(Math.PI), 1e-9);
  const m = lmoments([1, 2, 3, 4, 5])!;
  close(m.l1, 3, 1e-12);
  close(m.l2, 1, 1e-12, 'uniform-like steps: l2 = 1');
  close(m.t3, 0, 1e-12);
  assert.equal(lmoments([2, 2, 2]), null, 'no spread');
});

test('fitGev recovers a known GEV from its own quantiles; quantile and CDF are inverses', () => {
  const truth = { xi: 100, alpha: 20, k: -0.1 };
  const n = 2000;
  const vals = Array.from({ length: n }, (_, i) => gevQuantile(truth, (i + 0.5) / n));
  const g = fitGev(vals)!;
  close(g.xi, 100, 1, 'location');
  close(g.alpha, 20, 1, 'scale');
  close(g.k, -0.1, 0.03, 'shape');
  close(gevCdf(g, gevQuantile(g, 0.95)), 0.95, 1e-9);
  const gum = fitGev(Array.from({ length: n }, (_, i) => gevQuantile({ xi: 0, alpha: 1, k: 0 }, (i + 0.5) / n)))!;
  close(gum.k, 0, 0.03, 'Gumbel shape near 0');
});

test('rarity: ranks, record and fitted return periods, bootstrap range, fitted burn cost, both directions', () => {
  // 60 seasons from a Gumbel-like spread of season rainfall around 500 mm.
  const n = 60;
  const seasons = Array.from({ length: n }, (_, i) => ({ year: 1961 + i, value: Math.round(gevQuantile({ xi: 500, alpha: 60, k: 0.1 }, ((i * 37) % n + 0.5) / n)) }));
  const dry = rarity(seasons, { direction: 'below', trigger: 450, exit: 405 });
  assert.equal(dry.seasons, 60);
  const driest = [...seasons].sort((a, b) => a.value - b.value)[0];
  assert.equal(dry.ranked.find((r) => r.year === driest.year)!.returnYears, 61, 'driest of 60 = 1 year in 61');
  assert.equal(dry.ranked[0].year, 2020, 'newest first');
  assert.ok(dry.gev, 'fitted');
  const l10 = dry.levels.find((l) => l.years === 10)!;
  assert.ok(l10.record! < 500 && l10.fitted! < 500, 'dry 1-in-10 level is below the middle');
  assert.ok(l10.low! <= l10.fitted! && l10.fitted! <= l10.high!, 'range around the fitted level');
  const l100 = dry.levels.find((l) => l.years === 100)!;
  assert.equal(l100.beyond, true);
  assert.equal(l100.record, undefined);
  assert.ok(l100.fitted! < l10.fitted!, 'rarer droughts are drier');
  assert.ok(dry.trigger.recordYears! > 1 && dry.trigger.fittedYears! > 1);
  assert.ok(dry.exit.fittedYears! > dry.trigger.fittedYears!, 'exit rarer than trigger');
  assert.ok(dry.fittedBurnPct! > 0 && dry.fittedBurnPct! < 50);
  assert.ok(Math.abs(dry.check!.beyond10 - dry.check!.expected10) <= 4, 'about the expected count beyond 1-in-10');
  const bounded = rarity(seasons, { direction: 'below', trigger: 450, exit: 350 });
  assert.equal(bounded.exit.fittedYears, undefined, 'past the fitted curve\'s limit: never on the fit');
  assert.equal(bounded.exit.recordYears, undefined, 'never in the record');
  const wet = rarity(seasons, { direction: 'above', trigger: 600, exit: 700 });
  assert.ok(wet.levels.find((l) => l.years === 10)!.fitted! > 500);
  const again = rarity(seasons, { direction: 'below', trigger: 450, exit: 405 });
  assert.deepEqual(again.levels, dry.levels, 'same record, same bootstrap range');
  assert.match(raritySentence(dry, 'mm'), /60 seasons, GEV fitted by L-moments: the trigger is passed about 1 year in/);
  const short = rarity(seasons.slice(0, 15), { direction: 'below', trigger: 450, exit: 405 });
  assert.match(short.noFit!, /Fewer than 20/);
  assert.equal(short.levels.find((l) => l.years === 5)!.fitted, undefined);
  assert.ok(short.levels.find((l) => l.years === 5)!.record !== undefined);
});
