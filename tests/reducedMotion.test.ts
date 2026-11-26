import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { prefersReducedMotion, scrollBehavior } from '../src/utils/motion.ts';

const g = globalThis as unknown as { window?: unknown };

test('scrolls glide by default and jump when reduce motion is on', () => {
  const saved = g.window;
  try {
    g.window = { matchMedia: () => ({ matches: false }) };
    assert.equal(scrollBehavior(), 'smooth');
    g.window = { matchMedia: (q: string) => ({ matches: q === '(prefers-reduced-motion: reduce)' }) };
    assert.equal(prefersReducedMotion(), true);
    assert.equal(scrollBehavior(), 'auto');
    g.window = { matchMedia: () => { throw new Error('no'); } };
    assert.equal(scrollBehavior(), 'smooth');
  } finally {
    g.window = saved;
  }
});

test('the style sheet stops animations under reduce motion and no script asks for a fixed smooth scroll', () => {
  const css = readFileSync('src/index.css', 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration: 0\.01ms !important/);
  const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f)).map((f) => join('src', f));
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /behavior:\s*'smooth'/, file);
  }
});
