import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientModeFromValue, withheldReason, withholdForClients } from '../src/utils/clientMode.ts';
import { FIGURES_HEADER, SERIES_HEADER } from '../src/utils/csvExport.ts';
import { References } from '../src/utils/citations.ts';

test('the switch is on only when saved as "1"', () => {
  assert.equal(clientModeFromValue('1'), true);
  assert.equal(clientModeFromValue('0'), false);
  assert.equal(clientModeFromValue(null), false);
  assert.equal(clientModeFromValue(undefined), false);
});

test('open and conditional sources pass; permission, unconfirmed and unnamed sources are held back', () => {
  assert.equal(withheldReason('World Bank, 2024'), null);
  assert.equal(withheldReason('BIS, 2026-10-27'), null);
  assert.match(withheldReason('IMF WEO, 2025') ?? '', /permission needed/);
  assert.match(withheldReason('OECD CLI via DBnomics') ?? '', /terms not confirmed/);
  assert.match(withheldReason('model, from figures above') ?? '', /not in the licence register/);
  assert.match(withheldReason('model: IMF reserves over World Bank imports') ?? '', /permission needed/);
});

test('figure rows keep source and say Withheld, with the reason; missing rows are untouched', () => {
  const at = (n: string) => FIGURES_HEADER.indexOf(n);
  const row = (value: number | null, source: string, status: string, reason = '') => {
    const r: (string | number | null)[] = FIGURES_HEADER.map(() => '');
    r[at('value')] = value;
    r[at('source')] = source;
    r[at('status')] = status;
    r[at('reason_if_missing')] = reason;
    return r;
  };
  const out = withholdForClients(FIGURES_HEADER, [row(77.7, 'IMF WEO, 2025', 'Live'), row(13.75, 'BIS, 2026-10-27', 'Live'), row(null, '', 'Missing', 'IMF did not answer')]);
  assert.equal(out[0][at('value')], null);
  assert.equal(out[0][at('status')], 'Withheld');
  assert.equal(out[0][at('source')], 'IMF WEO, 2025');
  assert.match(String(out[0][at('reason_if_missing')]), /^Withheld in client mode: permission needed/);
  assert.equal(out[1][at('value')], 13.75);
  assert.equal(out[1][at('status')], 'Live');
  assert.equal(out[2][at('reason_if_missing')], 'IMF did not answer');
});

test('series rows without a status column read Withheld in the value cell', () => {
  const v = SERIES_HEADER.indexOf('value');
  const s = SERIES_HEADER.indexOf('source');
  const mk = (value: number, source: string) => SERIES_HEADER.map((h, i) => (i === v ? value : i === s ? source : h));
  const out = withholdForClients(SERIES_HEADER, [mk(5.1, 'FRED'), mk(10.5, 'CFTC')]);
  assert.equal(out[0][v], 'Withheld');
  assert.equal(out[1][v], 10.5);
});

test('a table without value and source columns is returned as it is', () => {
  const rows = [['a', 1]];
  assert.equal(withholdForClients(['x', 'y'], rows), rows);
});

test('references end with which ones need permission before sharing, and say nothing when all are open', () => {
  const open = new References();
  open.cite('World Bank, 2024');
  assert.equal(open.lines('2026-11-06').length, 1);
  const mixed = new References();
  mixed.cite('World Bank, 2024');
  mixed.cite('IMF WEO, 2025');
  mixed.cite('Polymarket, pulled 2026-11-05');
  const lines = mixed.lines('2026-11-06');
  assert.match(lines.at(-1) ?? '', /^Before sharing outside your own research: \[2\], \[3\] come from sources/);
});
