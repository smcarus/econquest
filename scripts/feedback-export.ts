/**
 * npm run feedback:export (roadmap P3): writes the council answers rated in the app to
 * data/local/feedback-export.json, newest rating per question, to read through and add to the
 * council test set (docs/validation/council-regression/cases.json). Questions, ratings and reasons
 * only: no figures, no keys. Nothing is sent anywhere.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ratedQuestions } from '../src/utils/feedback.ts';
import { feedbackFilePath, loadFeedback } from '../src/utils/feedbackStore.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const rated = ratedQuestions(loadFeedback(feedbackFilePath(dataDir)));
const out = path.join(dataDir, 'local', 'feedback-export.json');
writeFileSync(out, JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Rated council answers from this computer. Questions, ratings and reasons only. Ratings never change an answer.', rated }, null, 1) + '\n', { mode: 0o600 });
const down = rated.filter((r) => r.rating === 'down').length;
console.log(`${rated.length} rated question${rated.length === 1 ? '' : 's'} (${rated.length - down} up, ${down} down) written to ${path.relative(root, out)}.`);
