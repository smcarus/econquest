/**
 * A stand-in Ollama at http://standin-ollama.test:11434, loaded into the server under test after
 * tests/helpers/replay-fetch.mjs (NODE_OPTIONS="--import replay --import this"), so feeds answer
 * from the recorded replies and the model from here. Its replies are fixed by what it is asked:
 *   - the agent choice: the central bank agent when the question names policy rates or inflation,
 *     the fiscal agent when it names debt;
 *   - the summary: one sentence per percentage in the agents' documents (the first two), which
 *     traces to their figures, and one sentence naming Brazil (the hidden-names test removes it).
 * Every call is written to STANDIN_LOG (one JSON line: step, prompt, reply), so a test can check
 * that two paths asked the model the same thing.
 */
import { appendFileSync } from 'node:fs';

const BASE = 'http://standin-ollama.test:11434';
const log = process.env.STANDIN_LOG || '';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function reply(system, prompt) {
  if (system.startsWith('You route a policy research question')) {
    const q = (prompt.match(/Question: (.*)/) || [])[1] || prompt;
    return {
      agents: [
        ...(/central bank|policy rate|inflation/i.test(q) ? [{ id: 'cb', why: 'The question asks about policy rates and inflation.' }] : []),
        ...(/debt/i.test(q) ? [{ id: 'fiscal', why: 'The question asks about government debt.' }] : []),
      ],
    };
  }
  const pcts = [...new Set(prompt.match(/-?\d+(?:\.\d+)?%/g) || [])].slice(0, 2);
  return {
    headline: 'The agents\' figures answer the question.',
    points: [...pcts.map((p) => `One figure the agents gave is ${p}.`), 'Brazil is often compared with these countries.'],
    disagreements: [],
    gaps: ['No market prices were asked for.'],
  };
}

const prev = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === `${BASE}/api/tags`) return json({ models: [{ name: 'qwen2.5:7b' }, { name: 'qwen2.5:32b' }] });
  if (url.startsWith(`${BASE}/api/chat`)) {
    const body = JSON.parse(String(init.body || '{}'));
    const system = String(body.messages?.[0]?.content || '');
    const prompt = String(body.messages?.slice(1).map((m) => m.content).join('\n') || '');
    const content = JSON.stringify(reply(system, prompt));
    if (log) appendFileSync(log, JSON.stringify({ step: system.split('\n')[0].slice(0, 80), model: body.model, prompt, reply: content }) + '\n');
    if (body.stream) {
      const lines = content.match(/.{1,40}/g).map((c) => JSON.stringify({ message: { role: 'assistant', content: c }, done: false }) + '\n');
      lines.push(JSON.stringify({ message: { role: 'assistant', content: '' }, done: true }) + '\n');
      return new Response(new ReadableStream({ start(ctl) { for (const l of lines) ctl.enqueue(new TextEncoder().encode(l)); ctl.close(); } }), { status: 200 });
    }
    return json({ message: { role: 'assistant', content } });
  }
  return prev(input, init);
};
