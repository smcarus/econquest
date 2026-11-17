/**
 * IMF monthly policy rates (LI4): found by IMF names, used only where the app does not take the
 * BIS rate, and kept out of the tools built on BIS rate moves. IMF codes below are made up.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImfCpiStructure } from '../src/utils/imfCpi.ts';
import { imfMonthlyKey, type ImfMonthlyPull } from '../src/utils/imfMonthly.ts';
import { IMF_POLICY_SPEC, imfPolicyRateFor, imfPolicySeries } from '../src/utils/imfPolicyRate.ts';
import { countrySeries } from '../src/utils/seriesHistory.ts';
import { hasFigure, toLive } from '../src/utils/liveFigures.ts';
import { policyTag } from '../src/utils/divergences.ts';
import { WORLD_STEPS } from '../src/utils/preload.ts';
import { SOURCE_IDS } from '../src/utils/connectionCheck.ts';
import type { LiveWatchlistItem } from '../src/types/council.ts';

const urn = (cl: string) => `urn:sdmx:org.sdmx.infomodel.codelist.Codelist=IMF.STA:${cl}(1.0.0)`;
const structure = {
  data: {
    dataStructures: [
      {
        id: 'DSD_MFS_IR',
        dataStructureComponents: {
          dimensionList: {
            dimensions: [
              { id: 'COUNTRY', position: 0, localRepresentation: { enumeration: urn('CL_COUNTRY') } },
              { id: 'INDICATOR', position: 1, localRepresentation: { enumeration: urn('CL_INDICATOR') } },
              { id: 'FREQUENCY', position: 2, localRepresentation: { enumeration: urn('CL_FREQ') } },
            ],
          },
        },
      },
    ],
    codelists: [
      { id: 'CL_COUNTRY', codes: [{ id: 'EGY', name: 'Egypt' }] },
      {
        id: 'CL_INDICATOR',
        codes: [
          { id: 'LR', name: 'Lending rate, Percent per annum' },
          { id: 'DR', name: 'Deposit rate, Percent per annum' },
          { id: 'MPRR', name: 'Monetary policy-related interest rate, Percent per annum' },
          { id: 'TB', name: 'Treasury bill rate, Percent per annum' },
        ],
      },
      { id: 'CL_FREQ', codes: [{ id: 'M', name: 'Monthly' }] },
    ],
  },
};

test('IMF policy: the monetary policy-related rate picked by IMF name; not lending, deposit or Treasury bill rates', () => {
  assert.equal(imfMonthlyKey(IMF_POLICY_SPEC, parseImfCpiStructure(structure)!, 'EGY').key, 'EGY.MPRR.M');
});

const pull: ImfMonthlyPull = {
  pulledAt: '2026-11-17T00:00:00Z',
  series: {
    EGY: {
      key: 'EGY.MPRR.M',
      short: 'IMF MFS',
      long: 'IMF MFS long (series EGY.MPRR.M)',
      points: [
        { period: '2025-09', value: 24 },
        { period: '2026-08', value: 22 },
        { period: '2026-09', value: 21 },
      ],
    },
  },
};

test('IMF policy: latest rate, 12-month change, and out of date after four months', () => {
  const r = imfPolicyRateFor(pull, 'egy', new Date('2026-11-17'))!;
  assert.equal(r.ratePct, 21);
  assert.equal(r.date, '2026-09');
  assert.equal(r.change12mPts, -3);
  assert.equal(r.stale, false);
  assert.equal(imfPolicyRateFor(pull, 'EGY', new Date('2027-03-01'))!.stale, true);
  assert.equal(imfPolicyRateFor(pull, 'KEN'), null);
  assert.equal(imfPolicySeries(pull, 'EGY')!.freq, 'monthly');
});

test('IMF policy: the history uses it only where the app does not take the BIS rate', () => {
  const policy = (iso3: string, inputs: Parameters<typeof countrySeries>[1]) => countrySeries(iso3, inputs).series.find((x) => x.id === 'policy_rate');
  assert.equal(policy('EGY', { imfPolicy: pull })?.source, 'IMF MFS long (series EGY.MPRR.M)');
  assert.ok(countrySeries('EGY', {}).missing.some((x) => x.id === 'policy_rate'), 'no IMF copy: Missing as before');
  // Brazil is a BIS country: an IMF copy for it is never used.
  const bra: ImfMonthlyPull = { ...pull, series: { BRA: { ...pull.series.EGY, key: 'BRA.MPRR.M' } } };
  assert.equal(policy('BRA', { imfPolicy: bra }), undefined);
});

test('IMF policy: a row with the IMF rate keeps its figure and says the source; BIS-only tools still see no BIS rate', () => {
  const row = { iso3: 'EGY', countryName: 'Egypt', policyRatePct: 21, policyRateSource: 'imf', policyRateDate: '2026-09' } as LiveWatchlistItem;
  assert.equal(hasFigure(row, 'policy'), true);
  assert.equal(toLive(row).policyRatePct, 21);
  assert.deepEqual(policyTag(row), { q: 'live', src: 'IMF monthly, 2026-09' });
  assert.equal(hasFigure({ ...row, policyRateSource: 'sample' }, 'policy'), false);
});

test('IMF policy: the daily run asks after the BIS step, and check:data has a row', () => {
  const bis = WORLD_STEPS.findIndex((s) => s.id === 'world:bis');
  assert.equal(WORLD_STEPS.findIndex((s) => s.id === 'world:imf_policy'), bis + 1);
  assert.ok(SOURCE_IDS.includes('imf_policy' as never));
});
