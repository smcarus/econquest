/**
 * Writes the opening brief for an approved Debate Quest (npm run quests:brief), once, on the app's
 * referee model (src/utils/questDebate.ts). Run on the Mac with Ollama open, before entries open.
 *
 *   npm run quests:brief -- --by <login> <id>                (Ollama at http://localhost:11434)
 *   npm run quests:brief -- --by <login> <id> --model qwen2.5:32b
 *   npm run quests:brief -- --by <login> <id> --dry-run      (print it, write nothing)
 *
 * The model runs at temperature 0 and seed 42. A reply that states a figure of its own, misses a
 * position or is not JSON is refused and nothing is written. The brief is saved to
 * quests/briefs/<id>.<version>.json with its model, settings and hash; commit it in a pull request.
 * A brief is never replaced. A model of 8B or less is refused.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callOllamaOrOpenAICompatible } from '../src/server/ai.ts';
import { loadQuests } from '../src/utils/questStore.ts';
import { readBrief, writeBrief } from '../src/utils/questBriefStore.ts';
import { BRIEF_LABEL, BRIEF_SEED, BRIEF_SYSTEM, BRIEF_TEMPERATURE, briefPrompt, parseBrief, type BriefPosition } from '../src/utils/questDebate.ts';
import { DEFAULT_REFEREE_MODEL, isSmallModel, refereeModelOrDefault } from '../src/utils/refereeModel.ts';
import { loadWorkspace, workspaceFilePath } from '../src/utils/workspaceStore.ts';
import type { DebateQuest } from '../src/utils/quests.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'quests');
const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const by = opt('--by');
const valued = new Set(['--by', '--model']);
const id = argv.find((a, i) => !a.startsWith('--') && !valued.has(argv[i - 1]));
if (!by || !id) fail('npm run quests:brief -- --by <your GitHub login> <debate quest id> [--model qwen2.5:32b] [--dry-run]');

function savedReferee(): string | undefined {
  try {
    const raw = loadWorkspace(workspaceFilePath(process.env.DATA_DIR || path.join(root, 'data'))).values['econquest_ai_runtime_config_v1'];
    return raw ? refereeModelOrDefault(JSON.parse(raw)?.ollamaDeepModel) : undefined;
  } catch {
    return undefined;
  }
}
const model = opt('--model') || savedReferee() || DEFAULT_REFEREE_MODEL;
if (isSmallModel(model)) fail(`${model} is a small model (8B or less). Briefs are written on the referee model; run with --model qwen2.5:32b.`);

const found = loadQuests(dir).find((x) => x.quest.id === id && x.approved);
if (!found) fail(`No approved Quest with id ${id} in quests/ (approve it first with npm run quests:approve).`);
if (found!.quest.type !== 'debate') fail(`${id} is a ${found!.quest.type} Quest; only Debate Quests have an opening brief.`);
const q = found!.quest as DebateQuest;
const today = new Date().toISOString().slice(0, 10);
if (today > q.closesOn) fail(`Entries closed on ${q.closesOn}; a brief is written before entries open.`);
if (readBrief(dir, q.id, q.version)) fail(`quests/briefs/${q.id}.${q.version}.json already exists; a brief is recorded once and never replaced.`);
if (today >= q.opensOn) console.log(`Note: entries opened on ${q.opensOn}; the brief will say when it was written.`);

const ollama = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
console.log(`Writing the opening brief for ${q.id} on ${model} (Ollama at ${ollama}, temperature ${BRIEF_TEMPERATURE}, seed ${BRIEF_SEED})…`);
let raw = '';
try {
  raw = await callOllamaOrOpenAICompatible(ollama, model, BRIEF_SYSTEM, briefPrompt(q), true, 15 * 60_000, ['positions'], { temperature: BRIEF_TEMPERATURE, seed: BRIEF_SEED, numCtx: 8192 });
} catch (e) {
  fail(`The model did not answer: ${(e as Error).message}. Is Ollama open with ${model} pulled?`);
}
const parsed = parseBrief(raw, q);
if ('problems' in parsed) fail(`Refused, nothing written:\n${parsed.problems.map((p) => `  - ${p}`).join('\n')}\n\nThe model's reply:\n${raw}`);
const positions = (parsed as { positions: BriefPosition[] }).positions;
for (const p of positions) console.log(`\n${p.position}. ${q.positions[p.position - 1]}\n   Strongest: ${p.strongest}\n   Weakest:   ${p.weakest}\n   Check:     ${p.check}`);
if (argv.includes('--dry-run')) {
  console.log('\nDry run: nothing written.');
  process.exit(0);
}
const brief = writeBrief(dir, { questId: q.id, questVersion: q.version, questHash: found!.hash, model, temperature: BRIEF_TEMPERATURE, seed: BRIEF_SEED, writtenAt: new Date().toISOString(), by: by!, label: BRIEF_LABEL, positions });
console.log(`\nSaved quests/briefs/${q.id}.${q.version}.json (hash ${brief.hash.slice(0, 12)}…). Read it, then commit it in a pull request.`);
