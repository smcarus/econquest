/**
 * Accessibility check: opens the main pages of the built app in a real browser (every data feed
 * down, as in the UI smoke test) and runs axe-core, the open-source rule set most accessibility
 * checkers use, against WCAG 2.2 levels A and AA (which include all of 2.1).
 *
 * The check fails on any "serious" or "critical" problem: things that stop a screen-reader or
 * keyboard user, such as a button with no name, a form field with no label, or text too faint to
 * read. Smaller ("moderate" and "minor") problems are listed but do not fail the run.
 *
 * Two WCAG 2.2 checks the rule set cannot make on its own are added: moving through each page with
 * the Tab key, every control that gets the keyboard focus must show where the focus is (2.4.7) and
 * must not be hidden behind a fixed bar or panel (2.4.11, "focus not obscured").
 *
 * The classroom screens (roadmap Phase 5, Q10) are checked at phone width first, on a second copy with
 * Quests, classes and sign-in on: a teacher's class card with an assignment, the entries, feedback,
 * class table, gradebook and hand-in files; a student's card with the hand-in form, their feedback
 * and report; and the Hand in tab with a sheet open. At 320 pixels wide nothing in the Quests window
 * may need sideways scrolling (WCAG 1.4.10, reflow).
 *
 * Run after `npm run build`:  npm run test:a11y
 * Needs Playwright's Chromium (`npx playwright install chromium`); set PW_CHROMIUM_PATH to use
 * another Chromium binary. Set A11Y_ALL=on to fail on every problem, whatever its size.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!existsSync(path.join(root, 'dist/index.html'))) {
  console.error('Build first: npm run build');
  process.exit(1);
}
const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const failOn = process.env.A11Y_ALL === 'on' ? ['minor', 'moderate', 'serious', 'critical'] : ['serious', 'critical'];

function startServer(extra = {}) {
  const port = 4800 + Math.floor(Math.random() * 400);
  const srv = { base: `http://127.0.0.1:${port}`, log: '' };
  srv.proc = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/offline-fetch.mjs')).href}`,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: mkdtempSync(path.join(tmpdir(), 'econquest-a11y-')),
      SCHEDULE_BACKTESTS: 'off',
      GEMINI_API_KEY: '',
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.proc.stdout.on('data', (d) => (srv.log += d));
  srv.proc.stderr.on('data', (d) => (srv.log += d));
  return srv;
}

async function waitUp(srv) {
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (srv.proc.exitCode !== null) throw new Error(`server exited early:\n${srv.log}`);
    try {
      if ((await fetch(`${srv.base}/api/ai/runtime-defaults`)).ok) return;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`server did not start:\n${srv.log}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

const main = startServer();
const base = main.base;
let classSrv;
const failures = [];
const notes = [];
let browser;

/** Runs axe on what the page shows now and sorts each problem into failures or notes. */
// The pages are opened with bypassCSP: the checker is added as an inline script, which the built
// app's security policy (PRODUCTION_CSP) rightly refuses. The UI smoke test runs with the policy on.
async function scan(page, where) {
  await page.waitForTimeout(600);
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      count: v.nodes.length,
      first: v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')}${n.any?.[0]?.message ? ` (${n.any[0].message})` : ''}`).join(' | '),
    }));
  });
  for (const v of result) {
    const line = `${where}: ${v.id} (${v.impact}, ${v.count} place${v.count === 1 ? '' : 's'}): ${v.help}. Where: ${v.first}`;
    (failOn.includes(v.impact) ? failures : notes).push(line);
  }
}

/**
 * Presses Tab up to `steps` times and checks each control that takes the focus: it shows a focus
 * ring (outline or box shadow), and the middle of it is not covered by another element such as a
 * fixed header (WCAG 2.2: 2.4.7 focus visible, 2.4.11 focus not obscured). Always serious.
 */
