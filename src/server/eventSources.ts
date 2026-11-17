/**
 * What turns into an event (console integration item 4): each function reads something the app
 * already works out and returns the events it means. Pure, so the tests can feed recorded inputs.
 *
 *   figure watch (src/utils/figureWatch.ts)  -> figure_revised, data_stale, feed_failed
 *   signal states on the watchlist rows      -> signal_state_changed
 *   validation badges before and after       -> badge_changed
 *   the daily run                            -> daily_download_ready, feed_failed
 *   sanctions files before and after a pull  -> sanctions_list_changed
 *   official calendar and Treasury auctions  -> release_upcoming (the day before)
 *   a council run                            -> council_run_finished
 *   your indicator watches                   -> threshold_crossed
 */
import { countryEntity, type EventInput, type ValueBadge } from '../utils/consoleEvents';
import type { FigureEvent } from '../utils/figureWatch';
import type { DailyRun } from '../utils/dailyRun';
import { deadlineNote, type Deadline } from '../utils/dailyDeadline';
import type { LiveWatchlistItem } from '../types/council';
import { policyCycle } from '../utils/cycleClock';
import { regimeFor } from '../utils/regimeQuadrant';
import { positioningLabel } from '../utils/cftcPositioning';
import { OFFICIAL_CALENDAR, type OfficialCalendarEvent } from '../data/officialCalendar';
import { UST_AUCTION_SOURCE, UST_TENORS, type UstAnnouncedAuction } from '../utils/treasuryAuctions';
import { SANCTIONS_LISTS, type SanctionsData, type SanctionsListId } from '../utils/sanctionsLists';
import { WATCH_METRICS, metricValue, type WatchMetric, type WatchRule } from '../utils/watchRules';

/** Where each watched figure comes from, named as the licence register knows it. */
export const FIGURE_SOURCE: Record<string, string> = {
  yield: 'Official 10-year yields (national sources, OECD via FRED)',
  policy: 'BIS central bank policy rates',
  cpi: 'National statistics and OECD inflation',
  debt: 'IMF World Economic Outlook',
  reserves_months: 'World Bank Open Data (FI.RES.TOTL.MO)',
  imf_reserves: 'IMF International Reserves (IRFCL)',
  current_account: 'IMF Balance of Payments',
  reer_gap: 'BIS effective exchange rates',
  fx_vol: 'ExchangeRate-API and ECB reference rates',
  cli: 'OECD composite leading indicators',
  tic: 'US Treasury TIC',
  output_gap: 'IMF World Economic Outlook',
};

const countryUrl = (iso3: string) => `/api/v1/countries/${iso3}/snapshot`;

/** Figure watch events: a revision, a figure gone stale, a figure gone missing. Jumps and out-of-range readings stay in Data health. */
export function figureEventInputs(events: FigureEvent[]): EventInput[] {
  const out: EventInput[] = [];
  for (const e of events) {
    const source = FIGURE_SOURCE[e.figure] ?? `EconQuest figure watch (${e.label})`;
    const entity = countryEntity(e.iso3, e.country, e.figure);
    const data = { label: e.label, detail: e.detail, ...(e.from !== undefined ? { from: e.from } : {}), ...(e.to !== undefined ? { to: e.to } : {}), ...(e.prevPeriod ? { prev_period: e.prevPeriod } : {}) };
    if (e.kind === 'revised') {
      out.push({ type: 'figure_revised', entity, severity: 'info', as_of: e.period ?? null, source, evidence_url: countryUrl(e.iso3), summary: `${e.country}: ${e.label} revised. ${e.detail}`, data, discriminator: `${e.from}->${e.to}` });
    } else if (e.kind === 'stale') {
      out.push({ type: 'data_stale', entity, severity: 'warning', as_of: e.period ?? null, source, evidence_url: '/api/data-health', summary: `${e.country}: ${e.label} is out of date. ${e.detail}`, data, discriminator: e.at.slice(0, 10) });
    } else if (e.kind === 'missing') {
      out.push({ type: 'feed_failed', entity, severity: 'warning', as_of: e.period ?? null, source, evidence_url: '/api/data-health', summary: `${e.country}: ${e.label} is Missing. ${e.detail}`, data, discriminator: e.at.slice(0, 13) });
    }
  }
  return out;
}

/** A signal's state on one country, with the date and source it was read from. */
export interface SignalState {
  state: string;
  asOf: string;
  source: string;
}
export type SignalStates = Record<string, SignalState>;

