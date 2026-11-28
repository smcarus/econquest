/**
 * UI journeys: a few things people do end to end, in a real browser against the built app with
 * every data feed down (tests/helpers/offline-fetch.mjs). Each step fails with a plain line.
 *
 * 1. Keyboard: the first Tab reaches "Skip to content", which moves focus to the page.
 * 2. Council chat: ask a question; the question and an answer block appear, with no crash.
 * Your tests: Menu > Models & validation > Your tests registers a test, which is then frozen.
 * 3. One country: each of the four sections opens; History & data holds the forecast panel and the
 *    small gap model, which runs only on typed numbers.
 * Policy review: the What happened after card takes your own change and, with no saved histories,
 *    says why it shows no twin.
 * 4. Settings > Free data keys: save a key, see it masked, check it is not in the keys reply or
 *    the audit log, then remove it.
 * Quests off: Menu > Quests is greyed, the settled forecasts table answers 404, Models & validation
 *    has no Quests view.
 * 5. Sign-in: create the first admin account; the app then asks everyone to sign in; a wrong
 *    password is refused; the right one opens the app.
 * Quests on (a second copy with QUESTS_ENABLED=on): the list, the starter pack, one Quest, and the
 *    Quests view in Models & validation with its chain check.
 * Classes on (a third copy with CLASSES_ENABLED=on, Quests off, sign-in): a teacher makes a class at
 *    phone width and makes student accounts from nicknames.
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
const dataDir = mkdtempSync(path.join(tmpdir(), 'econquest-journeys-'));
let log = '';
/** The built app on a free port, every feed down; `env` adds settings (QUESTS_ENABLED for the Quests run). */
function startServer(env = {}) {
  const port = 4800 + Math.floor(Math.random() * 400);
  const proc = spawn(process.execPath, ['--import', 'tsx', path.join(root, 'server.ts')], {
    cwd: root,
    env: {
      ...process.env,
      NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/offline-fetch.mjs')).href}`,
      NODE_ENV: 'production',
      PORT: String(port),
      DATA_DIR: env.DATA_DIR ?? dataDir,
      SCHEDULE_BACKTESTS: 'off',
      GEMINI_API_KEY: '',
      ECONQUEST_SECRET_KEY: '',
      QUESTS_ENABLED: '',
      CLASSES_ENABLED: '',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  return { proc, base: `http://127.0.0.1:${port}` };
}
async function waitUp({ proc, base }) {
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (proc.exitCode !== null) throw new Error(`server exited early:\n${log}`);
    try {
      if ((await fetch(`${base}/api/ai/runtime-defaults`)).ok) return;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) throw new Error(`server did not start:\n${log}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}
const first = startServer();
const server = first.proc;
const base = first.base;
let questsServer;
let classesServer;

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
  await waitUp(first);
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
    // The tools sit behind a grouped menu; one opens at a time.
    await page.waitForSelector('[data-tool-menu]', { timeout: 15_000 });
    const tabs = await page.locator('[data-country-page] button.ui-tab').count();
    if (tabs !== 4) throw new Error(`the country page has ${tabs} section tabs, expected 4`);

    // Small gap model: offline, the fill button names what is missing and fills nothing; typed numbers draw a path.
    where = 'one country: small gap model';
    if (await page.locator('[data-tool-open="tool-gap-model"]').count()) await page.locator('[data-tool-open="tool-gap-model"]').click();
    else await page.locator('[data-tool-select]').selectOption('tool-gap-model');
    await page.waitForSelector('#tool-gap-model', { state: 'attached', timeout: 15_000 });
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

  await step('what this means for you: your rate and your loan, kept in this browser only', async () => {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: /^What this means for you/ }).first().click();
    const box = page.locator('[data-your-prices]');
    await box.waitFor({ timeout: 15_000 });
    // The groups answer or say why not (offline here); either way nothing crashes.
    await page.waitForFunction(() => !document.querySelector('[data-your-prices]')?.textContent?.includes('Reading the price groups'), null, { timeout: 30_000 });
    await box.locator('[data-loan-field="balance"]').fill('200000');
    await box.locator('[data-loan-field="ratePct"]').fill('6');
    await box.locator('[data-loan-field="years"]').fill('30');
    await box.locator('[data-loan-result]').waitFor({ timeout: 5000 });
    const text = await box.locator('[data-loan-result]').innerText();
    if (!/1,199\.10/.test(text)) throw new Error(`the payment reads "${text.split('\n')[0]}", expected 1,199.10`);
    if (!(await box.locator('[data-loan-cb], [data-loan-cb-missing]').count())) throw new Error('no central bank line and no Missing reason');
    const kept = await page.evaluate(() => window.localStorage.getItem('econquest.yourPrices.v1'));
    if (!kept || !kept.includes('200000')) throw new Error('the loan was not kept in this browser');
    await box.locator('[data-your-prices-clear]').click();
    if (await page.evaluate(() => window.localStorage.getItem('econquest.yourPrices.v1'))) throw new Error('Clear what I entered left something behind');
    await noCrash(page);
    await page.keyboard.press('Escape');
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
  await step('policy review: What happened after shows its card, takes your own change and gives a reason', async () => {
    await page.keyboard.press('Escape');
    const made = await page.request.post(`${base}/api/reviews`, { data: { frame: { iso3: 'BRA', problem: 'Inflation is above target and growth is slowing.', goal: { indicator: 'Headline inflation', direction: 'lower' }, constraints: [], asOf: new Date().toISOString().slice(0, 10) } } });
    if (!made.ok()) throw new Error(`the review was not saved: ${made.status()}`);
    await page.locator('[data-nav-policy="true"]').first().click();
    await page.locator('text=BRA: lower Headline inflation').first().click();
    const card = page.locator('[data-review-part="what-happened"]');
    await card.waitFor({ timeout: 15_000 });
    await card.locator('summary', { hasText: 'Add your own change' }).click();
    const boxes = card.locator('input');
    await boxes.nth(0).fill('2015');
    await boxes.nth(1).fill('New central bank law');
    await boxes.nth(2).fill('https://example.org/law');
    await card.getByRole('button', { name: 'Save', exact: true }).click();
    await card.locator('text=Saved.').waitFor({ timeout: 15_000 });
    await card.getByRole('button', { name: 'Show what happened after' }).click();
    // No saved yearly histories offline, so the card says why instead of a number.
    await card.locator('[data-missing="true"]').waitFor({ timeout: 15_000 });
    await noCrash(page);
  });

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

  await step('quests off: greyed in the menu, no Quests view in Models & validation', async () => {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const item = page.getByRole('menuitem', { name: /^Quests/ }).first();
    if (!(await item.isDisabled())) throw new Error('Menu > Quests can be opened while Quests are off');
    await page.keyboard.press('Escape');
    if ((await (await page.request.get(`${base}/api/quests`)).json()).enabled !== false) throw new Error('/api/quests says Quests are on');
    if ((await page.request.get(`${base}/api/export/quests/forecasts.csv`)).status() !== 404) throw new Error('the settled forecasts table answered while Quests are off');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: /^Models & validation/ }).first().click();
    await page.locator('[data-test-ledger-toggle]').waitFor({ timeout: 15_000 });
    if (await page.locator('[data-quest-record-toggle]').count()) throw new Error('Models & validation shows a Quests view while Quests are off');
    if (await page.locator('[data-quest-links]').count()) throw new Error('a link to Quests shows while Quests are off');
    await page.keyboard.press('Escape');
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

  // Quests switched on: a second copy of the app with QUESTS_ENABLED=on and its own data folder.
  await step('quests on: the list, a pack, one Quest, the Quests view in Models & validation, and a link from a country page', async () => {
    questsServer = startServer({ QUESTS_ENABLED: 'on', CLASSES_ENABLED: 'on', DATA_DIR: mkdtempSync(path.join(tmpdir(), 'econquest-journeys-quests-')) });
    await waitUp(questsServer);
    const qp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    watch(qp);
    await qp.goto(questsServer.base, { waitUntil: 'networkidle', timeout: 90_000 });
    await qp.getByRole('button', { name: 'Menu', exact: true }).click();
    await qp.getByRole('menuitem', { name: /^Quests/ }).first().click();
    const box = qp.locator('[data-quests]');
    await box.waitFor({ timeout: 15_000 });
    await box.locator('[data-quest-row]').first().waitFor({ timeout: 15_000 });
    await box.locator('[data-quests-tab="maint"]').click();
    await box.locator('[data-quest-maintainer-counts]').waitFor({ timeout: 15_000 });
    if (!(await box.locator('[data-quest-maintainer-item="draftsToApprove"]').count())) throw new Error('the maintainer dashboard does not list the drafts ready to approve');
    // Replays (Q5): four packs, week by week; with the feeds down a try says why, never a made-up figure.
    await box.locator('[data-quests-tab="replay"]').click();
    await box.locator('[data-quest-replay-week="4"]').waitFor({ timeout: 15_000 });
    if ((await box.locator('[data-quest-replay-pack] option').count()) !== 4) throw new Error('the Replays tab does not list four packs');
    // Classes are on in this copy, but sign-in is off: the tab says classes need accounts.
    await box.locator('[data-quests-tab="classes"]').click();
    await box.locator('[data-classes-off]').waitFor({ timeout: 15_000 });
    await box.locator('[data-quests-tab="quests"]').click();
    await box.locator('[data-quests-pack]').selectOption('starter');
    await box.locator('[data-quest-pack-group]').first().waitFor({ timeout: 5000 });
    await box.locator('[data-quest-row]').first().click();
    await box.locator('[data-quest-figures], [data-quest-log], [data-quest-argument]').first().waitFor({ timeout: 15_000 });
    await noCrash(qp);
    const report = await box.locator('[data-quest-report-data]').getAttribute('href');
    if (!report || !report.includes('/issues/new?title=Quest%20data%20problem')) throw new Error('the Quest has no report-a-data-problem link');
    await qp.keyboard.press('Escape');
    const settled = await (await qp.request.get(`${questsServer.base}/api/quests/settled`)).json();
    if (settled.enabled !== true || !Array.isArray(settled.rows)) throw new Error('/api/quests/settled did not answer with Quests on');
    await qp.getByRole('button', { name: 'Menu', exact: true }).click();
    await qp.getByRole('menuitem', { name: /^Models & validation/ }).first().click();
    await qp.locator('[data-quest-record-toggle]').click();
    await qp.locator('[data-quest-track-record] [data-quest-chain]').waitFor({ timeout: 15_000 });
    await noCrash(qp);
    await qp.keyboard.press('Escape');
    // A country page links to the Quests about that country; the link opens the Quest.
    await qp.getByRole('button', { name: 'Research', exact: true }).first().click();
    await qp.locator('[data-research-scope] button[data-scope="country"]').click();
    await qp.waitForSelector('[data-country-page]', { timeout: 15_000 });
    await qp.locator('#country-select').selectOption('BRA');
    const link = qp.locator('[data-quest-links="country"] [data-quest-link]').first();
    await link.waitFor({ timeout: 15_000 });
    await link.click();
    await qp.locator('[data-quests]').getByRole('button', { name: 'Back to all Quests' }).waitFor({ timeout: 15_000 });
    await noCrash(qp);
    await qp.close();
  });

  // Classes on, Quests off, with sign-in: Menu > Quests opens on the Classes tab alone.
  await step('classes: with Quests off, a teacher makes a class, student accounts, a class Quest and a sensitive assignment', async () => {
    classesServer = startServer({ CLASSES_ENABLED: 'on', DATA_DIR: mkdtempSync(path.join(tmpdir(), 'econquest-journeys-classes-')) });
    await waitUp(classesServer);
    const password = 'a long journey test passphrase';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const cp = await ctx.newPage();
    watch(cp);
    const made = await cp.request.post(`${classesServer.base}/api/auth/setup`, { data: { username: 'prof', displayName: 'Professor', password } });
    if (!made.ok()) throw new Error(`could not create the first account: HTTP ${made.status()}`);
    // Making the first account signs this browser in.
    await cp.goto(classesServer.base, { waitUntil: 'networkidle', timeout: 90_000 });
    await cp.getByRole('button', { name: 'Menu', exact: true }).click();
    await cp.getByRole('menuitem', { name: /^Quests/ }).first().click();
    const box = cp.locator('[data-quests]');
    try {
      await box.locator('[data-classes]').waitFor({ timeout: 15_000 });
      await box.locator('[data-classes-name]').fill('Macro 101');
      // Name the zone, so the class does not depend on the browser's own time zone.
      await box.locator('[data-classes-tz]').fill('America/Chicago');
      await box.locator('[data-classes-term]').fill('Spring 2027');
      await box.locator('[data-classes-starts]').fill('2027-01-11');
      await box.locator('[data-classes-ends]').fill('2027-05-07');
      await box.locator('[data-classes-make]').click();
      const code = (await box.locator('[data-class-code]').first().textContent({ timeout: 15_000 })) || '';
      if (!/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code.trim())) throw new Error(`the join code looks wrong: "${code}"`);
      await box.locator('[data-class-nicknames]').fill('José\nAmina');
      await box.locator('[data-class-make-students]').click();
      await box.locator('[data-class-created]').waitFor({ timeout: 15_000 });
      await box.locator('[data-class-member="jose"]').waitFor({ timeout: 15_000 });
      // Q4: a class Quest from the fixed rule types, with a level.
      const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
      await box.locator('[data-class-quest-new]').click();
      await box.locator('[data-class-quest-level]').selectOption('intermediate');
      await box.locator('[data-class-quest-title]').fill('Will Brazil’s policy rate be lower at the end of term?');
      await box.locator('[data-class-quest-summary]').fill('The central bank meets twice before the end of term.');
      await box.locator('[data-class-quest-closes]').fill(day(14));
      await box.locator('[data-class-quest-country]').fill('BRA');
      await box.locator('[data-class-quest-op]').selectOption('lower');
      await box.locator('[data-class-quest-on]').fill(day(40));
      await box.locator('[data-class-quest-save]').click();
      await box.locator('[data-class-quest]').first().waitFor({ timeout: 15_000 });
      // Q6: set it for the class as a sensitive topic; the notice says names are hidden.
      await box.locator('[data-class-new-assignment]').click();
      const pick = box.locator('[data-class-assignment-quest]');
      await pick.locator('option', { hasText: 'Brazil' }).first().waitFor({ state: 'attached', timeout: 15_000 });
      const qid = await pick.locator('option', { hasText: 'Brazil' }).first().getAttribute('value');
      await pick.selectOption(qid || '');
      await box.locator('[data-class-assignment-date]').fill(day(7));
      await box.locator('[data-class-assignment-sensitive]').check();
      await box.locator('[data-class-assignment-save]').click();
      await box.locator('[data-class-sensitive-on]').first().waitFor({ timeout: 15_000 });
    } catch (err) {
      // Say on one line what the screen showed, so a failure on a CI machine can be read from the log.
      const alerts = await box.locator('[role="alert"]').allTextContents().catch(() => []);
      const shown = ((await box.textContent({ timeout: 2_000 }).catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 600);
      throw new Error(`${String(err?.message || err).split('\n')[0]} | alerts: ${JSON.stringify(alerts)} | screen: ${shown}`);
    }
    await noCrash(cp);
    await ctx.close();
  });
} catch (err) {
  failures.push(`journeys failed to run: ${err?.stack || err}`);
} finally {
  await browser?.close();
  server.kill();
  questsServer?.proc.kill();
  classesServer?.proc.kill();
}

if (failures.length) {
  console.error(`UI journeys: ${failures.length} problem(s)\n- ${[...new Set(failures)].join('\n- ')}`);
  process.exit(1);
}
console.log(`UI journeys: ${passed.length} passed (${passed.join('; ')}).`);
