/**
 * Politics and events for the Politics & Events Agent (Sam, 2026-11-05).
 *
 * Only figures a feed filled, each with the date it was pulled:
 * - GDELT: average news tone for the country over its weekly pull, and the latest headlines.
 * - World Bank Worldwide Governance Indicators: political stability and absence of violence,
 *   as a percentile rank among countries (yearly).
 * - Polymarket: prediction-market odds on contracts that name the country (market prices, not a
 *   forecast by the app).
 *
 * The rules on top (tone bands, stability bands) are stated here and shown with the figures.
 */
import type { OpenDataSnapshot } from '../types/council';

export interface PoliticsFigures {
  tone?: { value: number; pulledAt: string };
  headlines?: Array<{ title: string; source: string; publishedAt: string; url: string }>;
  headlinesPulledAt?: string;
  stability?: { percentile: number; year: string };
  markets?: Array<{ question: string; probabilityPct: number; volumeUsd: number; url: string; change1dPts?: number; change1wPts?: number; change1mPts?: number }>;
  marketsPulledAt?: string;
}

export const GDELT_SHORT = 'GDELT news tone';
export const WGI_SHORT = 'World Bank governance indicators (political stability)';
export const POLYMARKET_SHORT = 'Polymarket';

/** Date in a liveFields label such as "GDELT, pulled 2026-11-02" or "World Bank WGI, 2024". */
const dateIn = (label: string | undefined, re: RegExp) => (label?.match(re) || [])[1] || '';

/** Only figures a feed marked live; nothing built in. Undefined when none is live. */
export function politicsFromSnapshot(snap: OpenDataSnapshot): PoliticsFigures | undefined {
  const lf = snap.liveFields || {};
  const out: PoliticsFigures = {};
  const tone = snap.gdeltMetrics?.averageTone;
  if (lf['gdelt.averageTone'] && typeof tone === 'number' && Number.isFinite(tone)) {
    out.tone = { value: tone, pulledAt: dateIn(lf['gdelt.averageTone'], /(\d{4}-\d{2}-\d{2})/) };
  }
  if (lf['gdelt.topHeadlines'] && snap.gdeltMetrics?.topHeadlines?.length) {
    out.headlines = snap.gdeltMetrics.topHeadlines.slice(0, 3).map((h) => ({ title: h.title, source: h.sourceDomain, publishedAt: h.publishedAt, url: h.url }));
    out.headlinesPulledAt = dateIn(lf['gdelt.topHeadlines'], /(\d{4}-\d{2}-\d{2})/);
  }
  const pct = snap.worldBankIndicators?.politicalStabilityPercentile;
  if (lf['wb.politicalStabilityPercentile'] && typeof pct === 'number' && Number.isFinite(pct)) {
    out.stability = { percentile: pct, year: dateIn(lf['wb.politicalStabilityPercentile'], /((?:19|20)\d{2})/) };
  }
  if (lf['polymarket.contracts']) {
    const name = (snap.countryName || '').replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();
    const iso = new RegExp(`\\b${(snap.iso3 || 'zzz').toLowerCase()}\\b`);
    // Only contracts whose question names the country; regional or global ones say nothing about it.
    const mine = (snap.polymarketContracts || []).filter((c) => {
      const q = c.question.toLowerCase();
      return (name.length > 2 && q.includes(name)) || iso.test(q);
    });
    if (mine.length) {
      out.markets = mine.slice(0, 3).map((c) => ({
        question: c.question,
        probabilityPct: c.probabilityPct,
        volumeUsd: c.volumeUsd,
        url: c.url,
        ...(c.change1dPts !== undefined ? { change1dPts: c.change1dPts } : {}),
        ...(c.change1wPts !== undefined ? { change1wPts: c.change1wPts } : {}),
        ...(c.change1mPts !== undefined ? { change1mPts: c.change1mPts } : {}),
      }));
      out.marketsPulledAt = dateIn(lf['polymarket.contracts'], /(\d{4}-\d{2}-\d{2})/);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export type ToneBand = 'very negative' | 'negative' | 'mixed' | 'positive';

/** GDELT tone runs roughly -10 to +10; most country coverage sits a little below zero. */
export function toneBand(tone: number): ToneBand {
  return tone <= -4 ? 'very negative' : tone <= -1.5 ? 'negative' : tone < 1 ? 'mixed' : 'positive';
}
export const TONE_RULE = 'at or below -4 = very negative, -4 to -1.5 = negative, -1.5 to +1 = mixed, +1 or above = positive';

export type StabilityBand = 'low' | 'below the middle' | 'above the middle' | 'high';

export function stabilityBand(percentile: number): StabilityBand {
  return percentile < 25 ? 'low' : percentile < 50 ? 'below the middle' : percentile < 75 ? 'above the middle' : 'high';
}
export const STABILITY_RULE = 'percentile rank among countries: under 25 = low, 25-50 = below the middle, 50-75 = above the middle, 75 or more = high';

export function formatUsd(v: number): string {
  return v >= 1e9 ? `$${(v / 1e9).toFixed(1)}bn` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}m` : v >= 1e3 ? `$${Math.round(v / 1e3)}k` : `$${Math.round(v)}`;
}