/** Signals the app reads from a watchlist row, keyed "ISO3:signal". Only states that can be read; never a filled-in one. */
export function signalStatesOf(rows: LiveWatchlistItem[]): SignalStates {
  const out: SignalStates = {};
  for (const r of rows) {
    if (r.policyRateSource === 'bis' && r.policyRateDate) {
      const asOf = String(r.policyRateDate).slice(0, 7);
      const c = policyCycle(r.policyRateMoves, asOf, r.policyRateHistoryFrom);
      if (c) out[`${r.iso3}:cycle_clock`] = { state: c.state, asOf, source: 'BIS central bank policy rates' };
    }
    if (r.cftc && typeof r.cftc.percentile === 'number') {
      out[`${r.iso3}:cftc_crowding`] = { state: positioningLabel(r.cftc.percentile), asOf: r.cftc.reportDate, source: 'CFTC Traders in Financial Futures' };
    }
    const reg = regimeFor(r);
    if (reg.ok) out[`${r.iso3}:regime_quadrant`] = { state: reg.point.quadrant, asOf: reg.point.cliMonth, source: 'OECD composite leading indicators and inflation' };
  }
  return out;
}

const SIGNAL_LABEL: Record<string, string> = {
  cycle_clock: 'Policy cycle',
  cftc_crowding: 'CFTC positioning',
  regime_quadrant: 'Growth and inflation regime',
};

/**
 * Changes between the last states and the current ones. A signal seen for the first time is
 * recorded, not reported (nothing changed); a signal that can no longer be read is left as it was.
 */
export function signalChangeInputs(prev: SignalStates | null, rows: LiveWatchlistItem[], badges: Record<string, ValueBadge>): { states: SignalStates; inputs: EventInput[] } {
  const cur = signalStatesOf(rows);
  const states: SignalStates = { ...(prev ?? {}), ...cur };
  const inputs: EventInput[] = [];
  if (!prev) return { states, inputs };
  const names = new Map(rows.map((r) => [r.iso3, r.countryName]));
  for (const [key, now] of Object.entries(cur)) {
    const was = prev[key];
    if (!was || was.state === now.state) continue;
    const [iso3, signal] = key.split(':') as [string, string];
    const name = names.get(iso3) ?? iso3;
    inputs.push({
      type: 'signal_state_changed',
      entity: countryEntity(iso3, name, signal),
      severity: 'info',
      as_of: now.asOf,
      source: now.source,
      evidence_url: countryUrl(iso3),
      badge: badges[signal] ?? 'not_validated',
      summary: `${name}: ${SIGNAL_LABEL[signal] ?? signal} moved from "${was.state}" to "${now.state}".`,
      data: { signal, from: was.state, to: now.state, prev_as_of: was.asOf },
      discriminator: `${was.state}->${now.state}`,
    });
  }
  return { states, inputs };
}

/** Badge changes of registered models and signals, after a test run. */
export function badgeChangeInputs(before: Record<string, ValueBadge>, after: Record<string, ValueBadge>, labels: Record<string, string>, ranAt: string): EventInput[] {
  const out: EventInput[] = [];
  for (const [id, now] of Object.entries(after)) {
    const was = before[id];
    if (!was || was === now) continue;
    const down = ['withdrawn', 'under_review', 'review_due'].includes(now);
    out.push({
      type: 'badge_changed',
      entity: { kind: 'model', id, indicator: id, name: labels[id] ?? id },
      severity: down ? 'warning' : 'info',
      as_of: ranAt.slice(0, 10),
      source: 'EconQuest pre-registered tests',
      evidence_url: '/api/validation',
      badge: now,
      summary: `${labels[id] ?? id}: badge changed from ${was.replace(/_/g, ' ')} to ${now.replace(/_/g, ' ')}.`,
      data: { from: was, to: now },
      discriminator: `${was}->${now}`,
    });
  }
  return out;
}

/** A finished daily run: one daily_download_ready, and a feed_failed for each step that failed. */
export function dailyRunInputs(run: DailyRun, deadline?: Deadline | null): EventInput[] {
  if (!run.finishedAt) return [];
  const failed = run.steps.filter((s) => s.outcome === 'failed');
  const day = run.startedAt.slice(0, 10);
  const out: EventInput[] = failed.map((s) => ({
    type: 'feed_failed' as const,
    entity: { kind: 'source' as const, id: s.id, name: s.label },
    severity: 'warning' as const,
    as_of: day,
    source: `EconQuest daily download (${s.label})`,
    evidence_url: '/api/daily/status',
    summary: `Daily download: ${s.label} failed${s.note ? `: ${s.note}` : ''}.`,
    data: { step: s.id, note: s.note ?? null, details: (s.details ?? []).slice(0, 20) },
    discriminator: run.startedAt,
  }));
  out.push({
    type: 'daily_download_ready',
    entity: { kind: 'app', name: 'Daily download' },
    severity: failed.length ? 'warning' : 'info',
    as_of: day,
    source: 'EconQuest daily download',
    evidence_url: '/api/daily/status',
    summary: failed.length ? `Daily download finished with ${failed.length} step${failed.length === 1 ? '' : 's'} failed.` : 'Daily download finished; every step done.',
    data: { started_at: run.startedAt, finished_at: run.finishedAt, steps: run.steps.map((s) => ({ id: s.id, outcome: s.outcome })), offline: Boolean(run.offline), ...(deadline ? { deadline: deadlineNote(run.finishedAt, deadline) } : {}) },
    discriminator: run.startedAt,
  });
  return out;
}

