import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CA_NORM_MISSING, NIIP_MISSING, debtStabilisingNica, esSentence, externalSustainability, type ExternalSustainability } from '../src/utils/externalSustainability.ts';
import { OFFICIAL_FIGURES } from '../src/utils/officialHistory.ts';
import { registerEntry } from '../src/data/modelRegister.ts';
import { READY_BY_ID } from '../src/data/toolsCatalog.ts';
import type { Series } from '../src/utils/seriesHistory.ts';

const ser = (id: string, rows: Record<number, number>): Series => ({ id, label: id, unit: '', freq: 'annual', source: 'x', points: Object.entries(rows).map(([y, value]) => ({ date: y, value })) });

test('debt-stabilising non-interest current account: d × (i − g) ÷ (1 + g)', () => {
  // d 50, i 4, g 6: 50 × (−0.02) / 1.06 = −0.94 (a deficit of up to 0.9% of GDP holds debt steady).
  assert.equal(debtStabilisingNica(50, 4, 6), -0.9);
  // d 80, i 6, g 2: 80 × 0.04 / 1.02 = 3.14 (a surplus is needed).
  assert.equal(debtStabilisingNica(80, 6, 2), 3.1);
});

test('the reading: external debt, debt service against reserves and exports, and the stabilising balance on 5-year averages', () => {
  const gdp = { 2018: 100, 2019: 105, 2020: 110.25, 2021: 115.76, 2022: 121.55, 2023: 127.63, 2024: 134.01, 2030: 200 };
  const debt = { 2018: 50, 2019: 52, 2020: 54, 2021: 56, 2022: 58, 2023: 60 };
  const r = externalSustainability({
    currentAccountPct: ser('ca', { 2023: -3, 2024: -2, 2030: 1 }),
    gdpUsd: ser('gdp', gdp),
    externalDebtUsd: ser('d', debt),
    debtServiceUsd: ser('tds', { 2023: 12 }),
    interestUsd: ser('int', { 2019: 2, 2020: 2.08, 2021: 2.16, 2022: 2.24, 2023: 2.32 }),
    reservesUsd: ser('res', { 2023: 30 }),
    exportsUsd: ser('exp', { 2023: 40 }),
  }) as ExternalSustainability;
  assert.equal(r.ok, true);
  assert.deepEqual(r.latest, { year: 2023, currentAccountPct: -3, externalDebtPct: 47, debtServiceToReservesPct: 40, debtServiceToExportsPct: 30 });
  // IMF projection years beyond the World Bank's last year are not used.
  assert.ok(!r.years.some((y) => y.year > 2023));
  const st = r.stabilising!;
  assert.deepEqual(st.years, [2019, 2020, 2021, 2022, 2023]);
  assert.equal(st.interestRatePct, 4);
  assert.equal(st.usdGrowthPct, 5);
  assert.equal(st.requiredPct, -0.4);
  // Actual non-interest CA 2023 = −3 + 2.32 / 127.63 × 100 = −1.2.
  assert.equal(st.actualPct, -1.2);
  assert.equal(st.gapPts, -0.8);
  assert.deepEqual(r.missing, [CA_NORM_MISSING, NIIP_MISSING]);
  const s = esSentence(r, 'Testland');
  assert.match(s, /^Testland: external debt was 47% of GDP in 2023, and that year's debt service took 40% of reserves\./);
  assert.match(s, /a non-interest current account deficit of up to 0\.4% of GDP; in 2023 it was −1\.2%, so the ratio would rise on these averages\.$/);
  assert.ok(!/probab|will default|\d+% chance/i.test(s));
});

test('Missing with the reason: no IDS figures (high income), no GDP, too few years', () => {
  assert.match((externalSustainability({ gdpUsd: ser('gdp', { 2023: 1 }) }) as { reason: string }).reason, /low- and middle-income countries only/);
  assert.match((externalSustainability({ externalDebtUsd: ser('d', { 2023: 1 }) }) as { reason: string }).reason, /GDP in US dollars is not saved/);
  const r = externalSustainability({ gdpUsd: ser('gdp', { 2022: 100, 2023: 110 }), externalDebtUsd: ser('d', { 2022: 40, 2023: 44 }), interestUsd: ser('i', { 2023: 1 }) }) as ExternalSustainability;
  assert.equal(r.stabilising, undefined);
  assert.ok(r.missing.some((m) => /fewer than 3 years/.test(m)));
  assert.ok(r.missing.some((m) => /World Bank publishes none/.test(m)));
});

test('saved figures, register, tool and panel are wired', () => {
  for (const [id, code] of [['external_debt_usd', 'DT.DOD.DECT.CD'], ['ext_debt_service_usd', 'DT.TDS.DECT.CD'], ['ext_interest_usd', 'DT.INT.DECT.CD']])
    assert.ok(OFFICIAL_FIGURES.some((f) => f.id === id && f.code === code && f.source === 'wb'), id);
  assert.equal(registerEntry('external_sustainability')!.status, 'descriptive');
  assert.equal(READY_BY_ID.external_sustainability.target.anchor, 'tool-external-sustainability');
  assert.match(fs.readFileSync('src/components/CountryPage.tsx', 'utf8'), /id="tool-external-sustainability"/);
  assert.match(fs.readFileSync('src/server/routes/analysis.ts', 'utf8'), /\/api\/external-sustainability\/:iso3/);
});
