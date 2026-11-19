/**
 * Accessibility check: opens the main pages of the built app in a real browser (every data feed
 * down, as in the UI smoke test) and runs axe-core, the open-source rule set most accessibility
 * checkers use, against WCAG 2.1 levels A and AA.
 *
 * The check fails on any "serious" or "critical" problem: things that stop a screen-reader or
 * keyboard user, such as a button with no name, a form field with no label, or text too faint to
 * read. Smaller ("moderate" and "minor") problems are listed but do not fail the run.
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

const port = 4800 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-a11y-'));
let log = '';
const server = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
  cwd: root,
  env: {
    ...process.env,
    NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/offline-fetch.mjs')).href}`,
    NODE_ENV: 'production',
    PORT: String(port),
    DATA_DIR: dataDir,
    SCHEDULE_BACKTESTS: 'off',
    GEMINI_API_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

const failures = [];
const notes = [];
let browser;

/** Runs axe on what the page shows now and sorts each problem into failures or notes. */
async function scan(page, where) {
  await page.waitForTimeout(600);
  await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
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

try {
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (server.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      if ((await fetch(`${base}/api/ai/runtime-defaults`)).ok) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`server did not start:\n${log}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});

  // Laptop width: the pages most people use.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 90_000 });
  await scan(page, 'Workspace');

  for (const scope of ['country', 'compare', 'portfolio']) {
    await page.getByRole('button', { name: 'Research', exact: true }).first().click();
    await page.waitForTimeout(200);
    await page.locator(`[data-research-scope] button[data-scope="${scope}"]`).click();
    await scan(page, `Research (${scope})`);
  }

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
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.goto(base, { waitUntil: 'networkidle', timeout: 90_000 });
  await scan(phone, 'Phone: Workspace');
  await phone.close();

  // The popped-out watchlist.
  const pop = await browser.newPage();
  await pop.goto(`${base}/?view=watchlist`, { waitUntil: 'networkidle', timeout: 60_000 });
  await scan(pop, 'Pop-out watchlist');
} catch (err) {
  failures.push(`accessibility run failed: ${err?.stack || err}`);
} finally {
  await browser?.close();
  server.kill();
}

if (notes.length) console.log(`Smaller accessibility problems (listed, not failing):\n- ${notes.join('\n- ')}`);
if (failures.length) {
  console.error(`Accessibility check: ${failures.length} serious problem(s)\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Accessibility check: no serious or critical problems on the main pages (WCAG 2.1 A and AA rules).');
