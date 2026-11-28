import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questsAbout, type QuestLinkSummary } from '../src/utils/questHandoff';

const q = (id: string, countries: string[], status: string, approved = true): QuestLinkSummary => ({ id, version: 1, title: id, countries, status, approved });

test('links pick the Quests about the country: open first, then upcoming, approved before drafts, at most three', () => {
  const list = [q('a-closed', ['BRA'], 'closed'), q('b-draft', ['BRA'], 'draft', false), q('c-open', ['BRA', 'MEX'], 'open'), q('d-upcoming', ['bra'], 'upcoming'), q('e-other', ['TUR'], 'open')];
  assert.deepEqual(questsAbout(list, ['BRA']).map((x) => x.id), ['c-open', 'd-upcoming', 'a-closed']);
  assert.deepEqual(questsAbout(list, ['MEX', 'TUR']).map((x) => x.id), ['c-open', 'e-other']);
  assert.deepEqual(questsAbout(list, ['ZAF']), []);
});

test('the country page and Council chat load the links lazily, and App opens the Quests screen on the named Quest', () => {
  const page = readFileSync('src/components/CountryPage.tsx', 'utf8');
  const chat = readFileSync('src/components/CouncilChatView.tsx', 'utf8');
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(page, /lazyNamed\(\(\) => import\('\.\/QuestLinks'\)/);
  assert.match(chat, /lazyNamed\(\(\) => import\('\.\/QuestLinks'\)/);
  assert.match(page, /<QuestLinks iso3s=\{\[run\.iso3\]\} where="country"/);
  assert.match(chat, /<QuestLinks iso3s=\{t\.asked\.plan\.countries\.map/);
  assert.match(app, /OPEN_QUESTS_EVENT/);
  assert.match(app, /focusId=\{questFocus\}/);
  // Nothing opens while Quests are off: the dialog renders only with questsOn.
  assert.match(app, /isQuestsOpen && questsOn && <QuestsDialog/);
});
