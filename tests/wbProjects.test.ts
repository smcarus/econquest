import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { idaByProject, parseIdaPage, parseProjectsPage, wbDate, wbProjectsProfile, wbProjectsSentence, type WbProjectsPull } from '../src/utils/wbProjects.ts';
import { PANELS } from '../src/i18n/messages/panels.ts';
import { checkConnections } from '../src/utils/connectionCheck.ts';
import { WORLD_STEPS } from '../src/utils/preload.ts';

// The Projects API layout as read live on 17 November 2026 (Kenya, active), trimmed.
const projectsReply = {
  rows: 3,
  os: '0',
  page: '1',
  total: '3',
  projects: {
    P501648: {
      id: 'P501648',
      project_name: 'Kenya Secondary Education Equity and Quality Improvement Program',
      countrycode: ['KE'],
      boardapprovaldate: '2024-10-17T00:00:00Z',
      closingdate: '12/31/2029 12:00:00 AM',
      curr_total_commitment: '540',
      curr_ida_commitment: '390',
      curr_ibrd_commitment: '150',
      totalcommamt: '540,000,000',
      lendinginstr: 'Program-for-Results Financing',
      url: 'https://projects.worldbank.org/en/projects-operations/project-detail/P501648',
    },
    P100001: {
      id: 'P100001',
      project_name: 'Roads',
      countrycode: ['KE', 'UG'],
      boardapprovaldate: '2020-01-01T00:00:00Z',
      closingdate: '1/1/2028 12:00:00 AM',
      totalcommamt: '200,000,000',
      lendinginstr: 'Investment Project Financing',
    },
    P100002: {
      id: 'P100002',
      project_name: 'Budget support',
      countrycode: ['KE'],
      boardapprovaldate: '2025-01-01T00:00:00Z',
      closingdate: '1/1/2027 12:00:00 AM',
      curr_total_commitment: '750',
      lendinginstr: 'Development Policy Lending',
    },
  },
};

// The IDA statement as its published field list names the columns (not seen live yet).
const idaReply = {
  count: 4,
  data: [
    { project_id: 'P100001', credit_number: 'IDA1', original_principal_amount_us_: '150000000', cancelled_amount_us_: '0', disbursed_amount_us_: '30000000', undisbursed_amount_us_: '120000000' },
    { project_id: 'P100001', credit_number: 'IDA2', original_principal_amount_us_: 50000000, cancelled_amount_us_: 10000000, disbursed_amount_us_: 10000000, undisbursed_amount_us_: 30000000 },
    { project_id: 'P100002', credit_number: 'IDA3', original_principal_amount_us_: 750000000, cancelled_amount_us_: 0, disbursed_amount_us_: 0, undisbursed_amount_us_: 750000000 },
    { project_id: '', credit_number: 'IDA4', disbursed_amount_us_: 5 },
  ],
};

test('dates in both World Bank formats', () => {
  assert.equal(wbDate('2024-10-17T00:00:00Z'), '2024-10-17');
  assert.equal(wbDate('12/31/2029 12:00:00 AM'), '2029-12-31');
  assert.equal(wbDate('1/5/2028'), '2028-01-05');
  assert.equal(wbDate(''), undefined);
  assert.equal(wbDate(null), undefined);
});

test('Projects API page: fields, millions, whole-dollar fallback; wrong layout gives null', () => {
  const got = parseProjectsPage(projectsReply)!;
  assert.equal(got.total, 3);
  const p = got.projects.find((x) => x.id === 'P501648')!;
  assert.deepEqual(p, {
    id: 'P501648',
    name: 'Kenya Secondary Education Equity and Quality Improvement Program',
    countries: ['KE'],
    approved: '2024-10-17',
    closing: '2029-12-31',
    commitment: 540,
    ida: 390,
    ibrd: 150,
    instrument: 'Program-for-Results Financing',
    url: 'https://projects.worldbank.org/en/projects-operations/project-detail/P501648',
  });
  assert.equal(got.projects.find((x) => x.id === 'P100001')!.commitment, 200);
  assert.equal(parseProjectsPage({ rows: [] }), null);
  assert.equal(parseProjectsPage(null), null);
});

test('IDA rows added up by project, keys matched ignoring case and punctuation', () => {
  const rows = parseIdaPage(idaReply)!;
  assert.equal(rows.length, 4);
  const by = idaByProject(rows);
  assert.deepEqual(by.P100001, { principal: 200000000, cancelled: 10000000, disbursed: 40000000, undisbursed: 150000000, credits: 2 });
  assert.equal(Object.keys(by).length, 2);
  // Another spelling of the same columns still matches.
  assert.equal(idaByProject([{ 'Project ID': 'P9', 'Disbursed Amount (US$)': '1,000' }]).P9.disbursed, 1000);
  assert.equal(parseIdaPage({ nothing: true }), null);
});

