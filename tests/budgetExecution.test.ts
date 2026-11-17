import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUDGET_TEMPLATE, budgetSentence, budgetView, checkBudgetMeta, deleteBudget, loadBudget, parseBudgetCsv, saveBudget, type BudgetFile } from '../src/engine/budgetExecution';
import { createMemoryPlatform } from '../src/platform/memory';
import { PANELS } from '../src/i18n/messages/panels.ts';
import { describeRequest } from '../src/utils/auditLog.ts';

const file = (csv: string, fyStart = 1): BudgetFile => ({ format: 1, iso3: 'KEN', meta: { fyStart, unit: 'KES million', source: 'Test report' }, rows: parseBudgetCsv(csv).rows, csvSha256: 'x', savedAt: '2026-11-17T00:00:00Z' });

test('the template reads without problems', () => {
  const p = parseBudgetCsv(BUDGET_TEMPLATE);
  assert.deepEqual(p.problems, []);
  assert.equal(p.rows.length, 5);
  assert.deepEqual(p.rows[4], { line: 'Roads', approved: 900 });
});

test('columns in any order, semicolons with decimal commas, blanks counted not filled', () => {
  const p = parseBudgetCsv('Month;Spent;Line;Approved\n2026-01;10,5;Health;100\n2026-02;..;Health;100\n');
  assert.deepEqual(p.problems, []);
  assert.equal(p.blank, 1);
  assert.deepEqual(p.rows, [
    { line: 'Health', approved: 100, month: '2026-01', spent: 10.5 },
    { line: 'Health', approved: 100, month: '2026-02' },
  ]);
});

test('problems: missing column, bad month, bad number, approved changes within a line', () => {
  assert.match(parseBudgetCsv('line,approved,spent\nA,1,2').problems[0], /missing: month/);
  const p = parseBudgetCsv('line,approved,month,spent\nA,100,2026-13,5\nA,100,2026-01,lots\nA,120,2026-02,5\n,100,2026-01,1\nB,0,2026-01,1\nC,50,,7\n');
  assert.equal(p.problems.length, 6);
  assert.match(p.problems[0], /Line 2: "2026-13" is not a month/);
  assert.match(p.problems[1], /Line 3: the amount spent "lots" is not a number/);
  assert.match(p.problems[2], /Line 4: "A" has an approved budget of 120 here and 100/);
  assert.match(p.problems[3], /Line 5: no line name/);
  assert.match(p.problems[4], /Line 6: the approved budget "0"/);
  assert.match(p.problems[5], /Line 7: a spending figure needs a month/);
  assert.match((checkBudgetMeta({ fyStart: 13 }) as { problems: string[] }).problems.join(' '), /1 to 12.*unit.*come from/);
});

test('fiscal year from July: months gone, pace, same-pace year end, missing months, rows outside left out', () => {
  const csv = [
    'line,approved,month,spent',
    'Health,1200,2026-06,999', // previous fiscal year (July 2025 to June 2026): left out
    'Health,1200,2026-07,100',
    'Health,1200,2026-08,100',
    'Health,1200,2026-09,100',
    'Roads,2400,2026-07,50',
    'Roads,2400,2026-09,50',
    'Schools,600,2026-07,100',
    'Schools,600,2026-08,100',
    'Schools,600,2026-09,100',
  ].join('\n');
  const v = budgetView(file(csv, 7));
  assert.equal(v.fyFirst, '2026-07');
  assert.equal(v.latest, '2026-09');
  assert.equal(v.monthsGone, 3);
  assert.equal(v.timePct, 25);
  assert.equal(v.outside, 1);
  assert.deepEqual(v.lines.map((l) => l.line), ['Roads', 'Health', 'Schools']);
  const health = v.lines.find((l) => l.line === 'Health')!;
  assert.deepEqual(health, { line: 'Health', approved: 1200, spent: 300, spentPct: 25, gap: 0, pace: 'on_pace', missingMonths: [], yearEnd: 1200, yearEndPct: 100 });
  const roads = v.lines.find((l) => l.line === 'Roads')!;
  assert.equal(roads.spentPct, 4.2);
  assert.equal(roads.pace, 'behind');
  assert.deepEqual(roads.missingMonths, ['2026-08']);
  assert.equal(roads.yearEnd, undefined);
  const schools = v.lines.find((l) => l.line === 'Schools')!;
  assert.equal(schools.pace, 'ahead');
  assert.equal(schools.yearEndPct, 200);
  assert.equal(v.total!.approved, 4200);
  assert.equal(v.total!.spent, 700);
  assert.equal(v.total!.spentPct, 16.7);
  assert.equal(v.total!.yearEndPct, undefined);
  assert.deepEqual(v.total!.missingMonths, ['2026-08']);
  assert.equal(
    budgetSentence(v, 'Kenya'),
    'Kenya, your budget file (Test report): 16.7% of the approved 4200 KES million spent by 2026-09, with 25% of the fiscal year gone. Behind: Roads. Ahead: Schools.',
  );
});

