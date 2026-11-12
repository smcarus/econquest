import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRefereeStep, isSmallModel, largestModel, modelSizeB, smallRefereeNote } from '../src/utils/refereeModel.ts';

test('referee steps: Supreme Council, chat summary and explanations, debate; not agent picking or desks', () => {
  for (const s of ['STAGE_3_SUPREME_COUNCIL', 'COUNCIL_SYNTHESIS', 'COUNCIL_DEBATE', 'REVIEW_OPTIONS']) assert.ok(isRefereeStep(s), s);
  for (const s of ['COUNCIL_CHOOSE_AGENTS', 'STAGE_1_GEO_DESK', 'STAGE_2_CONTAGION_CASCADE', 'AI_MODEL_TEST']) assert.equal(isRefereeStep(s), false, s);
});

test('model size from the Ollama tag; 8B or less is small', () => {
  assert.equal(modelSizeB('gemma4:31b'), 31);
  assert.equal(modelSizeB('qwen2.5:7b'), 7);
  assert.equal(modelSizeB('deepseek-r1:8b'), 8);
  assert.equal(modelSizeB('qwen3:30b-a3b'), 30);
  assert.equal(modelSizeB('llama3.1'), null);
  assert.ok(isSmallModel('deepseek-r1:8b') && isSmallModel('qwen2.5:7b'));
  assert.equal(isSmallModel('gemma4:31b'), false);
  assert.equal(isSmallModel('mystery'), false); // unknown size is not flagged
  assert.equal(largestModel(['qwen2.5:7b', 'deepseek-r1:8b', 'gemma4:31b', 'qwen2.5:14b']), 'gemma4:31b');
  assert.equal(largestModel(['qwen2.5:7b']), undefined);
});

test('the note under an answer names a small referee and where to change it', () => {
  assert.match(smallRefereeNote('Local Ollama (qwen2.5:7b · Referee)')!, /qwen2.5:7b, a small model.*Menu > Settings > AI model/);
  assert.equal(smallRefereeNote('Local Ollama (gemma4:31b · Referee)'), null);
  assert.equal(smallRefereeNote('Gemini'), null);
});

test('default referee is qwen2.5:32b; the old 8B default moves to it, a chosen model stays', async () => {
  const { DEFAULT_REFEREE_MODEL, refereeModelOrDefault } = await import('../src/utils/refereeModel.ts');
  assert.equal(DEFAULT_REFEREE_MODEL, 'qwen2.5:32b');
  assert.equal(refereeModelOrDefault('deepseek-r1:8b'), 'qwen2.5:32b');
  assert.equal(refereeModelOrDefault('gemma4:31b'), 'gemma4:31b');
  assert.equal(refereeModelOrDefault(''), undefined);
});

test('L1: referee tiers; a mid-size referee runs only when "Allow a 14B referee" is on', async () => {
  const { refereeTier, isMidModel, allowedRefereeModel, FULL_REFEREE_MIN_B } = await import('../src/utils/refereeModel.ts');
  assert.equal(FULL_REFEREE_MIN_B, 30);
  assert.equal(refereeTier('qwen2.5:7b'), 'small');
  assert.equal(refereeTier('deepseek-r1:8b'), 'small');
  assert.equal(refereeTier('qwen2.5:14b'), 'mid');
  assert.equal(refereeTier('gemma3:27b'), 'mid');
  assert.equal(refereeTier('qwen3:30b-a3b'), 'full');
  assert.equal(refereeTier('gemma4:31b'), 'full');
  assert.equal(refereeTier('qwen2.5:32b'), 'full');
  assert.equal(refereeTier('mystery'), 'full'); // unknown size is not flagged
  assert.ok(isMidModel('qwen2.5:14b') && !isMidModel('qwen2.5:32b'));
  // Off (the default): the 32B default stands in for a mid-size setting.
  assert.equal(allowedRefereeModel('qwen2.5:14b', false), 'qwen2.5:32b');
  assert.equal(allowedRefereeModel('qwen2.5:14b', undefined), 'qwen2.5:32b');
  // On: the 14B model runs.
  assert.equal(allowedRefereeModel('qwen2.5:14b', true), 'qwen2.5:14b');
  // Full and small settings are never swapped here (small ones stay flagged, as before).
  assert.equal(allowedRefereeModel('gemma4:31b', false), 'gemma4:31b');
  assert.equal(allowedRefereeModel('qwen2.5:7b', false), 'qwen2.5:7b');
});

test('L1: every answer judged by a mid-size referee says "Small referee"', () => {
  assert.match(smallRefereeNote('Local Ollama (qwen2.5:14b · Referee)')!, /^Small referee: qwen2\.5:14b judged this answer\..*Menu > Settings > AI model/);
  assert.equal(smallRefereeNote('Local Ollama (qwen2.5:32b · Referee)'), null);
});
