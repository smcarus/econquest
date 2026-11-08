import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_BADGES, agentBadge, agentBadgeTip } from '../src/utils/agentBadges.ts';
import { AGENT_ORDER } from '../src/utils/askCouncil.ts';

test('every council chat agent has its own badge icon', () => {
  const ids = [...AGENT_ORDER, 'doc', 'chart', 'forecast', 'claim'];
  const icons = ids.map((id) => {
    assert.ok(AGENT_BADGES[id], `badge for ${id}`);
    return agentBadge(id).icon;
  });
  assert.equal(new Set(icons).size, icons.length, 'icons are distinct');
});

test('every badge icon is distinct across all agents and steps', () => {
  const icons = Object.values(AGENT_BADGES).map((b) => b.icon);
  assert.equal(new Set(icons).size, icons.length);
});

test('unknown ids get a generic badge', () => {
  assert.equal(agentBadge('nope').icon, 'agent');
});

test('hover text follows the help setting', () => {
  assert.equal(agentBadgeTip('fiscal', 'Fiscal & Debt Agent', 0), 'Fiscal & Debt Agent');
  const key = agentBadgeTip('fiscal', 'Fiscal & Debt Agent', 1);
  assert.match(key, /^Fiscal & Debt Agent: .*owes/);
  assert.doesNotMatch(key, /Reads:/);
  assert.match(agentBadgeTip('fiscal', 'Fiscal & Debt Agent', 2), /Reads: .*IMF/);
  assert.doesNotMatch(agentBadgeTip('synthesis', 'Synthesis agent', 2), /Reads:/);
});

test('plain text stays short enough for a hover tip', () => {
  for (const [id, b] of Object.entries(AGENT_BADGES)) assert.ok(b.plain.length <= 220, `${id} plain text too long`);
});
