/**
 * Runs the tests entered to one Signal Quest (src/utils/questSignal.ts), once, through the same
 * runner as the app's own pre-registered tests (src/utils/backtestRun.ts), and gives the verdicts
 * to record. Used by `npm run quests:run-tests`. Server and scripts only.
 *
 * Each counted entry becomes a test file in a fresh folder with its own manifest, so the runner's
 * hash check applies as it does to docs/validation/. The run's forward calls and saved results stay
 * in that folder: a Quest test does not write to the app's own validation record.
 *
 * All or nothing: if any counted test could not run (a feed did not answer, or files on disk are
 * missing), nothing is recorded, so a passing outage never becomes a permanent verdict.
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runBacktests, sha256 } from './backtestRun';
import type { SignalQuest } from './quests';
import { countedPublicEntries, entryPath, publicEntryProblems } from './questPublicEntries';
import { readPublicEntryFiles } from './questPublicEntryStore';
import { signalSpec, type QuestTestVerdict, type SignalTest } from './questSignal';

export interface QuestTestRunResult {
  verdicts: QuestTestVerdict[];
  /** Entries that were not run, and why (a broken file is left out, never fixed). */
  skipped: Array<{ path: string; reason: string }>;
  /** Tests that could not run this time; when any, nothing should be recorded. */
  notRun: string[];
  problems: string[];
}

export async function runQuestTests(opts: {
  questsDir: string;
  quest: SignalQuest;
  questHash: string;
  by: string;
  now?: Date;
  fetcher?: Parameters<typeof runBacktests>[0]['fetcher'];
  local?: Parameters<typeof runBacktests>[0]['local'];
}): Promise<QuestTestRunResult> {
  const q = opts.quest;
  const files = readPublicEntryFiles(opts.questsDir).filter((f) => f.entry?.questId === q.id);
  const counted = countedPublicEntries(files.flatMap((f) => (f.entry ? [f.entry] : [])), q.id, q.version);
  const skipped: QuestTestRunResult['skipped'] = [];
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'quest-tests-'));
  const manifest: Record<string, string> = {};
  const planned: Array<{ id: string; n: number; login: string; entryHash: string; test: SignalTest }> = [];
  for (const e of counted) {
    const rel = entryPath(q.id, e.login, e.n);
    const file = files.find((f) => f.rel === rel)!;
    const problems = publicEntryProblems(e, rel, { quest: q, hash: opts.questHash, approved: true });
    if (problems.length) {
      skipped.push({ path: rel, reason: problems.join('; ') });
      continue;
    }
    const test = (e.answer as { test: SignalTest }).test;
    const spec = signalSpec(test, { questId: q.id, questVersion: q.version, login: e.login, n: e.n, registeredOn: q.closesOn });
    const text = JSON.stringify(spec, null, 2);
    const name = `${spec.id}.v${spec.version}.json`;
    fs.writeFileSync(path.join(work, name), text);
    manifest[name] = sha256(text);
    planned.push({ id: spec.id, n: e.n, login: e.login, entryHash: crypto.createHash('sha256').update(file.text).digest('hex'), test });
  }
  fs.writeFileSync(path.join(work, 'manifest.json'), JSON.stringify({ files: manifest }));
  if (!planned.length) return { verdicts: [], skipped, notRun: [], problems: [] };
  const out = await runBacktests({ specDir: work, resultFile: path.join(work, 'results.json'), forwardFile: path.join(work, 'forward.jsonl'), fetcher: opts.fetcher, now: opts.now, local: opts.local });
  const verdicts: QuestTestVerdict[] = [];
  const notRun: string[] = [];
  for (const p of planned) {
    const r = out.versions?.[`${p.id} v${p.n}`];
    if (!r) {
      notRun.push(`${p.login}.${p.n}.json (${p.test.method})`);
      continue;
    }
    const where = `${r.cases} cases, ${r.series.length} series, ${r.span.from} to ${r.span.to}`;
    verdicts.push({
      questId: q.id,
      questVersion: q.version,
      login: p.login,
      n: p.n,
      entryHash: p.entryHash,
      id: p.id,
      version: p.n,
      method: p.test.method,
      registeredOn: q.closesOn,
      maxPValue: p.test.passMark.maxPValue,
      ranAt: r.ranAt,
      by: opts.by,
      verdict: r.status,
      ...(Number.isFinite(r.pValue) && r.status !== 'too_few_cases' ? { p: r.pValue } : {}),
      summary: `${r.verdict} (${where}.)`,
    });
  }
  fs.rmSync(work, { recursive: true, force: true });
  return { verdicts, skipped, notRun, problems: out.problems };
}
