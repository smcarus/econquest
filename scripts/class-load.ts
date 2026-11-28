/**
 * Class load test (roadmap Phase 5, Q11): can one modest laptop serve a class of 40?
 *
 *   npm run class:load                         40 students, 2 minutes of class, all cores
 *   npm run class:load -- --cores 2            the server held to 2 processor cores (Linux, taskset)
 *   npm run class:load -- --students 60 --minutes 5
 *
 * It starts its own copy of the app (Quests, classes and sign-in on, every data feed off, a fresh
 * data folder that is removed afterwards), so it never touches your own classes. Then it plays a
 * lesson:
 *   1. start of class: every student signs in at the same moment and opens the class;
 *   2. hand-in: every student hands in an answer at the same moment;
 *   3. the lesson: each student looks at the assignment and the class table every 10 seconds,
 *      while the teacher reads the entries, writes feedback at a person's pace and opens the
 *      gradebook;
 *   4. sealed files: the teacher loads one sealed hand-in file for every student at once, as after
 *      collecting them from students who worked on their own copies.
 * For each step it reports how long the replies took (median, 95th percentile, slowest), any
 * errors, and the server's memory and processor use. It passes when nothing failed and 95% of
 * replies in every step came within 1 second (2 seconds for the sign-in rush, since passwords are
 * checked with a deliberately slow hash). The report is also saved to
 * data/local/logs/class-load.json. Exit code 1 if it does not pass.
 */
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { sealHandIn, type HandInSheet } from '../src/utils/classHandIn';

export interface LoadOptions {
  students: number;
  seconds: number;
  cores?: number;
  pollSeconds?: number;
  log?: (line: string) => void;
}

export interface StepResult {
  step: string;
  requests: number;
  errors: string[];
  p50: number;
  p95: number;
  max: number;
  limitMs: number;
  pass: boolean;
}

export interface LoadReport {
  students: number;
  seconds: number;
  cores: number | 'all';
  machine: string;
  steps: StepResult[];
  peakMemoryMb: number | null;
  cpuSeconds: number | null;
  pass: boolean;
}

/** The q-th quantile (0..1) of the times, nearest rank. */
export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]!;
}

export function stepResult(step: string, times: number[], errors: string[], limitMs: number): StepResult {
  const p95 = Math.round(quantile(times, 0.95));
  return { step, requests: times.length + errors.length, errors: [...new Set(errors)].slice(0, 5), p50: Math.round(quantile(times, 0.5)), p95, max: Math.round(Math.max(0, ...times)), limitMs, pass: errors.length === 0 && times.length > 0 && p95 <= limitMs };
}

export function reportText(r: LoadReport): string {
  const rows = r.steps.map((s) => `  ${s.pass ? 'PASS' : 'FAIL'}  ${s.step.padEnd(34)} ${String(s.requests).padStart(5)} requests  median ${s.p50} ms  95% ${s.p95} ms (limit ${s.limitMs})  slowest ${s.max} ms${s.errors.length ? `  errors: ${s.errors.join(' | ')}` : ''}`);
  return [
    `Class load test: ${r.students} students, ${r.seconds} seconds of lesson, ${r.cores === 'all' ? 'all processor cores' : `${r.cores} processor cores`} (${r.machine})`,
    ...rows,
    `  Server memory at its peak: ${r.peakMemoryMb === null ? 'not measured on this system' : `${r.peakMemoryMb} MB`}; processor time used: ${r.cpuSeconds === null ? 'not measured on this system' : `${r.cpuSeconds} s`}`,
    r.pass ? 'Result: PASS' : 'Result: FAIL',
  ].join('\n');
}

