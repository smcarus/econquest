/**
 * IMF monthly exchange rates (LI3): units of a country's currency per US dollar, monthly average,
 * for currencies the ECB does not publish and no central bank feed in the app covers (for example
 * the naira, the Kenyan shilling, the cedi, the Egyptian pound and the taka).
 *
 * Source: the IMF data portal's free SDMX 3.0 API (api.imf.org, no key), dataset ER (exchange
 * rates, IMF.STA), found by the IMF's own code names (src/utils/imfMonthly.ts): "domestic currency
 * per US dollar" and "period average", monthly. The series key can be set in .env (IMF_FX_KEY,
 * {ISO3} for the country) if the names differ. The ECB daily run and the central bank daily rates
 * (src/utils/fxExtra.ts) win wherever they have the currency; this is the third choice, and it is
 * monthly, so the chart says so.
 *
 * Browser-safe, pure.
 */
import type { ImfMonthlyPull, ImfMonthlySpec } from './imfMonthly';
import type { Series } from './seriesHistory';

export const IMF_FX_SPEC: ImfMonthlySpec = {
  flow: 'ER',
  short: 'IMF ER',
  long: 'IMF Exchange Rates (ER dataset), domestic currency per US dollar, monthly average',
  env: 'IMF_FX_KEY',
  want: [/(domestic|national) currency per u\.?\s?s\.? dollar|per us dollar/i, /period average|average of period|^average\b/i],
  avoid: /end of period|end-of-period|\bindex\b|special drawing|\bSDR\b|per euro|effective|real\b/i,
  accept: (l) => /per u\.?\s?s\.? dollar|USD_XDC|XDC_USD/i.test(l) && /average/i.test(l),
  decimals: 6,
};

/** The saved IMF monthly rate for a country as an exchange rate history, or null. */
export function imfFxSeries(pull: ImfMonthlyPull | null | undefined, iso3: string, ccy: string): Series | null {
  const s = pull?.series?.[String(iso3 || '').toUpperCase()];
  const code = String(ccy || '').trim().toUpperCase();
  if (!s || !code) return null;
  const points = s.points.filter((p) => Number.isFinite(p.value) && p.value > 0).map((p) => ({ date: p.period, value: p.value }));
  if (!points.length) return null;
  return {
    id: 'fx_per_usd',
    label: 'Exchange rate',
    unit: `${code} per USD`,
    freq: 'monthly',
    source: s.long,
    pulledAt: pull!.pulledAt,
    points,
    about: `Units of ${code} per US dollar, the average of each month as the IMF publishes it. A higher number is a weaker ${code}. Monthly, because no daily official rate for ${code} is in the app.`,
  };
}
