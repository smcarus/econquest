/**
 * Feedback file (server and scripts only): one JSON record per line in data/local/feedback.jsonl
 * (mode 600), added to, never edited. Types and rules are in src/utils/feedback.ts.
 */
import fs from 'fs';
import path from 'path';
import type { FeedbackEntry } from './feedback';

export function feedbackFilePath(dataDir: string): string {
  return path.join(dataDir, 'local', 'feedback.jsonl');
}

export function loadFeedback(file: string): FeedbackEntry[] {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out: FeedbackEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as FeedbackEntry;
      if (e && typeof e.id === 'string' && (e.kind === 'flag' || e.kind === 'rating')) out.push(e);
    } catch {
      // a broken line is skipped
    }
  }
  return out;
}

export function appendFeedback(file: string, entry: FeedbackEntry): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', { mode: 0o600 });
}
