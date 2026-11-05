import test from 'node:test';
import assert from 'node:assert/strict';
import { describeAttempt, describeFailures, localStepTimeoutMs, LONG_CHAT_STEP_MIN_MS } from '../src/utils/modelFailure.ts';

test('summary and debate steps give a local model at least two minutes', () => {
  assert.equal(localStepTimeoutMs('COUNCIL_SYNTHESIS', undefined, false), LONG_CHAT_STEP_MIN_MS);
  assert.equal(localStepTimeoutMs('COUNCIL_DEBATE', 20, false), LONG_CHAT_STEP_MIN_MS);
  assert.equal(localStepTimeoutMs('COUNCIL_SYNTHESIS', 300, false), 300_000);
  // Quick steps keep their old limits.
  assert.equal(localStepTimeoutMs('COUNCIL_CHOOSE_AGENTS', undefined, false), 16_000);
  assert.equal(localStepTimeoutMs('STAGE_3_SUPREME_COUNCIL', undefined, true), 25_000);
  assert.equal(localStepTimeoutMs('STAGE_1_GEO_DESK', 40, false), 40_000);
  assert.equal(localStepTimeoutMs('STAGE_1_GEO_DESK', 2, false), 16_000);
});

test('each failed attempt is said in plain words', () => {
  const where = 'Ollama qwen2.5:7b at http://localhost:11434';
  const abort = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
  assert.equal(describeAttempt({ where, error: abort, timeoutMs: 16000 }), `${where} did not answer within 16 s`);
  const refused = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } });
  assert.equal(describeAttempt({ where, error: refused }), `${where} is not running`);
  assert.match(describeAttempt({ where, error: new Error('Model endpoint x failed with HTTP 404') }), /HTTP 404 \(is that model pulled/);
  assert.equal(describeAttempt({ where, error: new Error('Model endpoint x failed with HTTP 500') }), `${where} answered HTTP 500`);
  assert.equal(describeAttempt({ where, notJson: true }), `${where} answered, but not in the format the app needs`);
  assert.equal(describeAttempt({ where: 'Gemini', error: new Error('API key not valid') }), 'Gemini failed (API key not valid)');
});

test('the Docker fallback addresses are left out when the main one says more', () => {
  const notFound = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
  const reason = describeFailures(
    [
      { where: 'Ollama gemma4:31b at http://localhost:11434', error: abort, timeoutMs: 120000 },
      { where: 'Ollama gemma4:31b at http://host.docker.internal:11434', error: notFound },
      { where: 'Ollama gemma4:31b at http://ollama:11434', error: notFound },
    ],
    false
  );
  assert.equal(reason, 'Ollama gemma4:31b at http://localhost:11434 did not answer within 120 s; no Gemini key is set');
  assert.equal(describeFailures([], false), 'no Gemini key is set');
  assert.equal(describeFailures([], true), 'no model is set up');
});
