/**
 * Validation badges from the server's /api/validation reply, shared by the screens
 * (src/components/useValidation.ts) and the server (events and the console API). Pure.
 */
import type { ForwardSummary } from './forwardRecord';
import type { BacktestResult } from './backtest';
import type { ValidationStatus } from '../data/modelRegister';
import { forecastRegisterStatus, forecastVerdicts, type ForecastVerdict } from './forecastRegister';
import { evidenceGrade, type EvidenceGrade, type GradeReading } from './evidenceGrade';
import { holmReadings, testsOnRecord, type HolmReading } from './multipleTesting';

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

const GRADE_ORDER: EvidenceGrade[] = ['withdrawn', 'under_review', 'review_due', 'provisional', 'validated'];

/**
 * The evidence grade for a register entry whose tests passed (src/utils/evidenceGrade.ts): the
 * Holm reading and forward record of each test behind it; the weakest grade wins when several
 * tests stand behind one entry. Null for any other status.
 */
export function entryGrade(id: string, registerStatus: ValidationStatus, v: ValidationReply | null, holmMap = validationHolm(v)): GradeReading | null {
  if (effectiveStatus(id, registerStatus, v) !== 'passed' || !v) return null;
  const r = v.results?.[id];
  const tests = r
    ? [{ ranAt: r.ranAt, holm: holmMap.get(`${r.id} v${r.specVersion}`), forward: v.forward?.[`${r.id} v${r.specVersion}`], netOfCosts: false }]
    : forecastVerdicts(id, v.forecasts).map((x) => ({ ranAt: x.ranAt, holm: holmMap.get(`forecast ${x.id} v${x.specVersion}`), forward: v.forward?.[`${x.id} v${x.specVersion}`], netOfCosts: x.id.startsWith('fx_') }));
  const grades = tests.map((t) => evidenceGrade({ status: 'passed', ...t })).filter((g): g is GradeReading => Boolean(g));
  if (!grades.length) return null;
  return grades.sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade))[0];
}

/** The badge a register entry carries: its evidence grade when its tests passed, else Not validated. */
export function entryBadge(id: string, registerStatus: ValidationStatus, v: ValidationReply | null, holmMap = validationHolm(v)): EvidenceGrade | 'not_validated' {
  return entryGrade(id, registerStatus, v, holmMap)?.grade ?? 'not_validated';
}
