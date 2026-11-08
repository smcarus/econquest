import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { builtinModules } from 'module';

/**
 * The shared engine must run on the phone as well as the server. This test fails when engine code
 * (or the portable parts of the platform layer) reaches for anything only a computer has: Node
 * modules, Node globals, Express, or phone-only packages. Engine code may import only other engine
 * files and the platform's portable parts.
 */

const ROOT = path.resolve(import.meta.dirname, '..');
const PORTABLE_PLATFORM = ['src/platform/types.ts', 'src/platform/names.ts', 'src/platform/memory.ts'];
/** Platform files engine code may import (the device-specific ones are handed in, never imported). */
const ENGINE_MAY_IMPORT_PLATFORM = ['src/platform/types.ts', 'src/platform/names.ts'];

const NODE_MODULES = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));
const BANNED_PACKAGES = [/^express(\/|$)/, /^@capacitor\//, /^@capacitor-community\//, /^react(-dom)?(\/|$)/, /^vite(\/|$)/];
const BANNED_GLOBALS: Array<[RegExp, string]> = [
  [/\bprocess\s*\./, 'process'],
  [/\brequire\s*\(/, 'require()'],
  [/\bBuffer\s*\./, 'Buffer'],
  [/\b__dirname\b/, '__dirname'],
  [/\bimport\.meta\.dirname\b/, 'import.meta.dirname'],
];

function importsOf(text: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[^'";]*?\sfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) for (const m of text.matchAll(re)) if (m[1]) out.push(m[1]);
  return out;
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function resolveRelative(fromFile: string, spec: string): string {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  return /\.(ts|tsx)$/.test(base) ? base : `${base}.ts`;
}

export function boundaryProblems(file: string, text: string, isEngine: boolean): string[] {
  const problems: string[] = [];
  const code = stripComments(text);
  for (const spec of importsOf(code)) {
    if (NODE_MODULES.has(spec)) problems.push(`${file} imports the Node module "${spec}".`);
    else if (BANNED_PACKAGES.some((re) => re.test(spec))) problems.push(`${file} imports "${spec}", which the phone engine cannot use.`);
    else if (spec.startsWith('.')) {
      const target = resolveRelative(file, spec);
      const inEngine = target.startsWith('src/engine/');
      const okPlatform = isEngine ? ENGINE_MAY_IMPORT_PLATFORM.includes(target) : PORTABLE_PLATFORM.includes(target);
      if (!inEngine && !okPlatform) problems.push(`${file} imports ${target}, which is outside the shared engine.`);
    } else {
      problems.push(`${file} imports the package "${spec}"; add it to the engine's allowed list only after checking it runs on phones.`);
    }
  }
  for (const [re, name] of BANNED_GLOBALS) if (re.test(code)) problems.push(`${file} uses ${name}, which only exists on a computer.`);
  return problems;
}

function filesIn(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...filesIn(rel));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

test('engine and portable platform files use nothing that only a computer has', () => {
  const engine = filesIn('src/engine');
  assert.ok(engine.length > 0, 'src/engine should exist');
  const problems = [
    ...engine.flatMap((f) => boundaryProblems(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), true)),
    ...PORTABLE_PLATFORM.flatMap((f) => boundaryProblems(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), false)),
  ];
  assert.deepEqual(problems, []);
});

test('the boundary check catches the mistakes it is there for', () => {
  const bad = [
    "import fs from 'fs';",
    "import { join } from 'node:path';",
    "import express from 'express';",
    "import { Filesystem } from '@capacitor/filesystem';",
    "import { loadSettings } from '../server/config';",
    "import { createNodePlatform } from '../platform/node';",
    "const k = process.env.GEMINI_API_KEY;",
    "const lib = await import('child_process');",
  ].join('\n');
  const problems = boundaryProblems('src/engine/example.ts', bad, true);
  assert.equal(problems.length, 8, problems.join('\n'));
  // Comments and allowed imports pass.
  const good = "// process.env is not read here\nimport type { Platform } from '../platform/types';\nimport { x } from './store';\n";
  assert.deepEqual(boundaryProblems('src/engine/example.ts', good, true), []);
});

test('only the device files of the platform layer may import Node', () => {
  const platform = filesIn('src/platform').filter((f) => !PORTABLE_PLATFORM.includes(f));
  assert.deepEqual(platform, ['src/platform/node.ts'], 'a new platform file must be listed as portable or as a device file on purpose');
});
