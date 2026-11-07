/**
 * Files for contributor statistics (src/utils/questStats.ts): quests/stats.json (written by
 * npm run quests:stats) and quests/accounts.json (GitHub account creation times). Server and scripts only.
 */
import fs from 'fs';
import path from 'path';

export const statsPath = (questsDir: string) => path.join(questsDir, 'stats.json');
export const accountsPath = (questsDir: string) => path.join(questsDir, 'accounts.json');

export function readAccounts(questsDir: string): Record<string, string> {
  try {
    const j = JSON.parse(fs.readFileSync(accountsPath(questsDir), 'utf8'));
    return j && typeof j.accounts === 'object' ? (j.accounts as Record<string, string>) : {};
  } catch {
    return {};
  }
}