test('country profile: largest first, time gone, paid out, slow flag, budget support never flagged', () => {
  const pull: WbProjectsPull = { pulledAt: '2026-11-15T03:00:00Z', projects: parseProjectsPage(projectsReply)!.projects, ida: idaByProject(parseIdaPage(idaReply)!) };
  const p = wbProjectsProfile(pull, 'KE', '2026-01-01');
  assert.equal(p.count, 3);
  assert.deepEqual(p.rows.map((r) => r.id), ['P100002', 'P501648', 'P100001']);
  const roads = p.rows.find((r) => r.id === 'P100001')!;
  // 2020-01-01 to 2028-01-01, today 2026-01-01: 2192 of 2922 days.
  assert.equal(roads.timeGonePct, 75);
  assert.equal(roads.paidOutPct, 21.1);
  assert.equal(roads.paidOut, 40);
  assert.equal(roads.slow, true);
  assert.equal(roads.regional, true);
  const bs = p.rows.find((r) => r.id === 'P100002')!;
  assert.equal(bs.paidOutPct, 0);
  assert.equal(bs.slow, false);
  assert.equal(p.slowCount, 1);
  assert.equal(p.committed, 1490);
  assert.equal(p.idaPaidOut, 40);
  assert.equal(p.idaStillToPay, 900);
  assert.equal(
    wbProjectsSentence(p, 'Kenya'),
    'Kenya has 3 active World Bank projects with US$1.5 bn committed (World Bank list of 2026-11-15). IDA credits and grants: US$40 m paid out, US$900 m still to pay. 1 paying out slowly for the time gone.',
  );
});

test('Missing with the reason: not downloaded, no code, no project, no IDA statement', () => {
  assert.match(wbProjectsProfile(null, 'KE', '2026-01-01').missing!, /not been downloaded yet/);
  const pull: WbProjectsPull = { pulledAt: '2026-11-15T03:00:00Z', projects: parseProjectsPage(projectsReply)!.projects, ida: null };
  assert.match(wbProjectsProfile(pull, null, '2026-01-01').missing!, /two-letter country code/);
  assert.match(wbProjectsProfile(pull, 'FR', '2026-01-01').missing!, /no active project/);
  const noIda = wbProjectsProfile(pull, 'KE', '2026-01-01');
  assert.equal(noIda.idaPaidOut, undefined);
  assert.match(noIda.paidOutMissing!, /could not be read/);
  assert.ok(noIda.rows.every((r) => r.paidOutPct === undefined && !r.slow));
  assert.match(wbProjectsSentence(wbProjectsProfile(null, 'KE', '2026-01-01'), 'X'), /Missing/);
});

test('wiring: download step, route, panel, tool slot, register, licence and text keys', () => {
  assert.ok(WORLD_STEPS.some((s) => s.id === 'world:wb_projects'));
  assert.match(readFileSync('server.ts', 'utf8'), /case 'world:wb_projects'/);
  assert.match(readFileSync('src/server/routes/analysis.ts', 'utf8'), /app\.get\('\/api\/wb-projects\/:iso3'/);
  const page = readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /<WbProjectsPanel key=\{`wp-\$\{run\.iso3\}`\}/);
  assert.match(page, /lazyNamed\(\(\) => import\('\.\/WbProjectsPanel'\)/);
  assert.match(readFileSync('src/utils/countryTools.ts', 'utf8'), /'tool-wb-projects'/);
  assert.match(readFileSync('src/data/modelRegister.ts', 'utf8'), /id: 'wb_projects'/);
  assert.match(readFileSync('src/data/dataLicences.ts', 'utf8'), /id: 'wb_projects'/);
  const panel = readFileSync('src/components/WbProjectsPanel.tsx', 'utf8');
  const keys = new Set([...panel.matchAll(/'(wp_[a-zA-Z0-9]+)'/g)].map((m) => m[1]));
  assert.ok(keys.size >= 18, String(keys.size));
  for (const k of keys) assert.ok(k in PANELS.en, k);
});

test('Data health rows', async () => {
  const fetchFn = async (url: string) =>
    new Response(JSON.stringify(url.includes('search.worldbank.org') ? projectsReply : url.includes('DS00001') ? idaReply : {}), { status: 200 });
  const rep = await checkConnections({ env: {}, only: ['wb_projects', 'wb_ida_credits'], fetchFn } as never);
  const a = rep.results.find((r) => r.id === 'wb_projects')!;
  assert.equal(a.state, 'connected');
  assert.match(a.sample || '', /Kenya: 3 active projects, e\.g\. P501648 committed US\$540 m, closing 2029-12-31/);
  const b = rep.results.find((r) => r.id === 'wb_ida_credits')!;
  assert.equal(b.state, 'connected');
  assert.match(b.sample || '', /4 rows read; P100001 disbursed US\$40\.0 m/);
});
