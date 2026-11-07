/** Writes docs/GLOSSARY.md from src/data/glossary.ts (npm run docs:glossary). */
import { writeFileSync } from 'node:fs';
import { glossaryMarkdown } from '../src/data/glossary.ts';

writeFileSync(new URL('../docs/GLOSSARY.md', import.meta.url), glossaryMarkdown());
console.log('Wrote docs/GLOSSARY.md');