/** Entries per list, from a loaded sanctions folder. */
export function sanctionsCounts(d: SanctionsData | null): Partial<Record<SanctionsListId, { entries: number; modified?: string }>> {
  const out: Partial<Record<SanctionsListId, { entries: number; modified?: string }>> = {};
  for (const f of d?.files ?? []) {
    const cur = out[f.list] ?? { entries: 0 };
    out[f.list] = { entries: cur.entries + f.entries, modified: [cur.modified, f.modified].filter(Boolean).sort().pop() };
  }
  return out;
}

export function sanctionsChangeInputs(before: ReturnType<typeof sanctionsCounts>, after: ReturnType<typeof sanctionsCounts>): EventInput[] {
  const out: EventInput[] = [];
  for (const id of Object.keys(after) as SanctionsListId[]) {
    const a = after[id]!;
    const b = before[id];
    if (b && b.entries === a.entries && b.modified === a.modified) continue;
    const list = SANCTIONS_LISTS[id];
    out.push({
      type: 'sanctions_list_changed',
      entity: { kind: 'source', id, name: list.name },
      severity: 'info',
      as_of: a.modified ?? null,
      source: list.name,
      evidence_url: list.url,
      summary: b ? `${list.name} changed: ${b.entries} entries before, ${a.entries} now.` : `${list.name} saved for the first time: ${a.entries} entries.`,
      data: { entries_before: b?.entries ?? null, entries_now: a.entries },
      discriminator: `${a.modified}|${a.entries}`,
    });
  }
  return out;
}

const RELEASE_CATEGORIES: OfficialCalendarEvent['category'][] = ['MPC_DECISION', 'CPI_RELEASE', 'GDP_RELEASE'];
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Releases due tomorrow (UTC date): central bank decisions, CPI and GDP from the official
 * calendar, and US Treasury auctions announced on Fiscal Data.
 */
export function releaseUpcomingInputs(now: Date, announced: UstAnnouncedAuction[] = [], calendar: OfficialCalendarEvent[] = OFFICIAL_CALENDAR): EventInput[] {
  const tomorrow = ymd(new Date(now.getTime() + 86_400_000));
  const out: EventInput[] = [];
  for (const e of calendar) {
    if (e.date !== tomorrow || !RELEASE_CATEGORIES.includes(e.category)) continue;
    out.push({
      type: 'release_upcoming',
      entity: countryEntity(e.iso3, undefined, e.category.toLowerCase()),
      severity: 'info',
      as_of: e.date,
      source: e.sourceName,
      evidence_url: e.sourceUrl,
      summary: `Tomorrow (${e.date}): ${e.title}.`,
      data: { category: e.category, title: e.title, date: e.date, primary_source: e.primarySource, retrieved: e.retrieved },
      discriminator: `${e.category}|${e.date}`,
    });
  }
  for (const a of announced) {
    if (a.date !== tomorrow) continue;
    const label = UST_TENORS.find((t) => t.id === a.tenor)?.label ?? a.tenor;
    out.push({
      type: 'release_upcoming',
      entity: countryEntity('USA', 'United States', `ust_auction_${a.tenor}`),
      severity: 'info',
      as_of: a.date,
      source: UST_AUCTION_SOURCE,
      evidence_url: 'https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/',
      summary: `Tomorrow (${a.date}): US Treasury ${label} auction${a.reopening ? ' (reopening)' : ''}${a.offeringUsdBn ? `, ${a.offeringUsdBn} bn USD offered` : ''}.`,
      data: { category: 'AUCTION', tenor: a.tenor, date: a.date, reopening: a.reopening, offering_usd_bn: a.offeringUsdBn ?? null },
      discriminator: `AUCTION|${a.tenor}|${a.date}`,
    });
  }
  return out;
}

/** A finished council run on one country. */
export function councilRunInput(run: { iso3: string; countryName: string; finishedAt?: string; model?: string; question?: string }): EventInput {
  const at = run.finishedAt ?? new Date().toISOString();
  return {
    type: 'council_run_finished',
    entity: countryEntity(run.iso3, run.countryName),
    severity: 'info',
    as_of: at.slice(0, 10),
    source: 'EconQuest council (AI-written, from the figures shown with each answer)',
    evidence_url: `/api/v1/integration/bundle/${run.iso3}`,
    badge: 'not_validated',
    summary: `Council run finished on ${run.countryName}.`,
    data: { ...(run.model ? { model: run.model } : {}) },
    discriminator: at,
  };
}

