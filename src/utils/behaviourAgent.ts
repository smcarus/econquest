/**
 * Behavioural Finance Agent (G32, Sam chose it 9 November 2026). It describes herding and sentiment
 * from figures the app already saves, and never forecasts from them:
 *
 * - Crowding: CFTC leveraged-fund positioning against its own last three years (percentile). The
 *   crowding-unwind rule has its own pre-registered test (cftc_crowding), so this figure points to
 *   its badge in Menu > Models & validation.
 * - Crowd odds: Polymarket contracts that name the country, with their weekly move. Kalshi odds are
 *   not saved per country, so that line reads Missing.
 * - Sentiment: the European Commission's consumer confidence and economic sentiment indicator
 *   (EU members), each placed against its own saved history (percentile, window stated).
 * - Households' price expectations (EC consumer survey, balance of answers) with their 12-month
 *   change, and the comparison with market-implied inflation where a breakeven is saved. The app
 *   saves breakevens for the United States only, and the EC survey covers EU members only, so
 *   today the comparison reads Missing everywhere and says why.
 * - The Timing Agent's one-line reading for the same country.
 *
 * Every reading that is not already covered by a tested rule says "Description, not a tested
 * signal". The claim that rising household expectations come before higher inflation is tested by
 * the pre-registered inflation_expectations_lead test before the agent makes it.
 */
import type { LiveWatchlistItem } from '../types/council';
import type { AgentAnswer, AgentFigure, AgentFinding } from './askCouncil';
import { CFTC_LABEL, ordinal, positioningLabel } from './cftcPositioning';
import { EU_SURVEY_SOURCE, euSurveyGeo, type EuSurveyLatest } from './euSurveys';
import { timingSetup, timingSignals } from './timingAgent';
import { oddsMoveText } from './oddsMoves';

export const BEHAVIOUR_AGENT_NAME = 'Behavioural Finance';
export const NOT_TESTED = 'Description, not a tested signal';
/** A survey reading in the top or bottom tenth of its own history counts as an extreme. */
export const SURVEY_EXTREME_PCT = 10;
/** Crowd odds this close to 0% or 100% count as near-certain. */
export const ODDS_EXTREME_PCT = 90;
export const KALSHI_MISSING = 'Kalshi odds are not saved per country, so only Polymarket contracts are read';
export const BREAKEVEN_MISSING_EU = 'no market-implied inflation (breakeven) is saved for this country; the app saves breakevens for the United States only';
export const SURVEY_MISSING_NON_EU = "the European Commission's household survey covers EU members only";
export const CROWDING_BADGE = 'crowding-unwind rule has a pre-registered test (cftc_crowding); Menu > Models & validation shows its badge';
export const EXPECTATIONS_TEST = 'the claim that rising expectations come before higher inflation has a pre-registered test (inflation_expectations_lead) and is not made until it passes';

