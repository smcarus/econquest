/**
 * Pre-registered reproduction check of the World Bank country models (World Bank country models plan,
 * step M4; docs/validation/models/mfmod_reproduction.json). Judges the models service's two check
 * replies (models/service.py /check/baseline and /check/book-oil) against the pass marks fixed in the
 * file. Pure: the runner (scripts/mfmod-validate.ts) fetches, this file decides.
 *
 * Check A: each of the six public models, solved again, reproduces the values stored in its file.
 * Check B: the World Bank manual's Pakistan oil example gives the manual's published figures.
 */

export interface MfmodCheckSpec {
  id: string;
  version: number;
  method: 'mfmod_reproduction';
  checks: {
    baseline: { passMark: { maxRelativeDifference: number } };
    bookOil: { published: Record<string, Record<string, number>>; passMark: { maxAbsoluteDifferencePts: number }; source: { url: string } };
  };
}

export interface BaselineCheckReply {
  models?: Array<{ iso3: string; solveFrom?: string; solveTo?: string; series?: Record<string, { code: string; maxRelativeDifference: number; periods: number }> }>;
  problems?: string[];
  modelflow?: string;
}

export interface BookOilReply {
  years?: number[];
  series?: Record<string, Array<number | null>>;
  /** The same run on the public copy the app uses, to the end of its solve span (information only). */
  publicCopy?: { years?: number[]; series?: Record<string, Array<number | null>> };
  modelflow?: string;
}

export type CheckStatus = 'passed' | 'failed' | 'not_run';

export interface MfmodCheckResult {
  id: string;
  version: number;
  status: CheckStatus;
  baseline: { status: CheckStatus; worst: { iso3: string; series: string; value: number } | null; models: number; note: string };
  bookOil: { status: CheckStatus; worst: { code: string; year: number; ours: number | null; published: number; diff: number | null } | null; compared: number; note: string };
  /** Not part of the verdict: the public copy against the published figures, over its own solve span. */
  publicCopy: { worstDiff: number | null; compared: number; note: string };
  modelflow?: string;
}

const EXPECTED_MODELS = ['BOL', 'HRV', 'IRQ', 'NPL', 'PAK', 'TUR'];

export function judgeBaseline(spec: MfmodCheckSpec, reply: BaselineCheckReply | null): MfmodCheckResult['baseline'] {
  const mark = spec.checks.baseline.passMark.maxRelativeDifference;
  if (!reply) return { status: 'not_run', worst: null, models: 0, note: 'the models service did not answer' };
  const got = new Set((reply.models ?? []).map((m) => m.iso3));
  const absent = EXPECTED_MODELS.filter((c) => !got.has(c));
  if (absent.length) return { status: 'not_run', worst: null, models: got.size, note: `not every model loaded and solved (${absent.join(', ')})${reply.problems?.length ? `: ${reply.problems.join('; ')}` : ''}` };
  let worst: MfmodCheckResult['baseline']['worst'] = null;
  for (const m of reply.models ?? []) {
    const rows = Object.entries(m.series ?? {});
    if (!rows.length) return { status: 'not_run', worst: null, models: got.size, note: `${m.iso3}: no headline series compared` };
    for (const [k, r] of rows) {
      const v = Number(r.maxRelativeDifference);
      if (!Number.isFinite(v)) return { status: 'failed', worst: { iso3: m.iso3, series: k, value: NaN }, models: got.size, note: `${m.iso3} ${k}: the difference is not a number` };
      if (!worst || v > worst.value) worst = { iso3: m.iso3, series: k, value: v };
    }
  }
  const pass = worst !== null && worst.value <= mark;
  return { status: pass ? 'passed' : 'failed', worst, models: got.size, note: `largest relative difference ${worst ? worst.value.toExponential(2) : 'none'} (${worst?.iso3} ${worst?.series}); pass mark ${mark.toExponential(0)}` };
}

