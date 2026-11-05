/**
 * Research library (Sam, 2026-11-05): council conversations and policy documents kept on this
 * computer, so they survive a reload and can be reopened, copied or sent to Reports later.
 *
 * Saved in data/local/research.json (DATA_DIR/local when DATA_DIR is set). data/local/ is in
 * .gitignore and is shared by `npm run dev` and Docker (docker-compose bind-mounts it), like the
 * Settings file. Nothing here is sent anywhere.
 *
 * The pure functions (add, remove, list) are browser-safe; only loadLibrary and saveLibrary touch
 * the file system, and the server imports them.
 */
import type { SavedCouncilBrief } from './askCouncil';
import type { PolicyDoc } from './policyDocs';
import { MAX_DOC_CHARS } from './policyDocs';

export const MAX_SAVED_BRIEFS = 200;
export const MAX_SAVED_DOCS = 30;

export interface SavedBriefEntry extends SavedCouncilBrief {
  id: string;
  savedAt: string;
}

export interface ResearchLibrary {
  briefs: SavedBriefEntry[];
  docs: PolicyDoc[];
}

/** One line per saved conversation, for the list. */
export interface BriefSummary {
  id: string;
  question: string;
  askedAt: string;
  savedAt: string;
  scopeNote: string;
  headline?: string;
  /** Questions in the conversation, counting this one. */
  turns: number;
}

export interface DocSummary {
  id: string;
  title: string;
  addedAt: string;
  pages?: number;
  chars: number;
}

export const EMPTY_LIBRARY: ResearchLibrary = { briefs: [], docs: [] };

/** A conversation's id: the time its latest question was asked, so later answers overwrite it. */
export const briefId = (askedAt: string) => `b-${askedAt.replace(/[^0-9]/g, '')}`;

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

export function isBrief(v: unknown): v is SavedCouncilBrief {
  const b = v as SavedCouncilBrief;
  return Boolean(b && typeof b.question === 'string' && b.question.trim() && typeof b.askedAt === 'string' && Array.isArray(b.answers));
}

export function isDoc(v: unknown): v is PolicyDoc {
  const d = v as PolicyDoc;
  return Boolean(d && typeof d.id === 'string' && d.id && typeof d.title === 'string' && typeof d.text === 'string' && d.text.trim());
}

/** Add or replace a conversation (same id = same conversation, newer answer), newest first. */
export function addBrief(lib: ResearchLibrary, b: SavedCouncilBrief, now: Date = new Date()): { lib: ResearchLibrary; id: string } {
  const id = briefId(b.startedAt || b.askedAt);
  const entry: SavedBriefEntry = { ...b, question: str(b.question, 500), id, savedAt: now.toISOString() };
  const briefs = [entry, ...lib.briefs.filter((x) => x.id !== id)].sort((x, y) => y.askedAt.localeCompare(x.askedAt)).slice(0, MAX_SAVED_BRIEFS);
  return { lib: { ...lib, briefs }, id };
}

export function removeBrief(lib: ResearchLibrary, id: string): ResearchLibrary {
  return { ...lib, briefs: lib.briefs.filter((b) => b.id !== id) };
}

/** Add a document (same id replaces), newest first, text capped as in the picker. */
export function addDoc(lib: ResearchLibrary, d: PolicyDoc): ResearchLibrary {
  const doc: PolicyDoc = { id: str(d.id, 80), title: str(d.title, 200) || 'Document', text: d.text.slice(0, MAX_DOC_CHARS), addedAt: str(d.addedAt, 40) || new Date().toISOString(), ...(d.pages ? { pages: d.pages } : {}) };
  return { ...lib, docs: [doc, ...lib.docs.filter((x) => x.id !== doc.id)].slice(0, MAX_SAVED_DOCS) };
}

export function removeDoc(lib: ResearchLibrary, id: string): ResearchLibrary {
  return { ...lib, docs: lib.docs.filter((d) => d.id !== id) };
}

export function summarise(lib: ResearchLibrary): { briefs: BriefSummary[]; docs: DocSummary[] } {
  return {
    briefs: lib.briefs.map((b) => ({
      id: b.id,
      question: b.question,
      askedAt: b.askedAt,
      savedAt: b.savedAt,
      scopeNote: b.scopeNote,
      ...(b.synthesis?.brief?.headline ? { headline: b.synthesis.brief.headline } : {}),
      turns: (b.earlier?.length || 0) + 1,
    })),
    docs: lib.docs.map((d) => ({ id: d.id, title: d.title, addedAt: d.addedAt, ...(d.pages ? { pages: d.pages } : {}), chars: d.text.length })),
  };
}

/** Anything unreadable in the file is dropped; a missing or broken file reads as empty. */
export function parseLibrary(raw: unknown): ResearchLibrary {
  const r = raw as Partial<ResearchLibrary> | null;
  return {
    briefs: Array.isArray(r?.briefs) ? r!.briefs.filter((b): b is SavedBriefEntry => isBrief(b) && typeof (b as SavedBriefEntry).id === 'string') : [],
    docs: Array.isArray(r?.docs) ? r!.docs.filter(isDoc) : [],
  };
}
