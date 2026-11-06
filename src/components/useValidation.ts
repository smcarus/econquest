/**
 * The pre-registered backtests as the server holds them (/api/validation): verdicts override a
 * register entry's status, so every badge shows the latest. Loaded once, shared by every badge.
 */
import { useEffect, useState } from 'react';
import type { ForwardSummary } from '../utils/forwardRecord';
import type { BacktestResult } from '../utils/backtest';
import type { ValidationStatus } from '../data/modelRegister';
import { forecastRegisterStatus, type ForecastVerdict } from '../utils/forecastRegister';
import { holmReadings, testsOnRecord, type HolmReading } from '../utils/multipleTesting';

export interface ValidationSpecInfo {
  file: string;
  hash: string;
  problem?: string;
  id?: string;
  version?: number;
  registeredOn?: string;
  hypothesis?: string;
  passMark?: { minCases: number; minLiftPts: number; maxPValue: number; minSeriesShare?: number; minYears?: number };
  framework?: 1 | 2;
  retestOf?: { version: number; verdict: string; change: string };
  params?: Record<string, number>;
  sample?: { from: string; to?: string };
  knownLimits?: string[];
}

export interface ValidationReply {
  results: Record<string, BacktestResult>;
  versions?: Record<string, BacktestResult>;
  lastRun?: { at: string; problems: string[] };
  specs: ValidationSpecInfo[];
  running: boolean;
  file: string;
  /** Nowcast and forecast evaluations (npm run forecast:evaluate), by evaluation id. */
  forecasts?: Record<string, ForecastVerdict>;
  /** Every forecast evaluation version run, with its p and pass mark (for the Holm correction). */
  forecastTests?: Array<{ id: string; version: number; p: number; alpha: number; status: 'passed' | 'failed' | 'too_few_cases' }>;
  /** Rule 7: calls made after a test passed, by `${id} v${version}` (src/utils/forwardRecord.ts). */
  forward?: Record<string, ForwardSummary>;
  forwardCheck?: { chainOk: boolean; badLines: number; lines: number; file: string };
}

let cache: ValidationReply | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<(v: ValidationReply | null) => void>();
const publish = () => listeners.forEach((l) => l(cache));

export function reloadValidation(): Promise<void> {
  loading = fetch('/api/validation')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j) cache = j;
      publish();
    })
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

export async function runValidation(): Promise<string | null> {
  if (cache) {
    cache = { ...cache, running: true };
    publish();
  }
  try {
    const r = await fetch('/api/validation/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json().catch(() => ({}));
    await reloadValidation();
    return r.ok ? null : j?.error || `HTTP ${r.status}`;
  } catch (e: any) {
    await reloadValidation();
    return String(e?.message || e);
  }
}

export function useValidation(): ValidationReply | null {
  const [v, setV] = useState<ValidationReply | null>(cache);
  useEffect(() => {
    listeners.add(setV);
    if (!cache && !loading) void reloadValidation();
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}

/** True when a test passed as registered (method 1) but fails the stricter method 2 check. */
export function failsStricterCheck(id: string, v: ValidationReply | null): boolean {
  const r = v?.results?.[id];
  return !!r && r.status === 'passed' && (r.framework ?? 1) === 1 && r.robustness?.status === 'failed';
}

/** The status to show: a backtest or forecast-evaluation verdict when one exists for this id, else the register's own. */
export function effectiveStatus(id: string, registerStatus: ValidationStatus, v: ValidationReply | null): ValidationStatus {
  return v?.results?.[id]?.status ?? forecastRegisterStatus(id, v?.forecasts) ?? registerStatus;
}

/** Holm-adjusted readings for every test on record (src/utils/multipleTesting.ts). */
export function validationHolm(v: ValidationReply | null): Map<string, HolmReading> {
  if (!v) return new Map();
  const alphaFor = (id: string, version: number) => v.specs.find((s) => s.id === id && s.version === version)?.passMark?.maxPValue;
  return holmReadings(testsOnRecord({ ...(v.versions || {}), ...Object.fromEntries(Object.values(v.results || {}).map((r) => [`${r.id} v${r.specVersion}`, r])) }, alphaFor, v.forecastTests || []));
}
