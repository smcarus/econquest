import type express from 'express';
import path from 'path';
import { DATA_DIR, AUDIT_FILES, RESEARCH_FILE, REVIEW_FILE } from '../config';
import type { Account } from '../../utils/auth';
import { appendAudit } from '../../utils/auditStore';
import { loadLibrary } from '../../utils/researchStore';
import { loadReviews } from '../../utils/policyReviewStore';
import { councilBriefMarkdown } from '../../utils/briefExport';
import { withNotice } from '../../utils/disclaimer';
import type { MemoStep } from '../../utils/reviewMemo';
import { commentsFor, loadComments, loadShares, markDone, newComment, newShare, parseTarget, resolveShare, saveComments, saveShares, sharePage, type TargetKind } from '../../utils/teamWork';

/**
 * Team work (CG10, src/utils/teamWork.ts): comments on policy reviews and saved reports, and
 * read-only links to a memo or report. GET /share/<token> is a page, not an API call, so it opens
 * without signing in; everything else follows the role table (src/utils/permissions.ts).
 */
const COMMENTS_FILE = path.join(DATA_DIR, 'local', 'comments.json');
const SHARES_FILE = path.join(DATA_DIR, 'local', 'shares.json');

export interface TeamDeps {
  signedIn: (res: express.Response) => Account | null;
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
}

function targetText(kind: TargetKind, id: string): { title: string; body: string } | null {
  if (kind === 'review') {
    const r = loadReviews(REVIEW_FILE).reviews.find((x) => x.id === id);
    const memo = r?.steps.memo?.content as MemoStep | undefined;
    return r && memo ? { title: memo.title || r.title, body: withNotice(memo.markdown) } : null;
  }
  const b = loadLibrary(RESEARCH_FILE).briefs.find((x) => x.id === id);
  return b ? { title: b.question.slice(0, 160), body: councilBriefMarkdown(b) } : null;
}

export function registerTeamRoutes(app: express.Express, deps: TeamDeps): void {
  const who = (res: express.Response) => {
    const a = deps.signedIn(res);
    return a ? { name: a.displayName || a.username, account: a.id, admin: a.role === 'admin' } : { name: 'Local user', admin: true };
  };

  app.get('/api/comments', (req, res) => {
    const t = parseTarget(req.query.kind, req.query.id);
    if (!t) return res.status(400).json({ error: 'Say which review or report.' });
    res.json({ comments: commentsFor(loadComments(COMMENTS_FILE), t.kind, t.targetId) });
  });
  app.post('/api/comments', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    const me = who(res);
    const c = newComment({ kind: req.body?.kind, targetId: req.body?.id, text: req.body?.text }, me);
    if ('error' in c) return res.status(400).json({ error: c.error });
    if (!targetText(c.kind, c.targetId) && !(c.kind === 'review' && loadReviews(REVIEW_FILE).reviews.some((r) => r.id === c.targetId))) return res.status(404).json({ error: 'No review or report with that id.' });
    const all = [...loadComments(COMMENTS_FILE), c];
    saveComments(COMMENTS_FILE, all);
    appendAudit(AUDIT_FILES, { kind: 'research', summary: `Commented on ${c.kind} ${c.targetId} (${c.by})`, detail: { kind: c.kind, id: c.targetId, commentId: c.id } });
    res.json({ comment: c, comments: commentsFor(all, c.kind, c.targetId) });
  });
  app.post('/api/comments/:id/done', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    const out = markDone(loadComments(COMMENTS_FILE), req.params.id, who(res));
    if ('error' in out) return res.status(400).json({ error: out.error });
    saveComments(COMMENTS_FILE, out);
    const c = out.find((x) => x.id === req.params.id)!;
    res.json({ comments: commentsFor(out, c.kind, c.targetId) });
  });

  app.get('/api/shares', (_req, res) => {
    res.json({ links: loadShares(SHARES_FILE).map(({ tokenHash: _t, ...l }) => l) });
  });
  app.post('/api/shares', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    const t = parseTarget(req.body?.kind, req.body?.id);
    if (!t) return res.status(400).json({ error: 'Say which review or report.' });
    const text = targetText(t.kind, t.targetId);
    if (!text) return res.status(404).json({ error: t.kind === 'review' ? 'That review has no memo yet: write the memo first.' : 'No saved report with that id.' });
    const me = who(res);
    const out = newShare({ ...t, title: text.title, days: req.body?.days }, me.name);
    if ('error' in out) return res.status(400).json({ error: out.error });
    saveShares(SHARES_FILE, [...loadShares(SHARES_FILE), out.link]);
    appendAudit(AUDIT_FILES, { kind: 'access', summary: `Made a read-only link to ${t.kind} "${text.title.slice(0, 80)}" until ${out.link.expires.slice(0, 10)} (${me.name})`, detail: { kind: t.kind, id: t.targetId, expires: out.link.expires } });
    res.json({ path: `/share/${out.token}`, expires: out.link.expires, note: 'Copy the link now: it is shown once. Anyone who can reach this server can open it until it expires or you withdraw it.' });
  });
  app.post('/api/shares/withdraw', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    const links = loadShares(SHARES_FILE);
    const at = typeof req.body?.at === 'string' ? req.body.at : '';
    const l = links.find((x) => x.at === at && !x.withdrawn);
    if (!l) return res.status(404).json({ error: 'No live link made at that time.' });
    const me = who(res);
    if (!me.admin && l.by !== me.name) return res.status(403).json({ error: 'Only the person who made the link or an Admin can withdraw it.' });
    l.withdrawn = { by: me.name, at: new Date().toISOString() };
    saveShares(SHARES_FILE, links);
    appendAudit(AUDIT_FILES, { kind: 'access', summary: `Withdrew the read-only link to ${l.kind} "${l.title.slice(0, 80)}" (${me.name})` });
    res.json({ ok: true });
  });

  app.get('/share/:token', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    res.setHeader('Referrer-Policy', 'no-referrer');
    const links = loadShares(SHARES_FILE);
    const l = resolveShare(links, String(req.params.token || ''));
    if ('error' in l) return res.status(404).type('html').send(sharePage('Link not available', l.error, 'EconQuest Terminal, read-only link'));
    const text = targetText(l.kind, l.targetId);
    if (!text) return res.status(404).type('html').send(sharePage('Link not available', 'The memo or report behind this link was deleted.', 'EconQuest Terminal, read-only link'));
    l.opened += 1;
    try {
      saveShares(SHARES_FILE, links);
    } catch {
      // counting opens is best effort
    }
    res.type('html').send(sharePage(text.title, text.body, `Read-only copy shared by ${l.by} on ${l.at.slice(0, 10)}; the link works until ${l.expires.slice(0, 10)}. EconQuest Terminal.`));
  });
}