/** A browser-like client: keeps the session cookie and sends the CSRF token on writes. */
class Client {
  cookie = '';
  csrf = '';
  constructor(private base: string) {}
  async req(method: string, p: string, body?: unknown): Promise<{ status: number; body: any; ms: number }> {
    const t0 = performance.now();
    const headers: Record<string, string> = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET' && this.csrf) headers['x-csrf-token'] = this.csrf;
    const r = await fetch(`${this.base}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
    const set = r.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const kv = c.split(';')[0]!;
      if (kv.split('=')[1]) this.cookie = kv;
    }
    const text = await r.text();
    const ms = performance.now() - t0;
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // a CSV download
    }
    return { status: r.status, body: parsed, ms };
  }
  async token() {
    this.csrf = (await this.req('GET', '/api/auth/status')).body.csrfToken || '';
  }
}

function memoryMb(pid: number): number | null {
  try {
    const m = /VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${pid}/status`, 'utf8'));
    return m ? Math.round(Number(m[1]) / 1024) : null;
  } catch {
    const r = spawnSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' });
    const kb = Number(r.stdout.trim());
    return r.status === 0 && kb > 0 ? Math.round(kb / 1024) : null;
  }
}

function cpuSeconds(pid: number): number | null {
  try {
    const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1]!.split(' ');
    return Math.round(((Number(f[11]) + Number(f[12])) / 100) * 10) / 10;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runLoad(opts: LoadOptions): Promise<LoadReport> {
  const log = opts.log ?? (() => {});
  const root = process.cwd();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'econquest-class-load-'));
  const port = 5200 + Math.floor(Math.random() * 500);
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    NODE_OPTIONS: `--import ${pathToFileURL(path.join(root, 'tests/helpers/offline-fetch.mjs')).href}`,
    PORT: String(port),
    DATA_DIR: dataDir,
    SCHEDULE_BACKTESTS: 'off',
    GEMINI_API_KEY: '',
    QUESTS_ENABLED: 'on',
    CLASSES_ENABLED: 'on',
  };
  const node = [process.execPath, '--import', 'tsx', path.join(root, 'server.ts')];
  const useTaskset = opts.cores && process.platform === 'linux' && spawnSync('taskset', ['--version']).status === 0;
  if (opts.cores && !useTaskset) log(`Note: --cores needs Linux and taskset; running on all cores.`);
  const cpuList = useTaskset ? Array.from({ length: Math.min(opts.cores!, os.cpus().length) }, (_, i) => i).join(',') : '';
  let srvLog = '';
  const proc: ChildProcess = useTaskset ? spawn('taskset', ['-c', cpuList, ...node], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] }) : spawn(node[0]!, node.slice(1), { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout?.on('data', (d) => (srvLog += d));
  proc.stderr?.on('data', (d) => (srvLog = (srvLog + d).slice(-20_000)));
  const pid = proc.pid!;
  let peak: number | null = null;
  const sampler = setInterval(() => {
    const m = memoryMb(pid);
    if (m !== null) peak = Math.max(peak ?? 0, m);
  }, 500);
  const steps: StepResult[] = [];
  try {
    const deadline = Date.now() + 90_000;
    for (;;) {
      if (proc.exitCode !== null) throw new Error(`the app stopped while starting:\n${srvLog.slice(-3000)}`);
      try {
        if ((await fetch(`${base}/api/ai/runtime-defaults`)).ok) break;
      } catch {
        // not listening yet
      }
      if (Date.now() > deadline) throw new Error(`the app did not start:\n${srvLog.slice(-3000)}`);
      await sleep(300);
    }
    log(`App started on ${base}; setting up a class of ${opts.students}.`);

    // Setup (not measured): the teacher, the class, the students, a class Quest and two assignments.
    const teacher = new Client(base);
    const must = async (c: Client, method: string, p: string, body?: unknown) => {
      const r = await c.req(method, p, body);
      if (r.status >= 400) throw new Error(`${method} ${p}: HTTP ${r.status} ${r.body?.error ?? ''}`);
      return r.body;
    };
    await must(teacher, 'POST', '/api/auth/setup', { username: 'prof', displayName: 'Professor', password: 'a long load test passphrase' });
    await teacher.token();
    const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
    const cls = (await must(teacher, 'POST', '/api/classes', { name: 'Load test', timeZone: 'UTC', term: { label: 'Term', starts: day(-10), ends: day(80) } })).class;
    const nicknames = Array.from({ length: opts.students }, (_, i) => `Student ${i + 1}`);
    const created: Array<{ username: string; password: string }> = [];
    for (let i = 0; i < nicknames.length; i += 25) created.push(...(await must(teacher, 'POST', `/api/classes/${cls.id}/students`, { nicknames: nicknames.slice(i, i + 25) })).created);
    const quest = { type: 'forecast', summary: 'Oil over the term.', level: 'intro', topic: 'commodities', region: 'Global', country: '', opensOn: day(0), closesOn: day(20), series: 'commodity_eia_rbrte', kind: 'direction', op: 'higher', on: day(60) };
    const q1 = await must(teacher, 'POST', `/api/classes/${cls.id}/class-quests`, { ...quest, title: 'Will Brent be higher at the end of term?' });
    const q2 = await must(teacher, 'POST', `/api/classes/${cls.id}/class-quests`, { ...quest, title: 'Will Brent be higher in two months?' });
    await must(teacher, 'POST', `/api/classes/${cls.id}/assignments`, { questId: q1.id, due: `${day(7)}T23:59`, aiRule: 'note' });
    await must(teacher, 'POST', `/api/classes/${cls.id}/assignments`, { questId: q2.id, due: `${day(7)}T23:59`, aiRule: 'note' });
    const list = (await must(teacher, 'GET', `/api/classes/${cls.id}/assignments`)).assignments as Array<{ id: string; questId: string }>;
    const a1 = list.find((a) => a.questId === q1.id)!.id;
    const a2 = list.find((a) => a.questId === q2.id)!.id;
    const cpu0 = cpuSeconds(pid);

    // Runs one request per item at the same moment and records the times.
    const rush = async (name: string, limitMs: number, items: Array<() => Promise<{ status: number; body: any; ms: number }>>) => {
      const times: number[] = [];
      const errors: string[] = [];
      await Promise.all(
        items.map(async (f) => {
          try {
            const r = await f();
            if (r.status >= 400) errors.push(`HTTP ${r.status} ${r.body?.error ?? ''}`.trim());
            else times.push(r.ms);
          } catch (e: any) {
            errors.push(String(e?.message || e));
          }
        }),
      );
      steps.push(stepResult(name, times, errors, limitMs));
      log(`${name}: done`);
    };

    // 1. Start of class.
    const kids = created.map(() => new Client(base));
    await rush('Sign in, all at once', 2000, created.map((c, i) => () => kids[i]!.req('POST', '/api/auth/sign-in', { username: c.username, password: c.password })));
    await Promise.all(kids.map((k) => k.token()));
    await rush('Open the class, all at once', 1000, kids.flatMap((k) => [() => k.req('GET', '/api/classes'), () => k.req('GET', `/api/classes/${cls.id}/assignments`)]));

    // 2. Hand-in.
    await rush('Hand in, all at once', 1000, kids.map((k, i) => () => k.req('POST', `/api/classes/${cls.id}/assignments/${a1}/entries`, { answer: { probability: ((i % 9) + 1) / 10 }, rationale: `Reason number ${i + 1}: demand and supply over the winter.`, aiNote: 'I did not use AI tools for this answer.' })));

    // 3. The lesson.
    const until = Date.now() + opts.seconds * 1000;
    const poll = (opts.pollSeconds ?? 10) * 1000;
    const lessonTimes: number[] = [];
    const lessonErrors: string[] = [];
    const teacherTimes: number[] = [];
    const teacherErrors: string[] = [];
    const record = (times: number[], errors: string[]) => async (p: Promise<{ status: number; body: any; ms: number }>) => {
      try {
        const r = await p;
        if (r.status >= 400) errors.push(`HTTP ${r.status} ${r.body?.error ?? ''}`.trim());
        else times.push(r.ms);
        return r;
      } catch (e: any) {
        errors.push(String(e?.message || e));
        return null;
      }
    };
    const studentLoop = async (k: Client, i: number) => {
      await sleep((i / kids.length) * poll);
      while (Date.now() < until) {
        const rec = record(lessonTimes, lessonErrors);
        await rec(k.req('GET', `/api/classes/${cls.id}/assignments`));
        await rec(k.req('GET', `/api/classes/${cls.id}/table`));
        await sleep(poll);
      }
    };
    const teacherLoop = async () => {
      const rec = record(teacherTimes, teacherErrors);
      const entries = (await rec(teacher.req('GET', `/api/classes/${cls.id}/assignments/${a1}/entries`)))?.body?.entries ?? [];
      await rec(teacher.req('GET', `/api/classes/${cls.id}/assignments/${a1}/feedback`));
      let n = 0;
      while (Date.now() < until) {
        const e = entries[n % Math.max(1, entries.length)];
        if (e?.ref) await rec(teacher.req('POST', `/api/classes/${cls.id}/assignments/${a1}/feedback`, { ref: e.ref, text: `Clear reasoning, note ${n + 1}.`, mark: 'B+' }));
        if (n % 5 === 0) {
          await rec(teacher.req('GET', `/api/classes/${cls.id}/gradebook`));
          await rec(teacher.req('GET', `/api/classes/${cls.id}/gradebook.csv`));
          await rec(teacher.req('GET', `/api/classes/${cls.id}/table`));
        }
        n++;
        await sleep(3000);
      }
    };
    await Promise.all([...kids.map(studentLoop), teacherLoop()]);
    steps.push(stepResult('Lesson: students look every 10 s', lessonTimes, lessonErrors, 1000));
    steps.push(stepResult('Lesson: teacher marks and reads', teacherTimes, teacherErrors, 1000));
    log('Lesson: done');

    // 4. Sealed files for the second assignment, loaded together.
    const sheet = (await must(teacher, 'GET', `/api/classes/${cls.id}/assignments/${a2}/sheet`)) as HandInSheet;
    const sealed = await Promise.all(created.map((c, i) => sealHandIn(sheet, { username: c.username, name: nicknames[i]!, answer: { probability: 0.5 }, rationale: 'Sealed on my own copy.', aiNote: 'I did not use AI tools for this answer.', sealedAt: new Date().toISOString(), sheetId: sheet.sheetId, questHash: sheet.questHash })));
    await rush('Teacher loads all sealed files', 1000, sealed.map((s) => () => teacher.req('POST', `/api/classes/${cls.id}/assignments/${a2}/hand-ins`, { sealed: s })));

    const cpu1 = cpuSeconds(pid);
    const report: LoadReport = {
      students: opts.students,
      seconds: opts.seconds,
      cores: useTaskset ? opts.cores! : 'all',
      machine: `${os.cpus().length} cores (${os.cpus()[0]?.model?.trim() ?? 'unknown'}), ${Math.round(os.totalmem() / 2 ** 30)} GB, Node ${process.versions.node}`,
      steps,
      peakMemoryMb: peak,
      cpuSeconds: cpu0 !== null && cpu1 !== null ? Math.round((cpu1 - cpu0) * 10) / 10 : null,
      pass: steps.every((s) => s.pass),
    };
    return report;
  } finally {
    clearInterval(sampler);
    proc.kill();
    await sleep(200);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  const arg = (name: string, dflt: number) => {
    const i = process.argv.indexOf(`--${name}`);
    const n = i >= 0 ? Number(process.argv[i + 1]) : dflt;
    if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} takes a number above 0`);
    return n;
  };
  const report = await runLoad({ students: Math.round(arg('students', 40)), seconds: Math.round(arg('minutes', 2) * 60), cores: process.argv.includes('--cores') ? Math.round(arg('cores', 2)) : undefined, log: (l) => console.log(l) });
  console.log(`\n${reportText(report)}`);
  const out = path.join(process.cwd(), 'data/local/logs/class-load.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify({ at: new Date().toISOString(), ...report }, null, 2)}\n`);
  console.log(`Saved: ${path.relative(process.cwd(), out)}`);
  process.exit(report.pass ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((e) => {
    console.error(e?.stack || e);
    process.exit(1);
  });
}
