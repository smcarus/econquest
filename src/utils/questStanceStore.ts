/**
 * Named stance profiles on disk: quests/profiles/<login>.json, each added by that person's own pull
 * request (src/utils/questStances.ts). Server and scripts only.
 */
import fs from 'fs';
import path from 'path';
import { profileProblems, PROFILES_DIR, type StanceProfile } from './questStances';
/** Named profiles that pass the check (questsDir is the quests/ folder). */
export function loadProfiles(questsDir: string): StanceProfile[] {
  const dir = path.join(questsDir, 'profiles');
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return names.flatMap((n) => {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8'));
      return profileProblems(raw, `${PROFILES_DIR}/${n}`).length ? [] : [raw as StanceProfile];
    } catch {
      return [];
    }
  });
}