async function keyboardCheck(page, where, steps = 40, inside = '') {
  // In a dialog, start from its first control: a click outside it would close it.
  if (inside) await page.locator(inside).first().evaluate((el) => el.querySelector('button, a[href], input, select, textarea')?.focus());
  else await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => {});
  const seen = new Set();
  const hidden = [];
  const noRing = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      el.scrollIntoView?.({ block: 'nearest' });
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return null;
      const name = `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)}"`;
      const cs = getComputedStyle(el);
      // A shadow counts only if one of its layers has a colour that is not see-through and a size;
      // style sheets often set see-through placeholder shadows on every control.
      const shadowSeen = (cs.boxShadow || 'none') !== 'none' && (cs.boxShadow.match(/(?:rgba?|oklch|oklab|color)\([^)]*\)[^,]*/g) || []).some((layer) => {
        const alpha = layer.match(/\/\s*([\d.]+)\)|rgba\([^)]*,\s*([\d.]+)\)/);
        const a = alpha ? parseFloat(alpha[1] ?? alpha[2]) : 1;
        const sizes = (layer.replace(/^[^)]*\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
        return a > 0 && sizes.some((n) => n !== 0);
      });
      const outlineSeen = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !/rgba\([^)]*,\s*0\)|transparent/.test(cs.outlineColor);
      const ring = outlineSeen || shadowSeen;
      const x = Math.min(Math.max(box.left + box.width / 2, 0), innerWidth - 1);
      const y = Math.min(Math.max(box.top + box.height / 2, 0), innerHeight - 1);
      const top = document.elementFromPoint(x, y);
      const covered = !!top && top !== el && !el.contains(top) && !top.contains(el);
      return { name, ring, covered, by: covered ? `${top.tagName.toLowerCase()}${top.id ? `#${top.id}` : ''}` : '' };
    });
    if (!r || seen.has(r.name)) continue;
    seen.add(r.name);
    if (r.covered) hidden.push(`${r.name} under ${r.by}`);
    if (!r.ring) noRing.push(r.name);
  }
  if (hidden.length) failures.push(`${where}: focus hidden behind another element (WCAG 2.4.11, ${hidden.length}): ${hidden.slice(0, 4).join(' | ')}`);
  if (noRing.length) failures.push(`${where}: focus not shown (WCAG 2.4.7, ${noRing.length}): ${noRing.slice(0, 4).join(' | ')}`);
}

/** Nothing inside the Quests window may need sideways scrolling at 320 pixels wide (WCAG 1.4.10). */
async function reflowCheck(page, where) {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.waitForTimeout(300);
  const wide = await page.evaluate(() => {
    const box = document.querySelector('[data-quests]');
    if (!box) return ['no Quests window'];
    const out = [];
    const right = box.getBoundingClientRect().right + 1;
    for (const el of box.querySelectorAll('*')) {
      // A table may scroll inside its own frame (allowed for data tables); everything else must fit.
      if (el.closest('.overflow-x-auto')) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > right) out.push(`${el.tagName.toLowerCase()}${[...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `[${a.name}]`).join('')} ${Math.round(r.right - right)}px`);
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) out.unshift(`the page is ${document.documentElement.scrollWidth}px wide`);
    return out;
  });
  if (wide.length) failures.push(`${where}: wider than the screen at 320px (WCAG 1.4.10, ${wide.length}): ${wide.slice(0, 5).join(' | ')}`);
  await page.setViewportSize({ width: 390, height: 844 });
}

