/**
 * Brings the published track record (docs/validation/recorded-verdicts.json) up to date from a real
 * run (npm run track-record:import), so no figure is ever copied by hand.
 *
 * Reads the files a run saves in data/local/validation/: results.json (npm run backtest),
 * forecasts.json (npm run forecast:evaluate), signals.json (npm run signals:evaluate) and
 * forward.jsonl (the forward record). Then:
 * - every test version that has a result there and no row in the record gets one row, with the
 *   run's own status, verdict text and p. A row already on record is never changed: a verdict is
 *   recorded once, and a later run of the same test does not replace it;
 * - a passed or failed row on record that has no p (rows written before rows carried one) takes the p
 *   of the run, when the run used the registered file and gave the same verdict (a too-few-cases
 *   verdict was not judged on a p, so it gets none); nothing else in the row changes;
 * - a result whose test file hash is not the one registered in the repository is left out, with a
 *   note (it was run from a changed or unregistered file);
 * - the forward record is summarised per test (calls, scored, followed, base rate) after its hash
 *   chain is checked; a broken chain, or one shorter than the summary already on record, is refused.
 *   The lines themselves are not copied: they hold figures from feeds whose terms do not allow
 *   re-publishing. The summary keeps the chain's last hash, so anyone holding the file can check it.
 *
 * Browser-safe, pure; the file side is scripts/track-record-import.ts.
 */
import type { RecordedVerdict, VerdictKind } from './methodsDoc';
import type { RecordedRun } from './trackRecordDoc';
import { pFromSummary } from './trackRecordDoc';
import { forwardSummary, type ForwardBody, type ForwardSummary, forwardByMonth, type ForwardMonthRow } from './forwardRecord';
import { REGISTER_FORECAST_IDS } from './forecastRegister';

/** One saved result as the three runners write it (only the fields read here). */
export interface SavedResult {
  id: string;
  specVersion: number;
  specHash: string;
  ranAt: string;
  status: 'passed' | 'failed' | 'too_few_cases';
  verdict: string;
  pValue?: number;
  framework?: 1 | 2;
}

export interface SavedFile {
  results?: Record<string, SavedResult>;
  versions?: Record<string, SavedResult>;
  lastRun?: { at: string; problems?: string[] };
}

/** The forward record as published: one summary per test, and where the chain stood. */
export interface ForwardRecordSummary {
  importedAt: string;
  /** The run the lines came from (the latest line's time). */
  lastLineAt: string;
  lines: number;
  chainHead: string;
  tests: Array<Omit<ForwardSummary, 'recent'>>;
  /** CG5: calls written and scored month by month, newest first (counts only, no figures). */
  monthly?: ForwardMonthRow[];
}

export interface RecordFile {
  note: string;
  runs: RecordedRun[];
  verdicts: RecordedVerdict[];
  forward?: ForwardRecordSummary;
}

export interface ImportInput {
  backtest?: SavedFile;
  forecast?: SavedFile;
  signal?: SavedFile;
  forward?: { lines: Array<ForwardBody & { hash: string }>; chainOk: boolean; badLines: number };
}

export interface ImportResult {
  record: RecordFile;
  added: string[];
  /** Rows on record without a p that took the p of this run. */
  filled: string[];
  notes: string[];
  forwardUpdated: boolean;
}

/** Registered hash per kind and file name ("id.json" or "id.vN.json"). */
export type RegisteredHashes = Record<VerdictKind, Record<string, string>>;

const fileName = (id: string, version: number) => (version === 1 ? `${id}.json` : `${id}.v${version}.json`);
const minute = (iso: string) => `${iso.slice(0, 16)}Z`;
const REGISTER_OF: Record<string, string> = Object.fromEntries(Object.entries(REGISTER_FORECAST_IDS).flatMap(([entry, ids]) => ids.map((id) => [id, entry])));

function savedVersions(f: SavedFile | undefined): SavedResult[] {
  const all = new Map<string, SavedResult>();
  for (const r of Object.values(f?.results || {})) if (r?.id) all.set(`${r.id} v${r.specVersion}`, r);
  for (const r of Object.values(f?.versions || {})) if (r?.id) all.set(`${r.id} v${r.specVersion}`, r);
  return [...all.values()].sort((a, b) => a.id.localeCompare(b.id) || a.specVersion - b.specVersion);
}

/** The p a saved result was judged on: the runner's own p for backtests and signal tests, the worst horizon's for forecast evaluations. */
export function savedP(kind: VerdictKind, r: SavedResult): number | undefined {
  const ok = (p: unknown): p is number => typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1;
  if (kind === 'forecast') return pFromSummary(r.verdict);
  return ok(r.pValue) ? r.pValue : pFromSummary(r.verdict);
}

