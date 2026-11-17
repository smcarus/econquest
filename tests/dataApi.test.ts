import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import { apiKeyFrom, DATA_API, isDataApiRead, keyMatches } from '../src/server/dataApi.ts';

const root = path.resolve(import.meta.dirname, '..');
const sample = (p: string) => p.replace(':iso3', 'BRA').replace(':id', 'policy_rate');

test('every documented data address counts as a data read, and nothing else does', () => {
  for (const a of DATA_API) {
    assert.ok(isDataApiRead('GET', sample(a.path)), a.path);
    assert.ok(isDataApiRead('GET', sample(a.path).replace('.csv', '.xlsx')), `${a.path} as xlsx`);
  }
  assert.ok(isDataApiRead('HEAD', '/api/panel?countries=BRA'));
  assert.ok(!isDataApiRead('POST', '/api/panel'));
  assert.ok(!isDataApiRead('GET', '/api/series/BRA/policy_rate/extra'));
  assert.ok(!isDataApiRead('GET', '/api/export/BRA/track-record.csv'));
  assert.ok(!isDataApiRead('GET', '/api/export/notebook/abc.md'));
  assert.ok(!isDataApiRead('GET', '/api/settings/runtime-config'));
  assert.ok(!isDataApiRead('GET', '/api/v1/integration/bundle/BRA'));
});

test('the key is read from a header only and compared exactly', () => {
  assert.equal(apiKeyFrom({ 'x-smcr-api-key': ' abc ' }), 'abc');
  assert.equal(apiKeyFrom({ authorization: 'Bearer xyz' }), 'xyz');
  assert.equal(apiKeyFrom({ authorization: 'Basic xyz' }), '');
  assert.equal(apiKeyFrom({}), '');
  assert.ok(keyMatches('smcr_123', 'smcr_123'));
  assert.ok(!keyMatches('smcr_12', 'smcr_123'));
  assert.ok(!keyMatches('', ''));
  assert.ok(!keyMatches('x', undefined));
});

test('the guide lists exactly the data addresses, and each one is a route on the server', () => {
  const guide = readFileSync(path.join(root, 'docs/DATA_API.md'), 'utf8');
  const documented = [...guide.matchAll(/`GET (\/api\/[^`?\s]+)`/g)].map((m) => m[1]);
  assert.deepEqual([...documented].sort(), DATA_API.map((a) => a.path).sort());
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  const routes = new Set([...server.matchAll(/app\.get\('([^']+)'/g)].map((m) => m[1].replace('.:fmt(csv|xlsx)', '.csv')));
  for (const p of documented) assert.ok(routes.has(p), `no route for ${p}`);
});

const python = (() => {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

test('the Python helper reads a saved table and sends the key in a header', { skip: python ? false : 'python3 is not installed here' }, async () => {
  const csv = 'iso3,series_id,series,unit,frequency,date,value,source,source_that_day,pulled_at\nBRA,policy_rate,Policy rate,%,monthly,2026-09,15,BIS,,2026-10-01\nBRA,policy_rate,Policy rate,%,monthly,2026-10,14.75,BIS,,2026-11-01\n';
  const seen: Array<{ url?: string; key?: string; agent?: string }> = [];
  const server = createServer((req, res) => {
    seen.push({ url: req.url, key: req.headers['x-smcr-api-key'] as string | undefined, agent: req.headers['user-agent'] });
    if (req.url === '/api/export/BRA/series/policy_rate.csv') {
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      // A byte order mark, as Excel downloads carry, must not reach the first column name.
      return res.end('\ufeff' + csv);
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'NO_SERIES', message: 'Policy rate: Missing. Not in BIS.' }));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  try {
    const code = [
      'import sys, json',
      `sys.path.insert(0, ${JSON.stringify(path.join(root, 'scripts/data-api'))})`,
      'import econquest as eq',
      'rows = eq.series("bra", "policy_rate")',
      'try:',
      '    eq.series("EGY", "policy_rate")',
      '    err = ""',
      'except RuntimeError as e:',
      '    err = str(e)',
      'print(json.dumps({"rows": rows, "err": err}))',
    ].join('\n');
    const run = await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve) => {
      const env = { ...process.env, ECONQUEST_URL: `http://127.0.0.1:${port}`, ECONQUEST_KEY: 'smcr_test', PYTHONDONTWRITEBYTECODE: '1', NO_PROXY: '127.0.0.1', no_proxy: '127.0.0.1' };
      const child = spawn('python3', ['-I', '-c', code], { env });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.stderr.on('data', (d) => (stderr += d));
      child.on('close', (status) => resolve({ status, stdout, stderr }));
    });
    assert.equal(run.status, 0, run.stderr);
    const out = JSON.parse(run.stdout) as { rows: Array<Record<string, string | number | null>>; err: string };
    assert.equal(out.rows.length, 2);
    assert.deepEqual(out.rows[1], { iso3: 'BRA', series_id: 'policy_rate', series: 'Policy rate', unit: '%', frequency: 'monthly', date: '2026-10', value: 14.75, source: 'BIS', source_that_day: '', pulled_at: '2026-11-01' });
    assert.match(out.err, /404.*Missing\. Not in BIS/);
    assert.ok(seen.every((r) => r.key === 'smcr_test'), 'the key travels in the header');
    assert.ok(seen.every((r) => String(r.agent).startsWith('econquest-python-helper')), 'the helper names itself, so the server leaves the byte order mark off');
    assert.ok(seen.every((r) => !String(r.url).includes('smcr_test')), 'never in the address');
  } finally {
    server.close();
  }
});

test('table downloads keep the byte order mark for Excel and leave it off for the data helpers', async () => {
  const { toCsv, CSV_BOM } = await import('../src/utils/csvExport.ts');
  assert.ok(toCsv(['iso3', 'value'], [['BRA', 1]]).startsWith(CSV_BOM));
  assert.ok(toCsv(['iso3', 'value'], [['BRA', 1]], { bom: false }).startsWith('iso3,value'));
  const server = readFileSync(path.join(root, 'server.ts'), 'utf8');
  assert.match(server, /req\.query\.bom === '0'/);
  assert.match(server, /econquest-\(python\|r\)-helper/);
  assert.match(readFileSync(path.join(root, 'scripts/data-api/econquest.R'), 'utf8'), /"User-Agent" = "econquest-r-helper"/);
  assert.match(readFileSync(path.join(root, 'scripts/data-api/econquest.do'), 'utf8'), /bom=0/);
});