const sg = (v: number, d = 1) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)}`;

function extremeWord(pct: number): string | undefined {
  if (pct >= 100 - SURVEY_EXTREME_PCT) return 'near the top of its range';
  if (pct <= SURVEY_EXTREME_PCT) return 'near the bottom of its range';
  return undefined;
}

function surveyFigure(a: EuSurveyLatest, label: string): { figure: AgentFigure; text: string; extreme: number } {
  const value = a.kind === 'index' ? `${a.value.toFixed(1)} (long-term average = 100)` : `balance ${sg(a.value)}`;
  const pct = a.percentile;
  const where = pct ? `${ordinal(pct.pct)} percentile of ${pct.months} months since ${pct.from}` : '';
  const ext = pct ? extremeWord(pct.pct) : undefined;
  return {
    figure: { label: `${label}, ${a.period}`, value: where ? `${value}; ${where}` : value, source: `${EU_SURVEY_SOURCE}; ${NOT_TESTED}`, tag: 'official' },
    text: `${label} is ${value}${where ? `, the ${where}${ext ? `, ${ext}` : ''}` : ''} (${a.period}).`,
    extreme: pct && ext ? Math.abs(pct.pct - 50) / 50 : 0,
  };
}

export function behaviourReadings(it: LiveWatchlistItem, now: Date): { figures: AgentFigure[]; parts: string[]; missing: string[]; weight: number } {
  const figures: AgentFigure[] = [];
  const parts: string[] = [];
  const missing: string[] = [];
  let weight = 0;
  const name = it.countryName;

  // Crowding (CFTC), the one input with its own tested rule.
  const c = it.cftc;
  if (c?.percentile !== undefined) {
    const label = positioningLabel(c.percentile);
    figures.push({ label: `Leveraged funds net ${c.ccy} futures against the last 3 years`, value: `${ordinal(c.percentile)} percentile (${label})`, source: `${CFTC_LABEL}, report ${c.reportDate}; the ${CROWDING_BADGE}`, tag: 'official' });
    parts.push(
      label === 'not stretched'
        ? `Speculators' bets on the ${c.ccy} are not stretched (${ordinal(c.percentile)} percentile of 3 years): no sign of herding in futures.`
        : `Speculators are ${label} the ${c.ccy} (${ordinal(c.percentile)} percentile of 3 years): many traders are betting the same way, which is what herding looks like in futures.`
    );
    if (label !== 'not stretched') weight = Math.max(weight, Math.abs(c.percentile - 50) / 50);
  } else missing.push(`${name}: no CFTC currency future, so no futures positioning`);

  // Crowd odds (Polymarket); Kalshi is not saved per country.
  const markets = [...(it.politics?.markets || [])].sort((a, b) => b.volumeUsd - a.volumeUsd).slice(0, 2);
  for (const m of markets) {
    const near = m.probabilityPct >= ODDS_EXTREME_PCT || m.probabilityPct <= 100 - ODDS_EXTREME_PCT;
    const mv = oddsMoveText(m);
    const move = mv ? `; ${mv}` : '';
    figures.push({ label: `Crowd odds: ${m.question}`, value: `${m.probabilityPct}% yes${move}`, source: `Polymarket, pulled ${it.politics?.marketsPulledAt || 'today'}; market prices, not a forecast by the app; ${NOT_TESTED}`, tag: 'live' });
    parts.push(`The crowd on Polymarket prices "${m.question}" at ${m.probabilityPct}% yes${near ? ', close to certain' : ''}.`);
    if (near) weight = Math.max(weight, 0.4);
  }
  if (!markets.length) missing.push(`${name}: no Polymarket contract names this country`);
  missing.push(`${name}: ${KALSHI_MISSING}`);

  // Sentiment and households' price expectations (EC surveys, EU members).
  const eu = Boolean(euSurveyGeo(it.iso3));
  const latest = it.euSurveys?.latest || [];
  if (eu) {
    for (const [id, label] of [
      ['consumer', 'Consumer confidence'],
      ['esi', 'Economic sentiment indicator'],
    ] as const) {
      const a = latest.find((x) => x.id === id);
      if (!a) {
        missing.push(`${name}: ${label.toLowerCase()} not saved yet (EU surveys come with the daily download)`);
        continue;
      }
      const f = surveyFigure(a, label);
      figures.push(f.figure);
      parts.push(f.text);
      weight = Math.max(weight, f.extreme);
    }
    const p = latest.find((x) => x.id === 'prices');
    if (p) {
      const f = surveyFigure(p, "Households' expected price trends over the next 12 months");
      figures.push(f.figure);
      let text = f.text;
      if (p.yearAgo) {
        const d = p.value - p.yearAgo.value;
        figures.push({ label: "Change in households' expected price trends, 12 months", value: `${sg(d)} pts (from ${sg(p.yearAgo.value)} in ${p.yearAgo.period})`, source: `${EU_SURVEY_SOURCE}; ${EXPECTATIONS_TEST}`, tag: 'official' });
        text += ` Households' price expectations ${Math.abs(d) < 0.5 ? 'are about where they were a year ago' : d > 0 ? `have risen ${Math.abs(d).toFixed(1)} points over the year` : `have fallen ${Math.abs(d).toFixed(1)} points over the year`}.`;
      }
      parts.push(text);
      weight = Math.max(weight, f.extreme);
      missing.push(`${name}: survey against market inflation expectations missing (${BREAKEVEN_MISSING_EU})`);
    } else missing.push(`${name}: households' expected price trends not saved yet (EU surveys come with the daily download)`);
  } else {
    missing.push(`${name}: consumer confidence, economic sentiment and households' price expectations missing (${SURVEY_MISSING_NON_EU})`);
  }

  // The Timing Agent's reading, in one line.
  const t = timingSignals(it, now);
  if (t.signals.length) {
    const line = timingSetup(t.signals, t.nextDays);
    figures.push({ label: "Timing Agent's reading", value: line, source: 'Timing Agent (dated catalysts, cycle turns, positioning, news tone, flows); signals in the data, not a forecast', tag: 'model' });
    parts.push(`Timing Agent: ${line}`);
  }
  return { figures, parts, missing, weight: Math.min(1, weight) };
}

export function behaviourAgent(countries: LiveWatchlistItem[], now: Date): Omit<AgentAnswer, 'why'> {
  const findings: AgentFinding[] = [];
  const missing: string[] = [];
  for (const it of countries) {
    const r = behaviourReadings(it, now);
    missing.push(...r.missing);
    // Only the Timing line is not enough for a behavioural reading.
    if (!r.parts.length || r.figures.every((f) => f.tag === 'model')) {
      missing.push(`${it.countryName}: no positioning, crowd odds or survey figures to describe`);
      continue;
    }
    findings.push({ iso3: it.iso3, countryName: it.countryName, reading: `${r.parts.join(' ')} ${NOT_TESTED}${it.cftc?.percentile !== undefined ? '; the crowding rule has its own badge' : ''}.`, figures: r.figures, weight: r.weight });
  }
  return { id: 'behaviour', name: BEHAVIOUR_AGENT_NAME, findings, missing };
}
