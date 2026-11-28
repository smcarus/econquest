import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { BOHN_CSV_HEADER } from '../src/utils/bohnTest.ts';

const dir = path.join(process.cwd(), 'quests', 'replications', 'bohn');
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');

test('the Bohn challenge has a guide in each language the app speaks, each linking the others', () => {
  for (const f of ['README.md', 'README.es.md', 'README.fr.md', 'README.pt.md']) {
    const s = read(f);
    for (const g of ['README.md', 'README.es.md', 'README.fr.md', 'README.pt.md'].filter((x) => x !== f)) assert.ok(s.includes(`(${g})`), `${f} links ${g}`);
    for (const starter of ['bohn_starter.R', 'bohn_starter.py', 'bohn_starter.do']) assert.ok(s.includes(starter), `${f} names ${starter}`);
    assert.ok(s.includes('/api/bohn/BRA.csv'), `${f} gives the download address`);
  }
});

test('the starters load the download by its column names and leave the estimate to the person', () => {
  for (const f of ['bohn_starter.R', 'bohn_starter.py', 'bohn_starter.do']) {
    const s = read(f);
    for (const col of BOHN_CSV_HEADER.slice(1, 5)) assert.ok(s.includes(col), `${f} uses ${col}`);
    // No regression command: a starter that gives the answer would stop the Quest checking the app.
    assert.doesNotMatch(s.replace(/^\s*(#|\*|\/\/).*$/gm, '').replace(/"""[\s\S]*?"""/g, ''), /\blm\(|\bols\(|\bOLS\(|\bregress\b|\bnewey\b|lstsq|polyfit|LinearRegression/, `${f} runs no regression`);
  }
});
