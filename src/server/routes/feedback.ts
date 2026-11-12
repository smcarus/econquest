import type express from 'express';
import { DATA_DIR, AUDIT_FILES } from '../config';
import { appendAudit } from '../../utils/auditStore';
import { feedbackLine, issueUrl, parseFeedback, summariseFeedback } from '../../utils/feedback';
import { appendFeedback, feedbackFilePath, loadFeedback } from '../../utils/feedbackStore';

/**
 * Flags and answer ratings (roadmap P2, P3; src/utils/feedback.ts), kept in data/local/feedback.jsonl.
 * Nothing is sent anywhere: a flag returns a GitHub issue link that the person opens themselves.
 */
export interface FeedbackDeps {
  refuseRemoteChange: (req: express.Request, res: express.Response) => boolean;
}

const FEEDBACK_FILE = feedbackFilePath(DATA_DIR);

export function registerFeedbackRoutes(app: express.Express, deps: FeedbackDeps): void {
  app.post('/api/feedback', (req, res) => {
    if (deps.refuseRemoteChange(req, res)) return;
    const parsed = parseFeedback(req.body);
    if ('error' in parsed) return res.status(400).json({ error: parsed.error });
    const e = parsed.entry;
    try {
      appendFeedback(FEEDBACK_FILE, e);
    } catch (error: any) {
      return res.status(500).json({ error: `Could not save it (${error?.code || error?.message || 'unknown error'}).` });
    }
    const what = e.figure ? `the figure "${e.figure.label}"` : `the answer to "${(e.answer?.question ?? '').slice(0, 100)}"`;
    appendAudit(AUDIT_FILES, { kind: 'research', summary: e.kind === 'flag' ? `Flagged ${what}` : `Rated ${what} ${e.rating === 'up' ? 'up' : 'down'}`, detail: { id: e.id, kind: e.kind, target: e.target } });
    res.json({ entry: e, ...(e.kind === 'flag' ? { issueUrl: issueUrl(e) } : {}), file: 'data/local/feedback.jsonl' });
  });
  app.get('/api/feedback/summary', (_req, res) => {
    const s = summariseFeedback(loadFeedback(FEEDBACK_FILE));
    res.json({ ...s, line: feedbackLine(s), file: 'data/local/feedback.jsonl' });
  });
}
