/**
 * "Cite this" (data plan G11): a citation for a chart, a table or a council answer, ready to paste
 * into a paper or a reference manager. It cites the app (name, version, date accessed) and, under
 * it, each outside source behind the figures with the credit its own terms ask for (the licence
 * register, src/data/dataLicences.ts) and the date the figures were read.
 *
 * Three forms: plain text, BibTeX and RIS. A source the register does not name is the app's own
 * calculation (a model reading, a ratio); it gets no entry of its own, and the citation says some
 * figures are worked out by the app from the sources listed. Browser-safe, pure.
 */
import type { LicenceRow } from '../data/dataLicences';
import { creditLine } from './creditLines';
import { licenceRowsForSource } from './licenceLookup';

/** The app as it cites itself; matches CITATION.cff and package.json (a test checks). */
export const APP_CITATION = {
  title: 'EconQuest Terminal',
  authors: 'EconQuest Terminal contributors',
  version: '0.1.0',
  licence: 'Apache-2.0',
} as const;

export type CiteKind = 'chart' | 'table' | 'answer';

export interface CiteInput {
  kind: CiteKind;
  /** What is being cited, as the screen titles it ("Government debt, Brazil"). */
  title: string;
  /** Source texts as the figures carry them ("IMF WEO, 2025"). Empty and repeated ones are fine. */
  sources: Array<string | undefined>;
  /** Day the person is citing it (YYYY-MM-DD). */
  accessed: string;
  /** Day the figures were read from their sources, when known (YYYY-MM-DD). */
  asOf?: string;
}

export interface CitedSource {
  id: string;
  name: string;
  /** The credit the source's terms ask for. */
  credit: string;
}

export interface Citation {
  text: string;
  bibtex: string;
  ris: string;
  sources: CitedSource[];
  /** Some source texts name no register row: figures the app worked out itself. */
  ownCalculation: boolean;
}

const KIND_LABEL: Record<CiteKind, string> = { chart: 'Chart', table: 'Table', answer: 'Council answer' };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-11-11" -> "11 November 2026"; anything else as given. */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/** Register rows behind the source texts, each once, with the credit filled from the first text naming it. */
export function citedSources(sources: Array<string | undefined>): { cited: CitedSource[]; ownCalculation: boolean } {
  const seen = new Map<string, CitedSource>();
  let ownCalculation = false;
  for (const raw of sources) {
    const source = (raw || '').trim();
    if (!source) continue;
    const rows: LicenceRow[] = licenceRowsForSource(source);
    if (!rows.length) ownCalculation = true;
    for (const row of rows) if (!seen.has(row.id)) seen.set(row.id, { id: row.id, name: row.name, credit: creditLine(row, source) });
  }
  return { cited: [...seen.values()], ownCalculation };
}

/** BibTeX braces and specials: keep the text as written. */
const bib = (s: string) => s.replace(/\\/g, '\\textbackslash{}').replace(/([{}%&$#_])/g, '\\$1');
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'item';

export function citation(input: CiteInput): Citation {
  const { cited, ownCalculation } = citedSources(input.sources);
  const year = input.accessed.slice(0, 4);
  const app = APP_CITATION;
  const label = KIND_LABEL[input.kind];
  const asOf = input.asOf ? ` Figures as read from their sources on ${longDate(input.asOf)}.` : '';
  const calcNote = ownCalculation ? ' Some figures are worked out by the app from the sources listed.' : '';
  const readOn = input.asOf || input.accessed;

  const text = [
    `${app.authors} (${year}). "${input.title}" [${label.toLowerCase()}]. ${app.title}, version ${app.version}. Accessed ${longDate(input.accessed)}.${asOf}${calcNote}`,
    ...(cited.length ? ['', 'Data sources:', ...cited.map((s) => `- ${s.credit} Retrieved through ${app.title} on ${longDate(readOn)}.`)] : []),
  ].join('\n');

  const key = `econquest_${slug(input.title)}_${input.accessed.replace(/-/g, '')}`;
  const entries = [
    [
      `@misc{${key},`,
      `  author = {{${bib(app.authors)}}},`,
      `  title = {{${bib(input.title)}}},`,
      `  howpublished = {${bib(`${label} in ${app.title}, version ${app.version}`)}},`,
      `  year = {${year}},`,
      `  urldate = {${input.accessed}},`,
      `  note = {${bib(`Accessed ${input.accessed}.${asOf}${calcNote}`.trim())}}`,
      '}',
    ].join('\n'),
    ...cited.map((s) =>
      [
        `@misc{${s.id}_${readOn.replace(/-/g, '')},`,
        `  title = {{${bib(s.name)}}},`,
        `  year = {${readOn.slice(0, 4)}},`,
        `  urldate = {${readOn}},`,
        `  note = {${bib(`${s.credit} Retrieved through ${app.title} on ${readOn}.`)}}`,
        '}',
      ].join('\n')
    ),
  ];
  const bibtex = `${entries.join('\n\n')}\n`;

  const risDate = (d: string) => d.replace(/-/g, '/');
  const ris = [
    ['TY  - ' + (input.kind === 'answer' ? 'GEN' : 'DATA'), `AU  - ${app.authors}`, `TI  - ${input.title}`, `PY  - ${year}`, `Y2  - ${risDate(input.accessed)}`, `PB  - ${app.title}`, `ET  - ${app.version}`, `M3  - ${label}`, `N1  - ${`Accessed ${input.accessed}.${asOf}${calcNote}`.trim()}`, 'ER  - '].join('\n'),
    ...cited.map((s) => ['TY  - DATA', `TI  - ${s.name}`, `PY  - ${readOn.slice(0, 4)}`, `Y2  - ${risDate(readOn)}`, `N1  - ${s.credit} Retrieved through ${app.title} on ${readOn}.`, 'ER  - '].join('\n')),
  ].join('\n\n') + '\n';

  return { text, bibtex, ris, sources: cited, ownCalculation };
}

/** File name stem for a citation download. */
export function citationFileStem(title: string): string {
  return `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60).replace(/^-|-$/g, '') || 'item'}-citation`;
}

/** CITATION.cff for a replication pack: the app, plus a note on what the pack holds and when it was made. */
export function packCitationCff(title: string, made: string): string {
  const app = APP_CITATION;
  const q = (s: string) => JSON.stringify(s);
  return [
    'cff-version: 1.2.0',
    `message: ${q(`If you use this replication pack, please cite ${app.title} and each data source listed in data-manifest.csv.`)}`,
    `title: ${q(`${title} (replication pack from ${app.title})`)}`,
    'type: dataset',
    'authors:',
    `  - name: ${q(app.authors)}`,
    `version: ${q(app.version)}`,
    `date-released: ${q(made)}`,
    'references:',
    '  - type: software',
    `    title: ${q(app.title)}`,
    '    authors:',
    `      - name: ${q(app.authors)}`,
    `    version: ${q(app.version)}`,
    '',
  ].join('\n');
}
