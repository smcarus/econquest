import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isExplainQuestion, withExplainAgents } from '../src/utils/explain.ts';
import { planCouncil } from '../src/utils/askCouncil.ts';

const SAM_Q = 'What would happen if the United States defense budget was halved and that money was reallocated back to the economy/restructuring?';

test('what-if questions are explanations, answered by the lens agents', () => {
  assert.equal(isExplainQuestion(SAM_Q), true);
  assert.equal(isExplainQuestion('What if Turkey raised taxes?'), true);
  assert.equal(isExplainQuestion('Suppose Brazil spending were cut by 10%'), true);
  assert.equal(isExplainQuestion('What is coming up in the next month?'), false);
  const items = [{ iso3: 'USA', countryName: 'United States' }] as any;
  const ids = withExplainAgents(planCouncil(SAM_Q, items), SAM_Q).agents.map((a) => a.id);
  assert.ok(ids.includes('fiscal'));
  assert.ok(!ids.includes('calendar'));
});

test('"budget" alone no longer sends a question to the Calendar Agent; budget dates still do', () => {
  assert.ok(!planCouncil('Is the Italian budget too loose?', [] as any).agents.some((a) => a.id === 'calendar' && /budget/i.test(a.why)));
  assert.ok(planCouncil('When is the next budget vote?', [] as any).agents.some((a) => a.id === 'calendar'));
});
