import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ANSWER_LANG_HEADER, answerLanguageFetch, answerLanguageNow, languageInstruction, parseAnswerLang, setAnswerLanguageSource, withAnswerLanguage } from '../src/utils/answerLanguage';

test('header value: es, fr, pt, anything else English', () => {
  assert.equal(parseAnswerLang('es'), 'es');
  assert.equal(parseAnswerLang('FR'), 'fr');
  assert.equal(parseAnswerLang('pt-BR'), 'pt');
  assert.equal(parseAnswerLang(['es']), 'es');
  assert.equal(parseAnswerLang('de'), 'en');
  assert.equal(parseAnswerLang(undefined), 'en');
});

test('English leaves every instruction unchanged, so the recorded council replay still applies', () => {
  assert.equal(languageInstruction('en'), '');
  assert.equal(withAnswerLanguage('You are the referee.', 'en'), 'You are the referee.');
});

test('other languages: one line, with the form of address, and fixed values kept in English', () => {
  assert.match(languageInstruction('es'), /Spanish.*"usted"/);
  assert.match(languageInstruction('fr'), /French.*"vous"/);
  assert.match(languageInstruction('pt'), /Brazilian Portuguese.*"você"/);
  assert.match(languageInstruction('es'), /Keep JSON field names/);
  assert.equal(withAnswerLanguage('X', 'fr'), `X\n\n${languageInstruction('fr')}`);
});

test('the language of the request being handled; English outside one', () => {
  setAnswerLanguageSource(() => undefined);
  assert.equal(answerLanguageNow(), 'en');
  setAnswerLanguageSource(() => 'pt');
  assert.equal(answerLanguageNow(), 'pt');
  setAnswerLanguageSource(() => undefined);
});

test('page fetch: the header goes only to this app\'s /api/, and never for English', async () => {
  const seen: Array<{ url: string; lang: string | null }> = [];
  const base = async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({ url: String(input), lang: new Headers(init?.headers).get(ANSWER_LANG_HEADER) });
    return new Response('{}');
  };
  let lang: 'en' | 'es' = 'es';
  const f = answerLanguageFetch(base, () => lang, 'http://localhost:3000');
  await f('/api/council/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  await f('/assets/x.js');
  await f('https://example.org/api/x');
  lang = 'en';
  await f('/api/council/chat');
  assert.deepEqual(seen, [
    { url: '/api/council/chat', lang: 'es' },
    { url: '/assets/x.js', lang: null },
    { url: 'https://example.org/api/x', lang: null },
    { url: '/api/council/chat', lang: null },
  ]);
});

test('every model step goes through the language line, and the server keeps it per request', () => {
  const ai = fs.readFileSync('src/server/ai.ts', 'utf8');
  assert.match(ai, /systemInstruction: withAnswerLanguage\(options\.systemInstruction, answerLanguageNow\(\)\)/);
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.match(server, /setAnswerLanguageSource\(\(\) => answerLangStore\.getStore\(\)\)/);
  assert.match(fs.readFileSync('src/main.tsx', 'utf8'), /answerLanguageFetch\(/);
});
