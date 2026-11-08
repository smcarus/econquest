/**
 * Audit log (Sam, 2026-11-05): an append-only record of what the app showed and what was done in it,
 * so any council answer or saved report can be traced afterwards: the question, the AI model that
 * wrote the summary, every figure the agents used with its source and period, and each save,
 * delete, export, settings or key change.
 *
 * Each line is chained to the one before it by a SHA-256 hash (prev + the entry itself), in the
 * spirit of the change ledger in the Python econquest program. Checking the log recomputes the
 * chain, so a line changed or removed after it was written shows up. What it cannot show: someone
 * with access to the file who rewrites the whole chain from that point on. Keeping an export (or
 * just the latest hash) somewhere else covers that; a keyed seal is a later step.
 *
 * Never logged: API keys, passwords, uploaded document text, holdings amounts. Requests are logged
 * by what they did (route and outcome), not by their body.
 *
 * The hash chain itself is shared with the phone app and lives in src/engine/auditLog.ts.
 */
import { apiKeyField } from '../data/apiKeyFields';

export { AUDIT_KIND_LABEL, GENESIS, MAX_FIGURES, canonicalJson, entryHash, nextEntry, checkLog, type AuditKind, type AuditFigure, type AuditActor, type AuditInput, type AuditEntry, type AuditCheck } from '../engine/auditLog';
import { AUDIT_KIND_LABEL, MAX_FIGURES, type AuditFigure, type AuditInput, type AuditEntry, type AuditKind } from '../engine/auditLog';

/** The figures agents used, flattened for the log. */
export function figuresFromAnswers(answers: Array<{ name?: string; findings?: Array<{ iso3?: string; figures?: Array<{ label?: string; value?: string; source?: string; tag?: string }> }> }>): AuditFigure[] {
  const out: AuditFigure[] = [];
  for (const a of answers) {
    for (const f of a?.findings ?? []) {
      for (const g of f?.figures ?? []) {
        if (out.length >= MAX_FIGURES) return out;
        out.push({
          iso3: String(f?.iso3 ?? '').slice(0, 8),
          agent: String(a?.name ?? '').slice(0, 60),
          label: String(g?.label ?? '').slice(0, 120),
          value: String(g?.value ?? '').slice(0, 60),
          source: String(g?.source ?? '').slice(0, 240),
          tag: String(g?.tag ?? '').slice(0, 20),
        });
      }
    }
  }
  return out;
}

/**
 * What a successful request did, in plain words, or null when it changes nothing worth logging
 * (reads, status polls). Bodies are never read, so nothing secret reaches the log.
 */