test('a January year that crosses into a new year starts again; no spending at all reads Missing', () => {
  const v = budgetView(file('line,approved,month,spent\nA,120,2025-12,50\nA,120,2026-01,10\n'));
  assert.equal(v.fyFirst, '2026-01');
  assert.equal(v.monthsGone, 1);
  assert.equal(v.outside, 1);
  assert.equal(v.lines[0].yearEndPct, 100);
  const none = budgetView(file('line,approved,month,spent\nA,120,,\n'));
  assert.match(none.missing!, /no month with spending/);
  assert.equal(none.total, undefined);
  assert.match(budgetSentence(none, 'X'), /Missing/);
});

test('save, load and delete on this computer only; problems refuse the save', async () => {
  const platform = createMemoryPlatform({ now: Date.UTC(2026, 10, 17, 12) });
  const bad = await saveBudget(platform, 'KEN', { fyStart: 7, unit: 'KES million', source: '' }, BUDGET_TEMPLATE);
  assert.ok('problems' in bad && /come from/.test(bad.problems.join(' ')));
  const ok = await saveBudget(platform, 'KEN', { fyStart: 7, unit: 'KES million', source: 'Treasury monthly report' }, BUDGET_TEMPLATE);
  assert.ok('saved' in ok);
  assert.equal(ok.saved.savedAt, '2026-11-17T12:00:00.000Z');
  assert.match(ok.saved.csvSha256, /^[0-9a-f]{64}$/);
  const back = await loadBudget(platform, 'KEN');
  assert.equal(back?.rows.length, 5);
  assert.equal(back?.meta.fyStart, 7);
  assert.equal(await deleteBudget(platform, 'KEN'), true);
  assert.equal(await loadBudget(platform, 'KEN'), null);
  assert.equal(await deleteBudget(platform, 'KEN'), false);
});

test('wiring: routes, audit by the route only, panel, tool slot, register and text keys', () => {
  const routes = readFileSync('src/server/routes/budgetExecution.ts', 'utf8');
  for (const r of [/app\.get\('\/api\/budget-execution\/:iso3'/, /app\.post\('\/api\/budget-execution\/:iso3'/, /app\.delete\('\/api\/budget-execution\/:iso3'/, /budget-execution-template\.csv/]) assert.match(routes, r);
  assert.match(readFileSync('server.ts', 'utf8'), /registerBudgetExecutionRoutes\(app, \{ refuseRemoteChange, signedIn, platform: enginePlatform \}\)/);
  assert.equal(describeRequest('POST', '/api/budget-execution/KEN'), null);
  const page = readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /<BudgetExecutionPanel key=\{`be-\$\{run\.iso3\}`\}/);
  assert.match(page, /lazyNamed\(\(\) => import\('\.\/BudgetExecutionPanel'\)/);
  assert.match(readFileSync('src/utils/countryTools.ts', 'utf8'), /'tool-budget-execution'/);
  assert.match(readFileSync('src/data/modelRegister.ts', 'utf8'), /id: 'budget_execution'/);
  const panel = readFileSync('src/components/BudgetExecutionPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(be_[a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 40, String(keys.size));
  for (const k of keys) assert.ok(k in PANELS.en, k);
});
