import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bankSovereign, bsSentence, CONTINGENT_MISSING, STATE_BANKS_MISSING, type BankSovereign } from '../src/utils/bankSovereign.ts';
import type { InvestorBaseReading } from '../src/utils/investorBase.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';

const ys = (pairs: Array<[number, number]>) => pairs.map(([year, value]) => ({ year, value }));
const pct = { foreignOfficial: 5, foreignBanks: 5, foreignNonbanks: 10, domesticCentralBank: 10, domesticBanks: 40, domesticNonbanks: 30 };
const found: InvestorBaseReading = { state: 'found', holders: { year: '2023', totalUsdBn: 100, pct }, lastYear: 2023 };

test('figures with their year and source; share of assets uses the same year; holdings × debt to GDP', () => {
  const r = bankSovereign({
    bankAssetsGdp: ys([[2021, 80], [2022, 90]]),
    claimsGovGdp: ys([[2021, 12], [2022, 18]]),
    capitalAssets: ys([[2022, 9.44]]),
    npl: ys([[2021, 4], [2022, 3.25]]),
    govDebtGdp: ys([[2022, 55], [2023, 60], [2024, 62]]),
    investorBase: found,
    firstProjectionYear: 2024,
  }) as BankSovereign;
  assert.equal(r.ok, true);
  const v = Object.fromEntries(r.rows.map((x) => [x.id, [x.value, x.year]]));
  assert.deepEqual(v, { bankAssets: [90, 2022], claimsGov: [18, 2022], claimsShare: [20, 2022], banksShareDebt: [40, 2023], banksDebtGdp: [24, 2023], capital: [9.4, 2022], npl: [3.3, 2022] });
  assert.deepEqual(r.missing, [STATE_BANKS_MISSING, CONTINGENT_MISSING]);
  assert.ok(r.sources.includes('World Bank GFDD.DI.02'));
  assert.ok(!r.sources.some((s) => s.includes(' ÷ ')));
  assert.equal(
    bsSentence(r, 'Testland'),
    "Testland: bank assets were 90% of GDP in 2022; banks' claims on the central government 18% of GDP in 2022; domestic banks held 40% of government debt in 2023. Bank capital was 9.4% of assets (2022); non-performing loans 3.3% of loans (2022).",
  );
});

test('no share without assets in the same year; no holdings in % of GDP from a projection year', () => {
  const r = bankSovereign({ bankAssetsGdp: ys([[2020, 80]]), claimsGovGdp: ys([[2022, 18]]), govDebtGdp: ys([[2023, 60]]), investorBase: found, firstProjectionYear: 2023 }) as BankSovereign;
  const ids = r.rows.map((x) => x.id);
  assert.ok(!ids.includes('claimsShare'));
  assert.ok(!ids.includes('banksDebtGdp'));
  assert.ok(ids.includes('banksShareDebt'));
});

test('Missing with the reason: not covered, no workbook, unreadable, nothing saved', () => {
  const base = { capitalAssets: ys([[2022, 9]]) };
  const not = bankSovereign({ ...base, investorBase: { state: 'notCovered' } }) as BankSovereign;
  assert.ok(not.missing.some((m) => /emerging and developing economies only/.test(m)));
  assert.ok(not.missing.some((m) => /^Bank assets:/.test(m)));
  const none = bankSovereign({ ...base, investorBase: null }) as BankSovereign;
  assert.ok(none.missing.some((m) => /wp1439\.zip/.test(m)));
  const bad = bankSovereign({ ...base, investorBase: { state: 'unreadable', reason: 'x.xlsx: no sheets' } }) as BankSovereign;
  assert.ok(bad.missing.some((m) => /did not read \(x\.xlsx: no sheets\)/.test(m)));
  assert.equal(bsSentence(not, 'Testland'), 'Testland: only bank soundness figures are saved. Bank capital was 9% of assets (2022); non-performing loans are not published.');
  const empty = bankSovereign({ investorBase: { state: 'notCovered' } });
  assert.equal(empty.ok, false);
  assert.match((empty as { reason: string }).reason, /No bank figures are saved/);
});

test('wired: saved World Bank figures, register, tool, panel, route, translations', () => {
  for (const id of ['bank_assets_gdp', 'bank_claims_gov_gdp', 'bank_capital_assets', 'bank_npl']) assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id), id);
  assert.equal(registerEntry('bank_sovereign')!.status, 'descriptive');
  assert.equal(READY_BY_ID.bank_sovereign.target.anchor, 'tool-bank-sovereign');
  const page = fs.readFileSync('src/components/CountryPage.tsx', 'utf8');
  assert.match(page, /id="tool-bank-sovereign"/);
  assert.match(page, /BankSovereignPanel/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/bank-sovereign\/:iso3/);
  for (const lang of ['es', 'fr']) {
    const t = fs.readFileSync(`src/i18n/${lang}/briefText.ts`, 'utf8');
    assert.ok(t.includes(JSON.stringify(STATE_BANKS_MISSING)), `${lang} state banks`);
    assert.ok(t.includes(JSON.stringify(CONTINGENT_MISSING)), `${lang} contingent`);
  }
});
