/**
 * The working-paper bundle zip (R1, src/utils/notebookPins.ts): draft.md, one replication pack per
 * pinned figure under figures/, CITATION.cff, README.md and MANIFEST.txt with every file's SHA-256.
 */
import { strToU8, zipSync } from 'fflate';
import { replicationPack } from './replicationPack';
import { packCitationCff } from './citation';
import { withNotice } from './disclaimer';
import { pinFolder } from './notebookPins';
import type { Notebook } from './researchLibrary';

function notebookCitation(nb: Notebook, made: string): string {
  return packCitationCff(nb.title, made).replace('If you use this replication pack', 'If you use this notebook').replace(/\(replication pack from /, '(research notebook from ');
}

/** The bundle's files: name -> text. sha256 is handed in (the server uses Web Crypto). */
export async function notebookBundleFiles(nb: Notebook, md: string, sha256: (text: string) => Promise<string>, now: Date = new Date()): Promise<Record<string, string>> {
  const pins = nb.pins ?? [];
  const files: Record<string, string> = { 'draft.md': md };
  pins.forEach((p, i) => {
    for (const [name, text] of Object.entries(replicationPack(p.chart, now).files)) files[`${pinFolder(i, p)}/${name}`] = text;
  });
  files['CITATION.cff'] = notebookCitation(nb, now.toISOString().slice(0, 10));
  files['README.md'] = withNotice(
    [
      `# ${nb.title}`,
      '',
      `Working-paper bundle exported ${now.toISOString().slice(0, 10)}.`,
      '',
      '- `draft.md`: your notes, the saved conversations and documents, and the pinned figures with their As of day and fingerprint.',
      '- `figures/`: one folder per pinned figure with the data it drew (`data.csv`), the same tests in Python, R and Stata, a README listing each column with its source and credit, and a citation file.',
      '- `CITATION.cff`: how to cite this notebook and the app; cite each data source too (see each figure\'s `data-manifest.csv`).',
      '- `MANIFEST.txt`: the SHA-256 of every file, to check nothing changed after export.',
      '',
      pins.length ? `${pins.length} pinned figure${pins.length === 1 ? '' : 's'}.` : 'No figure is pinned yet: pin a Chart Agent chart from Council chat (Pin to notebook).',
      '',
    ].join('\n'),
  );
  const names = Object.keys(files).sort();
  const sums = await Promise.all(names.map((n) => sha256(files[n])));
  files['MANIFEST.txt'] = ['SHA-256 of each file in this bundle', '', ...names.map((n, i) => `${sums[i]}  ${n}`), ''].join('\n');
  return files;
}

export function notebookBundleZip(files: Record<string, string>, folder: string): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [`${folder}/${name}`, strToU8(text)])));
}
