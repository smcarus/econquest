/**
 * OECD Composite Leading Indicators (CLI), monthly (Sam, 2026-11-05: "OECD composite leading
 * indicators and inflation, monthly, no key").
 *
 * Source: OECD Data Explorer API, dataflow OECD.SDD.STES / DSD_STES@DF_CLI, measure LI, the
 * amplitude-adjusted series (long-term average = 100). Free, no key. The OECD publishes it around
 * mid-month; the newest month is usually one to two months old.
 *
 * The app asks once a day for every area at once and keeps the reply on disk (data/live/oecd-cli.json).
 * Countries the OECD does not publish a CLI for (Egypt, for one) read Missing with that reason.
 *
 * Readings: the latest level and month, the change on the month and over six months, and the
 * OECD's own cycle phases as a stated rule: above 100 and rising = expansion, above 100 and
 * falling = downturn, below 100 and falling = slowdown, below 100 and rising = recovery.
 */
import { OECD_API, OECD_AREA_FOR, areaSeries, formatMonth, parseSdmxCsv, seriesByArea, startPeriod } from './oecdSdmx';

export const CLI_LABEL = 'OECD Composite Leading Indicator (amplitude adjusted, long-term average = 100)';
export const CLI_FLOW = 'OECD.SDD.STES,DSD_STES@DF_CLI,';

/**
 * Query for the CLI. With no area, every area the OECD publishes (one call for the whole app).
 * Key order: REF_AREA.FREQ.MEASURE.UNIT_MEASURE.ACTIVITY.ADJUSTMENT.TRANSFORMATION.TIME_HORIZ.METHODOLOGY.
 * `wide` asks for the whole dataflow, used if the OECD refuses the narrow key (a changed layout).
 */
export function cliUrl(opts: { areas?: string[]; months?: number; wide?: boolean; now?: Date } = {}): string {
  const area = (opts.areas || []).flatMap((a) => OECD_AREA_FOR[a] || [a]).join('+');
  const key = opts.wide ? (area ? `${area}........` : 'all') : `${area}.M.LI......`;
  return `${OECD_API}/${CLI_FLOW}/${key}?startPeriod=${startPeriod(opts.months ?? 24, opts.now)}&format=csvfile`;
}

export type CliSeries = Record<string, { period: string; value: number }[]>;

/** Reads the OECD reply into one amplitude-adjusted CLI series per area. Null when nothing usable. */
export function parseCli(text: unknown): CliSeries | null {
  const obs = parseSdmxCsv(text);
  if (!obs?.length) return null;
  const s = seriesByArea(
    obs,
    { MEASURE: ['LI'], FREQ: ['M'], ADJUSTMENT: ['AA'] },
    { METHODOLOGY: ['H'], UNIT_MEASURE: ['IX'], TRANSFORMATION: ['IX', '_Z'] }
  );
  // Only levels around 100 are an amplitude-adjusted CLI; anything else is a different series.
  for (const [a, pts] of Object.entries(s)) if (!pts.length || pts.some((p) => p.value < 50 || p.value > 150)) delete s[a];
  return Object.keys(s).length ? s : null;
}

export type CliPhase = 'expansion' | 'downturn' | 'slowdown' | 'recovery';

/** OECD cycle phases on the level and the change on the month. */
export function cliPhase(level: number, change1m: number): CliPhase {
  if (level >= 100) return change1m >= 0 ? 'expansion' : 'downturn';
  return change1m < 0 ? 'slowdown' : 'recovery';
}

export interface CliReading {
  iso3: string;
  /** YYYY-MM of the latest figure. */
  month: string;
  level: number;
  change1m?: number;
  change6m?: number;
  phase?: CliPhase;
}

export function cliFor(iso3: string, series: CliSeries | null | undefined): CliReading | null {
  const pts = areaSeries(iso3, series);
  if (!pts?.length) return null;
  const last = pts[pts.length - 1];
  const prev = pts.length > 1 ? pts[pts.length - 2] : undefined;
  const six = pts.length > 6 ? pts[pts.length - 7] : undefined;
  const r2 = (v: number) => Number(v.toFixed(2));
  const change1m = prev ? r2(last.value - prev.value) : undefined;
  return {
    iso3,
    month: last.period,
    level: r2(last.value),
    ...(change1m !== undefined ? { change1m, phase: cliPhase(last.value, change1m) } : {}),
    ...(six ? { change6m: r2(last.value - six.value) } : {}),
  };
}

/** Why a country has no CLI figure: the OECD answered without it, or did not answer. */
export function cliMissing(pulled: boolean): { short: string; help: string } {
  return pulled
    ? { short: 'OECD publishes no CLI', help: 'The OECD answered, but publishes no composite leading indicator for this country.' }
    : { short: 'OECD did not answer', help: 'The OECD Data Explorer did not answer yet; the app asks again within the hour.' };
}

const sg = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;

/** "OECD leading indicator 100.42 (Sep 2026), +0.08 on the month: expansion." */
export function cliSentence(c: CliReading): string {
  const base = `OECD leading indicator ${c.level.toFixed(2)} (${formatMonth(c.month)})`;
  if (c.change1m === undefined || !c.phase) return `${base}.`;
  return `${base}, ${sg(c.change1m)} on the month: ${c.phase} (${c.level >= 100 ? 'above' : 'below'} its long-term average of 100 and ${c.change1m >= 0 ? 'rising' : 'falling'}).`;
}