export function importRun(record: RecordFile, input: ImportInput, registered: RegisteredHashes, opts: { where: string; now: string }): ImportResult {
  const verdicts = [...record.verdicts];
  const added: string[] = [];
  const filled: string[] = [];
  const notes: string[] = [];
  const has = (kind: VerdictKind, id: string, version: number) => verdicts.some((v) => (v.kind ?? 'backtest') === kind && v.id === id && v.version === version);
  let latest = '';
  for (const kind of ['backtest', 'forecast', 'signal'] as VerdictKind[]) {
    for (const r of savedVersions(input[kind])) {
      const file = fileName(r.id, r.specVersion);
      const hash = registered[kind]?.[file];
      if (has(kind, r.id, r.specVersion)) {
        // A row recorded before rows carried p: take the p of this run when it ran the registered file
        // and gave the same verdict. The verdict, summary and date on record stay as they are.
        const i = verdicts.findIndex((v) => (v.kind ?? 'backtest') === kind && v.id === r.id && v.version === r.specVersion);
        const row = verdicts[i];
        const p = savedP(kind, r);
        if (row.verdict !== 'too_few_cases' && row.p === undefined && pFromSummary(row.summary) === undefined && p !== undefined && hash && hash === r.specHash && row.verdict === r.status) {
          verdicts[i] = { ...row, p, pRanAt: minute(r.ranAt) };
          filled.push(`${r.id} v${r.specVersion}`);
          if (r.ranAt > latest) latest = r.ranAt;
        }
        continue;
      }
      if (!hash) {
        notes.push(`${r.id} v${r.specVersion} (${kind}): no registered test file ${file}; left out`);
        continue;
      }
      if (hash !== r.specHash) {
        notes.push(`${r.id} v${r.specVersion} (${kind}): run from a file whose hash differs from the registered one; left out`);
        continue;
      }
      const registerId = kind === 'forecast' && REGISTER_OF[r.id] && REGISTER_OF[r.id] !== r.id ? REGISTER_OF[r.id] : undefined;
      const p = savedP(kind, r);
      verdicts.push({
        id: r.id,
        ...(registerId ? { registerId } : {}),
        ...(kind !== 'backtest' ? { kind } : {}),
        version: r.specVersion,
        ranAt: minute(r.ranAt),
        verdict: r.status,
        ...(kind === 'backtest' ? { method: r.framework ?? 1 } : {}),
        ...(p !== undefined ? { p } : {}),
        summary: r.verdict,
      });
      added.push(`${r.id} v${r.specVersion}`);
      if (r.ranAt > latest) latest = r.ranAt;
    }
  }
  let forward = record.forward;
  let forwardUpdated = false;
  const fw = input.forward;
  if (fw && fw.lines.length) {
    if (!fw.chainOk || fw.badLines) notes.push(`forward.jsonl: the hash chain is broken (${fw.badLines} unreadable lines); the forward record was not imported`);
    else if (forward && fw.lines.length < forward.lines) notes.push(`forward.jsonl: ${fw.lines.length} lines, fewer than the ${forward.lines} already summarised; not imported`);
    else if (!forward || fw.lines.length > forward.lines || fw.lines[fw.lines.length - 1].hash !== forward.chainHead) {
      const sums = forwardSummary(fw.lines);
      forward = {
        importedAt: opts.now,
        lastLineAt: fw.lines.map((l) => l.at).sort().pop()!,
        lines: fw.lines.length,
        chainHead: fw.lines[fw.lines.length - 1].hash,
        tests: Object.values(sums)
          .sort((a, b) => a.test.localeCompare(b.test))
          .map(({ recent: _recent, ...s }) => s),
        monthly: forwardByMonth(fw.lines),
      };
      forwardUpdated = true;
    }
  }
  const runs = [...record.runs];
  if (added.length || filled.length || forwardUpdated) {
    const what = [added.length ? `added ${added.join(', ')}` : 'no new tests', filled.length ? `p filled in from this run for ${filled.join(', ')} (recorded before rows carried p; same test file and same verdict, which stays as recorded)` : '', forwardUpdated ? `forward record summarised (${forward!.lines} lines)` : ''].filter(Boolean).join('; ');
    runs.push({ ranAt: minute(latest || forward?.lastLineAt || opts.now), where: `${opts.where}: imported with npm run track-record:import from data/local/validation/; ${what}. Tests already on record keep their first recorded verdict.` });
  }
  return { record: { ...record, runs, verdicts, ...(forward ? { forward } : {}) }, added, filled, notes, forwardUpdated };
}

/** The record file as it is kept in the repository: one run or verdict per line, so a new row is a one-line diff. */
export function recordJson(r: RecordFile): string {
  const one = (x: object) => `{${Object.entries(x).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ')}}`;
  const block = (rows: object[]) => (rows.length ? `[\n${rows.map((x) => `    ${one(x)}`).join(',\n')}\n  ]` : '[]');
  const parts = [`  "note": ${JSON.stringify(r.note)}`, `  "runs": ${block(r.runs)}`, `  "verdicts": ${block(r.verdicts)}`];
  if (r.forward) {
    const { tests, ...head } = r.forward;
    parts.push(`  "forward": {\n${Object.entries(head).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')},\n    "tests": [\n${tests.map((t) => `      ${one(t)}`).join(',\n')}\n    ]\n  }`);
  }
  return `{\n${parts.join(',\n')}\n}\n`;
}
