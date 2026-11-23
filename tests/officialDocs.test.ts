import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRoutineWbType, parseBisSpeeches, parseWdsDocs, speechesFor, wdsUrl } from '../src/utils/officialDocs.ts';

test('World Bank documents: routine project filings left out and counted, newest first, https links', () => {
  const j = { documents: {
    D1: { docty: 'Implementation Status and Results Report', docdt: '2026-11-14T05:00:00Z', display_title: 'ISR', url: 'http://documents.worldbank.org/curated/en/1' },
    D2: { docty: 'Policy Note', docdt: '2026-10-01T05:00:00Z', display_title: 'Kenya  Economic Update', url: 'http://documents.worldbank.org/curated/en/2', pdfurl: 'http://documents.worldbank.org/2.pdf' },
    D3: { docty: 'Country Economic Memorandum', docdt: '2026-11-02T05:00:00Z', display_title: 'CEM', url: 'http://documents.worldbank.org/curated/en/3' },
    D4: { docty: 'Climate Co-Benefits Assessment', docdt: '2026-11-18T05:00:00Z', display_title: 'x', url: 'http://x' },
    facets: {},
  } };
  const r = parseWdsDocs(j);
  assert.equal(r.routine, 2);
  assert.deepEqual(r.docs.map((d) => d.title), ['CEM', 'Kenya Economic Update']);
  assert.equal(r.docs[1].url, 'https://documents.worldbank.org/curated/en/2');
  assert.equal(r.docs[1].pdfUrl, 'https://documents.worldbank.org/2.pdf');
  assert.ok(isRoutineWbType('Procurement Plan') && !isRoutineWbType('Public Expenditure Review'));
  assert.match(wdsUrl('KE'), /countrycode_exact=KE/);
});

const item = (slug: string, title: string, desc: string, date: string) =>
  `<item rdf:about="https://www.bis.org/speeches/${slug}"><title>${title}</title><link>https://www.bis.org/speeches/${slug}</link><description>${desc}</description><dc:date>${date}T00:00:00Z</dc:date><cb:speech><cb:resource><cb:link>https://www.bis.org/speeches/${slug}.pdf</cb:link></cb:resource></cb:speech></item>`;

test('BIS speeches: parsed from the RSS and matched to a country by name or central bank, whole words only', () => {
  const xml = `<rdf:RDF>${item('a', 'Inflation &amp; policy', 'Speech by Mr X, Governor of the Central Bank of Nigeria, Abuja, 10 November 2026.', '2026-11-19')}${item('b', 'Krone', 'Speech by Ms Y, Governor of Danmarks Nationalbank, Copenhagen.', '2026-11-20')}${item('c', 'x', 'no link', 'bad')}</rdf:RDF>`;
  const all = parseBisSpeeches(xml);
  assert.deepEqual(all.map((d) => d.title), ['Krone', 'Inflation & policy']);
  assert.equal(all[1].pdfUrl, 'https://www.bis.org/speeches/a.pdf');
  assert.equal(speechesFor(all, 'NGA', 'Nigeria').length, 1);
  assert.equal(speechesFor(all, 'NER', 'Niger').length, 0, 'Niger is not Nigeria');
  assert.equal(speechesFor(all, 'DNK', 'Denmark')[0].title, 'Krone');
});