/** Where each watch metric comes from, named as the licence register knows it. */
export const WATCH_SOURCE: Record<WatchMetric, string> = {
  yield_level: FIGURE_SOURCE.yield!,
  yield_3m_bps: FIGURE_SOURCE.yield!,
  policy_rate: FIGURE_SOURCE.policy!,
  cli_level: FIGURE_SOURCE.cli!,
  cftc_percentile: 'CFTC Traders in Financial Futures',
  tone_shift: 'GDELT',
  reserves_12m_pct: FIGURE_SOURCE.imf_reserves!,
  shock_alerts: 'EconQuest shock early-warning rules (Country tab)',
  odds_1w_pts: 'Polymarket',
};

/** The date a watched figure refers to, from the row it was read from; null when the row has none. */
export function watchAsOf(it: LiveWatchlistItem, m: WatchMetric): string | null {
  switch (m) {
    case 'yield_level':
    case 'yield_3m_bps':
      return it.yield10YPeriod ?? null;
    case 'policy_rate':
      return it.policyRateDate ? String(it.policyRateDate) : null;
    case 'cli_level':
      return it.oecdCli?.month ?? null;
    case 'cftc_percentile':
      return it.cftc?.reportDate ?? null;
    case 'tone_shift':
      return it.gdelt?.pulledAt ? it.gdelt.pulledAt.slice(0, 10) : null;
    case 'reserves_12m_pct':
      return it.imf?.reserves?.period ?? null;
    case 'shock_alerts':
      return it.dataAsOf ?? null;
    case 'odds_1w_pts':
      return null;
  }
}

/**
 * The value a watch reads, or undefined when no source filled it. Yields count only when they are
 * official or your own upload: a sample or estimated yield never fires a watch.
 */
export function watchValue(it: LiveWatchlistItem, m: WatchMetric): number | undefined {
  if ((m === 'yield_level' || m === 'yield_3m_bps') && it.yield10YSource !== 'official' && it.yield10YSource !== 'uploaded') return undefined;
  return metricValue(it, m);
}

/** The last reading of one watch on one country, keyed "<watch id>:<ISO3>". */
export interface WatchState {
  crossed: boolean;
  value: number | null;
  asOf: string | null;
  checkedAt: string;
}
export type WatchStates = Record<string, WatchState>;

/**
 * Checks every watch against the rows. A watch fires (threshold_crossed) when its figure is on the
 * far side of the threshold and was not at the last check, including the first check after it was
 * made. It fires again only after the figure has gone back. A country with no figure keeps its last state.
 */
export function watchCrossingInputs(rules: WatchRule[], rows: LiveWatchlistItem[], prev: WatchStates | null, now: Date = new Date()): { states: WatchStates; inputs: EventInput[] } {
  const states: WatchStates = {};
  const inputs: EventInput[] = [];
  const checkedAt = now.toISOString();
  for (const r of rules) {
    for (const it of rows.filter((x) => r.iso3 === '*' || x.iso3 === r.iso3)) {
      const key = `${r.id}:${it.iso3}`;
      const v = watchValue(it, r.metric);
      if (v === undefined) {
        if (prev?.[key]) states[key] = prev[key]!;
        continue;
      }
      const crossed = r.op === '>=' ? v >= r.value : v <= r.value;
      const asOf = watchAsOf(it, r.metric);
      states[key] = { crossed, value: v, asOf, checkedAt };
      if (!crossed || prev?.[key]?.crossed) continue;
      const m = WATCH_METRICS[r.metric];
      const side = r.op === '>=' ? 'at or above' : 'at or below';
      inputs.push({
        type: 'threshold_crossed',
        entity: { ...countryEntity(it.iso3, it.countryName, r.metric), id: r.id },
        severity: 'warning',
        as_of: asOf,
        source: WATCH_SOURCE[r.metric],
        evidence_url: countryUrl(it.iso3),
        badge: r.metric === 'shock_alerts' ? 'not_validated' : 'official',
        summary: `${it.countryName}: ${m.label} is ${v}${m.unit === '%' ? '%' : m.unit ? ` ${m.unit}` : ''}, ${side} your watch at ${r.value}.`,
        data: { watch: r.id, metric: r.metric, op: r.op, threshold: r.value, value: v, unit: m.unit, ...(r.note ? { note: r.note } : {}) },
        discriminator: `${r.id}|${asOf ?? checkedAt.slice(0, 10)}|${v}`,
      });
    }
  }
  return { states, inputs };
}
