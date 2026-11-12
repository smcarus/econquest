/**
 * UI journeys: a few things people do end to end, in a real browser against the built app with
 * every data feed down (tests/helpers/offline-fetch.mjs). Each step fails with a plain line.
 *
 * 1. Keyboard: the first Tab reaches "Skip to content", which moves focus to the page.
 * 2. Council chat: ask a question; the question and an answer block appear, with no crash.
 * Your tests: Menu > Models & validation > Your tests registers a test, which is then frozen.
 * 3. One country: each of the four sections opens; History & data holds the forecast panel and the
 *    small gap model, which runs only on typed numbers.
 * 4. Settings > Free data keys: save a key, see it masked, check it is not in the keys reply or
 *    the audit log, then remove it.
 * 5. Sign-in: create the first admin account; the app then asks everyone to sign in; a wrong
 *    password is refused; the right one opens the app.
 *
 * Run after `npm run build`:  npm run test:journeys
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!existsSync(path.join(root, 'dist/index.html'))) {
  console.error('Build first: npm run build');
  process.exit(1);
}
const port = 4800 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-journeys-'));
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
    ECONQUEST_SECRET_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

const failures = [];
const passed = [];
let browser;
let where = 'start';
const watch = (page) => {
  page.on('pageerror', (e) => failures.push(`${where}: page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && m.text().startsWith('[panel-error]')) failures.push(`${where}: ${m.text().split('\n')[0]}`);
  });
};
const noCrash = async (page) => {
  const crashed = await page.$$eval('[data-panel-error]', (els) => els.map((e) => e.getAttribute('data-panel-error')));
  for (const name of crashed) failures.push(`${where}: "${name}" showed its crash note`);
  const text = await page.innerText('body');
  const bad = text.match(/[^\n]{0,40}\b(NaN|undefined|Infinity)\b[^\n]{0,40}/);
  if (bad) failures.push(`${where}: shows "${bad[0].trim()}"`);
};
const step = async (name, fn) => {
  where = name;
  const before = failures.length;
  try {
    await fn();
  } catch (err) {
    failures.push(`${name}: ${String(err?.message || err).split('\n')[0]}`);
  }
  if (failures.length === before) passed.push(name);
};

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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watch(page);
  await page.goto(base, { waitUntil: 'networkidle', timeout: 90_000 });

  await step('keyboard: skip link', async () => {
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (first !== 'Skip to content') throw new Error(`the first Tab reached "${first}", not "Skip to content"`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.id === 'main-content', null, { timeout: 5000 });
  });

  await step('council chat: ask a question', async () => {
    await page.locator('#council-question').fill("Is Turkey's central bank behind the curve?");
    await page.locator('#council-question').press('Enter');
    await page.waitForSelector('[data-chat-user]', { timeout: 15_000 });
    await page.waitForSelector('[data-council-result="true"]', { timeout: 90_000 });
    await noCrash(page);
  });

  await step('one country: four sections', async () => {
    await page.getByRole('button', { name: 'Research', exact: true }).first().click();
    await page.locator('[data-research-scope] button[data-scope="country"]').click();
    await page.waitForSelector('[data-country-page]', { timeout: 15_000 }).catch(async (e) => {
      throw new Error(`${e.message.split('\n')[0]}; the page says: ${(await page.innerText('main')).replace(/\s+/g, ' ').slice(0, 300)}`);
    });
    for (const name of ['Summary', 'Markets & signals', 'History & data', 'Sources']) {
      where = `one country: ${name}`;
      await page.locator('[data-country-page] button.ui-tab', { hasText: name }).first().click();
      await page.waitForTimeout(500);
      await noCrash(page);
    }
    where = 'one country: History & data';
    await page.locator('[data-country-page] button.ui-tab', { hasText: 'History & data' }).first().click();
    await page.waitForSelector('#tool-forecast', { state: 'attached', timeout: 15_000 });
    const tabs = await page.locator('[data-country-page] button.ui-tab').count();
    if (tabs !== 4) throw new Error(`the country page has ${tabs} section tabs, expected 4`);

    // Small gap model: offline, the fill button names what is missing and fills nothing; typed numbers draw a path.
    where = 'one country: small gap model';
    const gm = page.locator('[data-gap-model]');
    await gm.waitFor({ timeout: 15_000 });
    await gm.locator('[data-gap-fill]').click();
    if ((await gm.locator('[data-gap-fill-note]').count()) !== 4) throw new Error('the fill button did not explain each starting value');
    if ((await gm.locator('[data-gap-input="y0"]').inputValue()) !== '') throw new Error('the fill button filled an output gap with the feeds down');
    const typed = { b1: '0.8', b2: '0.1', b3: '0.05', c1: '0.7', c2: '0.2', c3: '0.1', rho: '0.7', phiP: '1.5', phiY: '0.5', d1: '0.8', d2: '0.3', rStar: '1', pStar: '2', iForeign: '3', y0: '0', p0: '3', i0: '4', q0: '0' };
    for (const [k, v] of Object.entries(typed)) await gm.locator(`[data-gap-input="${k}"]`).fill(v);
    await gm.locator('[data-gap-result]').waitFor({ timeout: 5000 });
    if (await gm.locator('[data-gap-missing]').count()) throw new Error('the gap model still lists missing inputs');
    if (!(await gm.locator('[data-gap-explain]').count())) throw new Error('the gap model has no Ask the council button');
    await noCrash(page);
  });

  await step('your tests: register, freeze and run one', async () => {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: /^Models & validation/ }).first().click();
    await page.locator('[data-your-tests-toggle]').click();
    const box = page.locator('[data-your-tests]');
    await box.waitFor({ timeout: 15_000 });
    await box.locator('[data-your-test-new]').click();
    await box.locator('[data-your-test-save]').click();
    await box.locator('[data-your-test-problems]').waitFor({ timeout: 5000 });
    await box.locator('[data-your-test-field="name"]').fill('Journey test');
    await box.locator('[data-your-test-field="method"]').selectOption('cycle_clock');
    await box.locator('[data-your-test-field="hypothesis"]').fill('A hike after a hold is followed by another hike within six months.');
    await box.locator('[data-your-test-param="holdAfterMonths"]').fill('6');
    await box.locator('[data-your-test-param="windowMonths"]').fill('6');
    await box.locator('[data-your-test-field="from"]').fill('1995-01');
    for (const [k, v] of [['minCases', '30'], ['minLiftPts', '10'], ['maxPValue', '0.05']]) await box.locator(`[data-your-test-pass="${k}"]`).fill(v);
    await box.locator('[data-your-test-save]').click();
    await box.locator('[data-your-test-saved]').waitFor({ timeout: 5000 });
    if (!(await box.locator('[data-your-test-list]').innerText()).includes('mine_journey_test')) throw new Error('the registered test is not listed');
    const again = await page.evaluate(async () => (await fetch('/api/user-tests/mine_journey_test', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status);
    if (again !== 405) throw new Error(`editing a registered test answered ${again}, expected 405`);
    // Running it (on the recorded replies the test server answers with): it ends with a verdict or says why not,
    // and a second run leaves a recorded verdict exactly as it was.
    const runOnce = async () => {
      await box.locator('[data-your-tests-run]').click();
      await page.waitForFunction(async () => !(await (await fetch('/api/user-tests')).json()).running, null, { timeout: 60_000, polling: 1000 });
      return page.evaluate(async () => (await fetch('/api/user-tests')).json());
    };
    const first = await runOnce();
    const verdict = first.results?.['mine_journey_test v1'];
    if (!verdict && !first.lastRun?.problems?.length) throw new Error('the run gave neither a verdict nor a reason');
    if (verdict) {
      await box.locator('[data-your-test-result="mine_journey_test v1"]').waitFor({ timeout: 10_000 });
      const second = await runOnce();
      if (JSON.stringify(second.results['mine_journey_test v1']) !== JSON.stringify(verdict)) throw new Error('a second run changed the recorded verdict');
    }
    await noCrash(page);
    await page.keyboard.press('Escape');
  });

  const fakeKey = 'abcdef0123456789abcdef0123456789';
  await step('settings: save, mask and remove a key', async () => {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: /^Settings/ }).first().click();
    await page.locator('[data-settings-tab="keys"]').click();
    const row = page.locator('[data-settings-key="FRED_API_KEY"]');
    await row.waitFor({ timeout: 15_000 });
    await row.locator('input').fill(fakeKey);
    await row.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForSelector('[data-settings-key="FRED_API_KEY"][data-source="app"]', { timeout: 15_000 }).catch(async (e) => {
      throw new Error(`${e.message.split('\n')[0]}; the row says: ${(await row.innerText()).replace(/\s+/g, ' ').slice(-300)}`);
    });
    if ((await row.innerText()).includes(fakeKey)) throw new Error('the saved key is shown in full');
    if ((await row.locator('input').inputValue()) !== '') throw new Error('the key box was not cleared after saving');
    const keys = await (await page.request.get(`${base}/api/settings/keys`)).text();
    if (keys.includes(fakeKey)) throw new Error('the keys reply holds the key in full');
    const audit = await (await page.request.get(`${base}/api/audit`)).text();
    if (audit.includes(fakeKey)) throw new Error('the audit log holds the key');
    await row.getByRole('button', { name: 'Remove', exact: true }).click();
    await page.waitForSelector('[data-settings-key="FRED_API_KEY"][data-source="none"]', { timeout: 15_000 });
    await page.keyboard.press('Escape');
  });

  await step('language: French, then Portuguese load on their own, then back to English', async () => {
    await page.keyboard.press('Escape');
    const button = page.locator('button[data-lang]');
    await button.click();
    await page.waitForSelector('button[data-lang="es"]', { timeout: 10_000 });
    await button.click();
    await page.waitForSelector('button[data-lang="fr"]', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Recherche', exact: true }).first().waitFor({ timeout: 15_000 });
    const lang = await page.evaluate(() => document.documentElement.lang);
    if (lang !== 'fr') throw new Error(`the page says lang="${lang}", not "fr"`);
    await noCrash(page);
    await button.click();
    await page.waitForSelector('button[data-lang="pt"]', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Pesquisa', exact: true }).first().waitFor({ timeout: 15_000 });
    const lang2 = await page.evaluate(() => document.documentElement.lang);
    if (lang2 !== 'pt') throw new Error(`the page says lang="${lang2}", not "pt"`);
    await noCrash(page);
    await button.click();
    await page.getByRole('button', { name: 'Research', exact: true }).first().waitFor({ timeout: 10_000 });
  });

  await step('sign-in: first account, then everyone signs in', async () => {
    const password = 'a long journey test passphrase';
    const made = await page.request.post(`${base}/api/auth/setup`, { data: { username: 'tester', displayName: 'Journey Test', password } });
    if (!made.ok()) throw new Error(`could not create the first account: HTTP ${made.status()} ${await made.text()}`);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p = await ctx.newPage();
    watch(p);
    await p.goto(base, { waitUntil: 'networkidle', timeout: 60_000 });
    await p.getByRole('heading', { name: 'Sign in to EconQuest' }).waitFor({ timeout: 15_000 });
    await p.locator('#signin-username').fill('tester');
    await p.locator('#signin-password').fill('not the password at all');
    await p.getByRole('button', { name: 'Sign in', exact: true }).click();
    await p.getByRole('alert').waitFor({ timeout: 10_000 });
    await p.locator('#signin-password').fill(password);
    await p.getByRole('button', { name: 'Sign in', exact: true }).click();
    await p.getByRole('button', { name: 'Menu', exact: true }).waitFor({ timeout: 30_000 });
    await ctx.close();
  });
} catch (err) {
  failures.push(`journeys failed to run: ${err?.stack || err}`);
} finally {
  await browser?.close();
  server.kill();
}

if (failures.length) {
  console.error(`UI journeys: ${failures.length} problem(s)\n- ${[...new Set(failures)].join('\n- ')}`);
  process.exit(1);
}
console.log(`UI journeys: ${passed.length} passed (${passed.join('; ')}).`);
