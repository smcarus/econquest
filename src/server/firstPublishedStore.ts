/**
 * Saved figures as first published (G12 euro area, G13 UK; src/utils/firstPublished.ts), one
 * gzipped file per area in data/live/first-published-<area>.json.gz, packed the same way as the
 * pull archive (src/utils/pullArchive.ts) to keep the data folder small. Each series keeps its rows
 * (value, first and last day it was the published one). Server-only.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { writeFileAtomic } from '../utils/atomicWrite';
import type { AlfredSeries } from '../utils/alfredVintages';

export type FirstPublishedArea = 'ea' | 'uk';

export interface FirstPublishedFile {
  area: FirstPublishedArea;
  pulledAt: string;
  /** Where the figures came from, as shown under the panel. */
  source: string;
  series: AlfredSeries[];
}

export function firstPublishedPath(dataDir: string, area: FirstPublishedArea): string {
  return path.join(dataDir, 'live', `first-published-${area}.json.gz`);
}

export function saveFirstPublished(dataDir: string, file: FirstPublishedFile): string {
  const p = firstPublishedPath(dataDir, file.area);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  writeFileAtomic(p, zlib.gzipSync(JSON.stringify(file)));
  return p;
}

/** The saved file, or null when it was never saved or cannot be read. */
export function loadFirstPublished(dataDir: string, area: FirstPublishedArea): FirstPublishedFile | null {
  try {
    const j = JSON.parse(zlib.gunzipSync(fs.readFileSync(firstPublishedPath(dataDir, area))).toString('utf8')) as FirstPublishedFile;
    return j?.area === area && Array.isArray(j.series) && typeof j.pulledAt === 'string' ? j : null;
  } catch {
    return null;
  }
}