export function describeRequest(method: string, path: string): AuditInput | null {
  const m = method.toUpperCase();
  const p = path.split('?')[0];
  let x: RegExpMatchArray | null;
  if (m === 'GET') {
    if ((x = p.match(/^\/api\/export\/([^/]+)\/([^/]+)\.(csv|xlsx)$/))) return { kind: 'export', summary: `Downloaded ${x[2].replace(/-/g, ' ')} for ${x[1].toUpperCase()} (${x[3].toUpperCase()})`, detail: { path: p } };
    if ((x = p.match(/^\/api\/audit\/export\.(csv|jsonl)$/))) return { kind: 'audit', summary: `Downloaded the audit log (${x[1].toUpperCase()})` };
    if (p === '/api/backup/download') return { kind: 'settings', summary: 'Downloaded a backup' };
    return null;
  }
  if (!['POST', 'PUT', 'DELETE'].includes(m)) return null;
  // Logged with full detail by the route itself, or read-only checks.
  if (/^\/api\/council\/(synthesise|debate|choose-agents|rerun|regression)$/.test(p)) return null;
  if (/^\/api\/ai\/(ollama-status|runtime-config-load)$/.test(p)) return null;
  if (p === '/api/audit/check') return null;
  // Sign-in, sign-out and account changes are logged by their routes, with the account name.
  if (/^\/api\/auth\//.test(p)) return null;
  // Sign-offs are logged by their route, with the name and content hash.
  if (/^\/api\/signoffs\//.test(p)) return null;
  // Your own series: saves and deletes are logged by their route with the file's SHA-256; checks change nothing.
  if (/^\/api\/own-series(\/|$)/.test(p)) return null;

  if ((x = p.match(/^\/api\/settings\/keys\/([^/]+)(\/test)?$/))) {
    const field = apiKeyField(decodeURIComponent(x[1]));
    const name = field?.label || x[1];
    const secret = field?.secret !== false;
    if (x[2]) return { kind: 'settings', summary: `Tested the setting "${name}"` };
    return { kind: 'settings', summary: m === 'DELETE' ? `Removed the setting "${name}"` : `Saved the setting "${name}"${secret ? ' (the value itself is not logged)' : ''}` };
  }
  // Logged by the route only when the value really changed (the page re-sends it on every load).
  if (/^\/api\/workspace\//.test(p)) return null;
  if ((x = p.match(/^\/api\/research\/(briefs|council-docs|docs|notebooks|episodes)(?:\/([^/]+))?$/))) {
    const what = { briefs: 'council conversation', 'council-docs': 'council document', docs: 'document', notebooks: 'notebook', episodes: 'teaching episode' }[x[1]]!;
    const verb = m === 'DELETE' ? 'Deleted' : m === 'PUT' ? 'Updated' : 'Saved';
    return { kind: 'research', summary: `${verb} a ${what} in Reports`, ...(x[2] ? { detail: { id: x[2] } } : {}) };
  }
  const fixed: Record<string, AuditInput> = {
    'POST /api/backup/restore': { kind: 'settings', summary: 'Restored a backup (the previous files were kept)' },
    'POST /api/validation/run': { kind: 'validation', summary: 'Ran the pre-registered backtests' },
    'POST /api/data/refresh': { kind: 'data', summary: 'Refreshed the data feeds' },
    'POST /api/preload/start': { kind: 'data', summary: 'Started downloading all country data' },
    'POST /api/preload/stop': { kind: 'data', summary: 'Stopped downloading country data' },
    'PUT /api/morning-brief': { kind: 'settings', summary: 'Changed the morning brief settings' },
    'POST /api/morning-brief/run': { kind: 'research', summary: 'Ran the morning brief' },
    'PUT /api/watch-rules': { kind: 'settings', summary: 'Changed the watch alerts' },
    'POST /api/ai/runtime-config-save': { kind: 'model', summary: 'Changed the AI model settings' },
    'POST /api/ai/ollama-pull': { kind: 'model', summary: 'Downloaded an Ollama model' },
    'POST /api/ai/ollama-test': { kind: 'model', summary: 'Tested Ollama' },
    'POST /api/ai/try-model': { kind: 'model', summary: 'Tested the AI model' },
    'POST /api/council/phase1-and-cascade': { kind: 'council', summary: 'Ran the full council' },
    'POST /api/council/supreme-council': { kind: 'council', summary: 'Ran the council verdict step' },
    'POST /api/council/supreme-synthesis': { kind: 'council', summary: 'Ran the council verdict step' },
    'POST /api/connectors/ping-and-inspect': { kind: 'settings', summary: 'Checked a connector' },
    'POST /api/council/webhook-dispatch': { kind: 'settings', summary: 'Sent a council result to a webhook' },
    'POST /api/v1/integration/publish': { kind: 'settings', summary: 'Published a council result through the integration API' },
  };
  const hit = fixed[`${m} ${p}`];
  if (hit) return hit;
  return { kind: 'data', summary: `${m} ${p}` };
}

export const AUDIT_HEADER = ['Entry', 'Time (UTC)', 'Kind', 'By', 'What happened', 'AI model', 'Figures used', 'Detail', 'Hash'];

export function auditRows(entries: AuditEntry[]): Array<Array<string | number>> {
  return entries.map((e) => {
    const d = (e.detail ?? {}) as Record<string, unknown>;
    const figures = Array.isArray(d.figures) ? (d.figures as AuditFigure[]) : [];
    const rest = { ...d };
    delete rest.figures;
    return [
      e.seq,
      e.at,
      AUDIT_KIND_LABEL[e.kind] ?? e.kind,
      e.by ? `${e.by.name} (${e.by.username})` : '',
      e.summary,
      typeof d.model === 'string' ? d.model : '',
      figures.map((f) => `${f.iso3} ${f.label} ${f.value} (${f.source})`).join('; '),
      Object.keys(rest).length ? JSON.stringify(rest) : '',
      e.hash,
    ];
  });
}
