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
async function keyboardCheck(page, where, steps = 40) {
  await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => {});
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
console.log('Accessibility check: no serious or critical problems on the main pages (WCAG 2.2 A and AA rules).');
