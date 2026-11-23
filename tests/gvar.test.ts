import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildData, inverse, parseDatamapper, parseImtsTrade, runGvar, spectralRadius, tradeWeights, imtsUrl, datamapperUrl } from '../src/utils/gvar';

test('matrix helpers: inverse and spectral radius', () => {
  const inv = inverse([[2, 1], [1, 3]])!;
  assert.ok(Math.abs(inv[0][0] - 0.6) < 1e-12 && Math.abs(inv[0][1] + 0.2) < 1e-12);
  assert.equal(inverse([[1, 2], [2, 4]]), null);
  assert.ok(Math.abs(spectralRadius([[0.5, 0], [0, 0.8]]) - 0.8) < 1e-3);
  assert.ok(Math.abs(spectralRadius([[0, 1], [-0.81, 0]]) - 0.9) < 1e-2);
  assert.ok(spectralRadius([[1.1, 0], [0, 0.2]]) > 1);
});

test('readers: DataMapper values and IMTS partner trade (exports + imports, mean of latest three years)', () => {
  const dm = parseDatamapper({ values: { NGDP_RPCH: { USA: { '2023': 2.9, '2024': '2.8', x: 1 }, CHN: { '2024': 5 } } } }, 'NGDP_RPCH');
  assert.deepEqual(dm, { USA: { 2023: 2.9, 2024: 2.8 }, CHN: { 2024: 5 } });
  const imts = {
    data: {
      dataSets: [{ series: { '0:0:0:0': { observations: { '0': ['10'], '1': ['20'], '2': ['30'], '3': ['40'] } }, '0:1:0:0': { observations: { '1': ['1'], '2': ['1'], '3': ['1'] } }, '0:1:1:0': { observations: { '3': ['7'] } } } }],
      structures: [{ dimensions: { series: [{ id: 'COUNTRY', values: [{ id: 'USA' }] }, { id: 'INDICATOR', values: [{ id: 'MG_CIF_USD' }, { id: 'XG_FOB_USD' }] }, { id: 'COUNTERPART_COUNTRY', values: [{ id: 'CHN' }, { id: 'MEX' }] }, { id: 'FREQUENCY', values: [{ id: 'A' }] }], observation: [{ values: [{ value: '2022' }, { value: '2023' }, { value: '2024' }, { value: '2025' }] }] } }],
    },
  };
  assert.deepEqual(parseImtsTrade(imts), { CHN: (21 + 31 + 41) / 3, MEX: 7 });
  assert.match(imtsUrl('USA', ['CHN', 'MEX']), /IMTS\/\+\/USA\.XG_FOB_USD\+MG_CIF_USD\.CHN\+MEX\.A\?/);
  assert.match(datamapperUrl('PCPIPCH', ['USA', 'CHN']), /PCPIPCH\/USA\/CHN$/);
});

test('trade weights: rows sum to one, mirror figures fill a missing report, none at all is named', () => {
  const { W, missing } = tradeWeights(['A', 'B', 'C', 'D'], { A: { B: 3, C: 1 }, B: { A: 3, C: 1 }, C: {} });
  assert.deepEqual(W[0], [0, 0.75, 0.25, 0]);
  assert.deepEqual(W[2], [0.5, 0.5, 0, 0]); // C's own report is empty: A's and B's reports used
  assert.deepEqual(missing, ['D']);
});