export function judgeBookOil(spec: MfmodCheckSpec, reply: BookOilReply | null): MfmodCheckResult['bookOil'] {
  const mark = spec.checks.bookOil.passMark.maxAbsoluteDifferencePts;
  if (!reply?.years || !reply.series) return { status: 'not_run', worst: null, compared: 0, note: 'the models service did not answer' };
  let worst: MfmodCheckResult['bookOil']['worst'] = null;
  let compared = 0;
  for (const [code, byYear] of Object.entries(spec.checks.bookOil.published)) {
    for (const [y, published] of Object.entries(byYear)) {
      const i = reply.years.indexOf(Number(y));
      const ours = i >= 0 ? (reply.series[code]?.[i] ?? null) : null;
      const diff = ours === null || !Number.isFinite(ours) ? null : Math.abs(ours - published);
      compared++;
      // A published figure the service did not give back counts as a miss, never as a match.
      if (diff === null) return { status: 'failed', worst: { code, year: Number(y), ours, published, diff }, compared, note: `${code} ${y}: no figure from the service` };
      if (!worst || (worst.diff ?? 0) < diff) worst = { code, year: Number(y), ours, published, diff };
    }
  }
  const pass = worst !== null && (worst.diff ?? Infinity) <= mark;
  return { status: pass ? 'passed' : 'failed', worst, compared, note: `${compared} published figures compared; largest difference ${worst?.diff?.toFixed(4)} points (${worst?.code} ${worst?.year}); pass mark ${mark} points` };
}

/** Information only: the public copy of the Pakistan model against the published figures it covers. */
export function comparePublicCopy(spec: MfmodCheckSpec, reply: BookOilReply | null): MfmodCheckResult['publicCopy'] {
  const pc = reply?.publicCopy;
  if (!pc?.years || !pc.series) return { worstDiff: null, compared: 0, note: 'not given by the service' };
  let worst: number | null = null;
  let compared = 0;
  let gaps = 0;
  for (const [code, byYear] of Object.entries(spec.checks.bookOil.published)) {
    for (const [y, published] of Object.entries(byYear)) {
      const i = pc.years.indexOf(Number(y));
      if (i < 0) continue;
      const ours = pc.series[code]?.[i];
      if (ours === null || ours === undefined || !Number.isFinite(ours)) {
        gaps++;
        continue;
      }
      compared++;
      const d = Math.abs(ours - published);
      if (worst === null || d > worst) worst = d;
    }
  }
  return { worstDiff: worst, compared, note: `${compared} figures, ${pc.years[0]}-${pc.years[pc.years.length - 1]}; largest difference ${worst === null ? 'none' : worst.toFixed(4)} points${gaps ? `; ${gaps} with no figure` : ''}` };
}

/** Both checks; passed only when both pass, not run when either could not run. */
export function judgeMfmodReproduction(spec: MfmodCheckSpec, baseline: BaselineCheckReply | null, bookOil: BookOilReply | null): MfmodCheckResult {
  const a = judgeBaseline(spec, baseline);
  const b = judgeBookOil(spec, bookOil);
  const status: CheckStatus = a.status === 'failed' || b.status === 'failed' ? 'failed' : a.status === 'passed' && b.status === 'passed' ? 'passed' : 'not_run';
  return { id: spec.id, version: spec.version, status, baseline: a, bookOil: b, publicCopy: comparePublicCopy(spec, bookOil), modelflow: baseline?.modelflow ?? bookOil?.modelflow };
}

/** Plain-text summary for the terminal and the Mac validation report. */
/**
 * The address the check script uses. MFMOD_URL in .env names the service as Docker's app sees it
 * (http://mfmod:8765); run outside Docker, that name does not resolve, so the script asks the port
 * docker-compose.yml publishes on this computer instead (127.0.0.1, MFMOD_PORT or 8765).
 */
export function checkBaseUrl(url: string, insideDocker: boolean, port?: string): string {
  const u = new URL(url);
  if (insideDocker || u.hostname !== 'mfmod') return u.origin;
  const p = port && /^\d{1,5}$/.test(port) ? port : '8765';
  return `http://127.0.0.1:${p}`;
}

export function checkSummary(r: MfmodCheckResult): string {
  const word = (s: CheckStatus) => (s === 'passed' ? 'PASSED' : s === 'failed' ? 'FAILED' : 'NOT RUN');
  return [
    `World Bank model reproduction check ${r.id} v${r.version}: ${word(r.status)}${r.modelflow ? ` (ModelFlow ${r.modelflow})` : ''}`,
    `  A. Stored baseline reproduced, ${r.baseline.models} of 6 models: ${word(r.baseline.status)}, ${r.baseline.note}`,
    `  B. World Bank manual's Pakistan oil example: ${word(r.bookOil.status)}, ${r.bookOil.note}`,
    `     For information, the public copy the app uses: ${r.publicCopy.note}`,
  ].join('\n');
}
