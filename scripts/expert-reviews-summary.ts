/**
 * Writes docs/validation/expert-reviews.md from the expert reviews (roadmap P4) saved with the
 * policy reviews in data/local/reviews.json. Only reviews whose reviewer agreed to publication go in;
 * a name appears only where the reviewer chose it. See src/utils/expertReview.ts.
 *
 *   npm run reviews:summary                 reads data/local/reviews.json
 *   npm run reviews:summary -- <folder>     reads <folder>/local/reviews.json
 */
import fs from 'fs';
import path from 'path';
import { loadReviews, reviewFilePath, verifyExpertReviews } from '../src/utils/policyReviewStore.ts';
import { expertSummaryMarkdown } from '../src/utils/expertReview.ts';

const dataDir = process.argv[2] || process.env.DATA_DIR || path.join(process.cwd(), 'data');
const reviews = loadReviews(reviewFilePath(dataDir)).reviews;
const changed = reviews.flatMap((r) => verifyExpertReviews(r).map((id) => `${r.id}/${id}`));
if (changed.length) {
  console.error(`Not written: these expert reviews no longer match their hash (changed outside the app): ${changed.join(', ')}`);
  process.exit(1);
}
const rows = reviews.flatMap((r) => (r.expertReviews ?? []).map((x) => ({ reviewId: r.id, title: r.title, r: x })));
const out = new URL('../docs/validation/expert-reviews.md', import.meta.url);
fs.writeFileSync(out, expertSummaryMarkdown(rows, new Date().toISOString().slice(0, 10)));
const shown = rows.filter((x) => x.r.consent !== 'none').length;
console.log(`Wrote docs/validation/expert-reviews.md: ${shown} of ${rows.length} expert reviews have consent to publish.`);