function synthetic(T = 40, seed = 7) {
  // Country A drives B and C through trade. A's own foreign variable is D, which A's surprises do not
  // move in the same year (the weak exogeneity the method assumes).
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647 - 0.5;
  };
  const countries = ['A', 'B', 'C', 'D'];
  const W = [
    [0, 0, 0, 1],
    [0.8, 0, 0.2, 0],
    [0.6, 0.2, 0, 0.2],
    [0, 0, 1, 0],
  ];
  const gdp: Record<string, Record<number, number>> = {};
  const cpi: Record<string, Record<number, number>> = {};
  let g = [2, 2, 2, 2];
  let p = [3, 3, 3, 3];
  for (let t = 0; t < T; t++) {
    const shockA = rnd() * 4;
    const gs = g.map((_, i) => W[i].reduce((acc, w, j) => acc + w * g[j], 0));
    const ng = g.map((v, i) => 1 + 0.3 * v + (i === 0 ? shockA : 0.4 * gs[i] + 0.5 * (i === 1 ? shockA * 0.8 : i === 2 ? shockA * 0.6 : 0)) + rnd());
    const np = p.map((v, i) => 1 + 0.5 * v + 0.1 * ng[i] + rnd() * 0.8);
    g = ng;
    p = np;
    countries.forEach((c, i) => {
      (gdp[c] ??= {})[2000 + t] = g[i];
      (cpi[c] ??= {})[2000 + t] = p[i];
    });
  }
  return { countries, W, gdp, cpi };
}

test('model: a growth shock in the hub country lifts its main partners on impact; bands hold the estimate', () => {
  const s = synthetic();
  const { data, dropped } = buildData(s.countries, s.gdp, s.cpi, 2000, 2039);
  assert.deepEqual(dropped, []);
  const r = runGvar(data, s.W, 'A', 'gdp', 1, { draws: 100 });
  assert.ok(!('error' in r), 'error' in r ? r.error : '');
  if ('error' in r) return;
  assert.ok(r.radius < 1);
  const a = r.responses.find((x) => x.iso3 === 'A')!;
  assert.ok(Math.abs(a.gdp[0] - 1) < 1e-9, 'scaled to 1 pp on impact');
  const b = r.responses.find((x) => x.iso3 === 'B')!;
  assert.ok(b.gdp[0] > 0.2, `B responds ${b.gdp[0]}`);
  assert.ok(r.stableDraws >= 20);
  assert.ok(b.gdpLow![0] <= b.gdp[0] + 1e-9 && b.gdpHigh![0] >= b.gdp[0] - 1e-9);
  assert.equal(r.responses[0].gdp.length, 6);
  assert.equal(r.exposure[0].iso3, 'B');
  assert.equal(r.exposure[r.exposure.length - 1].iso3, 'D');
  // Same data, same bands.
  const again = runGvar(data, s.W, 'A', 'gdp', 1, { draws: 100 });
  assert.deepEqual(again, r);
});

test('refusals: country not in the model, too few years', () => {
  const s = synthetic(15);
  const { data, dropped } = buildData(s.countries, s.gdp, s.cpi, 2000, 2014);
  assert.equal(dropped.length, 4);
  assert.match((runGvar(data, s.W, 'A', 'gdp', 1) as { error: string }).error, /not in the model/);
  const s2 = synthetic();
  const d2 = buildData(s2.countries, s2.gdp, s2.cpi, 2000, 2039).data;
  const short = { ...d2, years: d2.years.slice(0, 10), x: d2.x.slice(0, 10) };
  assert.match((runGvar(short, s2.W, 'A', 'gdp', 1) as { error: string }).error, /at least 20/);
});

test('route: bad input refused; IMF not answering reads Missing with the reason, nothing made up', async () => {
  const express = (await import('express')).default;
  const { registerGvarRoutes } = await import('../src/server/routes/gvar');
  const app = express();
  registerGvarRoutes(app);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  const realFetch = globalThis.fetch;
  try {
    assert.equal((await realFetch(`${base}/api/gvar?shock=XXX`)).status, 400);
    assert.equal((await realFetch(`${base}/api/gvar?shock=USA&size=0`)).status, 400);
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => (String(url).startsWith(base) ? realFetch(url, init) : new Response('down', { status: 503 }))) as typeof fetch;
    const j = await (await globalThis.fetch(`${base}/api/gvar?iso3=KEN&shock=USA`)).json();
    assert.match(j.error, /World Economic Outlook figures did not load \(HTTP 503\)/);
    assert.equal(j.responses, undefined);
  } finally {
    globalThis.fetch = realFetch;
    server.close();
  }
});