async function classroomCheck(browser, cbase) {
  const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, bypassCSP: true };
  const tctx = await browser.newContext(phone);
  const tp = await tctx.newPage();
  // Writes carry the session's CSRF token, as the app's own pages do.
  const tokens = new Map();
  const api = async (ctx, method, p, data) => {
    if (method !== 'GET' && !tokens.get(ctx)) tokens.set(ctx, (await (await ctx.request.get(`${cbase}/api/auth/status`)).json()).csrfToken);
    const r = await ctx.request.fetch(`${cbase}${p}`, { method, data, headers: tokens.get(ctx) ? { 'x-csrf-token': tokens.get(ctx) } : {} });
    const j = await r.json().catch(() => ({}));
    if (!r.ok()) throw new Error(`${method} ${p}: HTTP ${r.status()} ${j.error || ''}`);
    return j;
  };
  const password = 'a long accessibility test passphrase';
  await api(tctx, 'POST', '/api/auth/setup', { username: 'prof', displayName: 'Professor', password });
  const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const made = await api(tctx, 'POST', '/api/classes', { name: 'Macro 101', timeZone: 'America/Chicago', term: { label: 'Spring', starts: day(-10), ends: day(80) } });
  const id = made.class.id;
  const students = await api(tctx, 'POST', `/api/classes/${id}/students`, { nicknames: ['José', 'Amina'] });
  const q = await api(tctx, 'POST', `/api/classes/${id}/class-quests`, { type: 'forecast', title: 'Will Brent be higher at the end of term?', summary: 'Oil over the term.', level: 'intro', topic: 'commodities', region: 'Global', country: '', opensOn: day(0), closesOn: day(20), series: 'commodity_eia_rbrte', kind: 'direction', op: 'higher', on: day(60) });
  await api(tctx, 'POST', `/api/classes/${id}/assignments`, { questId: q.id, due: `${day(7)}T23:59`, aiRule: 'note', instructions: 'Give a probability and one reason.' });
  const aid = (await api(tctx, 'GET', `/api/classes/${id}/assignments`)).assignments[0].id;
  const sheet = await api(tctx, 'GET', `/api/classes/${id}/assignments/${aid}/sheet`);

  // A student hands in, so the teacher has an entry to mark.
  const sctx = await browser.newContext(phone);
  const jose = students.created.find((c) => c.nickname === 'José');
  await api(sctx, 'POST', '/api/auth/sign-in', { username: jose.username, password: jose.password });
  await api(sctx, 'POST', `/api/classes/${id}/assignments/${aid}/entries`, { answer: { probability: 0.6 }, rationale: 'Winter demand.', aiNote: 'I did not use AI tools for this one.' });

  const openClasses = async (page) => {
    await page.goto(cbase, { waitUntil: 'networkidle', timeout: 90_000 });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: /^Quests/ }).first().click();
    const box = page.locator('[data-quests]');
    await box.locator('[data-quests-tab="classes"]').click();
    await box.locator('[data-class-assignment]').first().waitFor({ timeout: 15_000 });
    return box;
  };

  // Teacher.
  const tb = await openClasses(tp);
  await scan(tp, 'Phone: class card (teacher)');
  await tb.locator('[data-class-show-entries]').first().click();
  await tb.locator('[data-class-feedback]').first().waitFor({ timeout: 15_000 });
  await tb.locator('[data-class-table-toggle]').first().click();
  await tb.locator('[data-class-gradebook-toggle]').first().click();
  await tb.locator('[data-class-gradebook-csv]').first().waitFor({ timeout: 15_000 });
  await scan(tp, 'Phone: entries, feedback, class table, gradebook (teacher)');
  await keyboardCheck(tp, 'Phone: class card (teacher)', 80, '[data-quests]');
  await reflowCheck(tp, 'Class card (teacher)');
  await tb.locator('[data-class-report-open]').first().click();
  await tb.locator('[data-class-report]').first().waitFor({ timeout: 15_000 });
  await scan(tp, 'Phone: student report (teacher)');
  await tctx.close();

  // Student.
  const sp = await sctx.newPage();
  const sb = await openClasses(sp);
  await sb.locator('[data-class-hand-in]').first().waitFor({ timeout: 15_000 });
  await sb.locator('[data-class-show-feedback]').first().click();
  await sb.locator('[data-class-my-report]').first().click();
  await sb.locator('[data-class-report]').first().waitFor({ timeout: 15_000 });
  await scan(sp, 'Phone: class card with hand-in form, feedback and report (student)');
  await keyboardCheck(sp, 'Phone: class card (student)', 80, '[data-quests]');
  await reflowCheck(sp, 'Class card (student)');

  // The Hand in tab with a sheet open, as on a student's own copy.
  await sb.locator('[data-quests-tab="handin"]').click();
  await sb.locator('[data-hand-in-sheet]').setInputFiles({ name: 'sheet.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(sheet)) });
  await sb.locator('[data-hand-in-form]').waitFor({ timeout: 15_000 });
  await scan(sp, 'Phone: Hand in tab');
  await keyboardCheck(sp, 'Phone: Hand in tab', 40, '[data-quest-hand-in]');
  await reflowCheck(sp, 'Hand in tab');
  await sctx.close();
}

try {
  await waitUp(main);

  browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});

  // Laptop width: the pages most people use.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, bypassCSP: true });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 90_000 });
  await scan(page, 'Workspace');
  await keyboardCheck(page, 'Workspace');

  for (const scope of ['country', 'compare', 'portfolio']) {
    await page.getByRole('button', { name: 'Research', exact: true }).first().click();
    await page.waitForTimeout(200);
    await page.locator(`[data-research-scope] button[data-scope="${scope}"]`).click();
    await scan(page, `Research (${scope})`);
  }
  await keyboardCheck(page, 'Research');

  await page.getByRole('button', { name: 'Reports', exact: true }).first().click();
  await scan(page, 'Reports');

  const menu = async (item, ready, label) => {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: item }).first().click();
    await page.waitForSelector(ready, { timeout: 15_000 });
    await scan(page, label);
    await page.keyboard.press('Escape');
  };
  await menu(/^Tools/, 'main [data-ready-tools]', 'Tools');
  await menu(/^Settings/, '[data-settings-tab]', 'Settings');
  await menu(/^About & data licences/, '[data-licence-counts]', 'About & data licences');
  await page.close();

  // Phone width.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, bypassCSP: true });
  await phone.goto(base, { waitUntil: 'networkidle', timeout: 90_000 });
  await scan(phone, 'Phone: Workspace');
  await keyboardCheck(phone, 'Phone: Workspace');
  await phone.close();

  // The popped-out watchlist.
  const pop = await browser.newPage({ bypassCSP: true });
  await pop.goto(`${base}/?view=watchlist`, { waitUntil: 'networkidle', timeout: 60_000 });
  await scan(pop, 'Pop-out watchlist');

  // The classroom screens (Q10), phone width first.
  classSrv = startServer({ QUESTS_ENABLED: 'on', CLASSES_ENABLED: 'on' });
  await waitUp(classSrv);
  await classroomCheck(browser, classSrv.base);
} catch (err) {
  failures.push(`accessibility run failed: ${err?.stack || err}`);
} finally {
  await browser?.close();
  main.proc.kill();
  classSrv?.proc.kill();
}

if (notes.length) console.log(`Smaller accessibility problems (listed, not failing):\n- ${notes.join('\n- ')}`);
if (failures.length) {
  console.error(`Accessibility check: ${failures.length} serious problem(s)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Accessibility check: no serious or critical problems on the main pages or the classroom screens (WCAG 2.2 A and AA rules).');
