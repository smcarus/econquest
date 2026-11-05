/**
 * Server side of backup and restore (see backup.ts): read the three files into one backup, and
 * restore a backup over them after saving a copy of what was there in data/local/backups/.
 */
import path from 'path';
import { writeFileAtomic } from './atomicWrite';
import { buildBackup, keepSecrets, type BackupFile } from './backup';
import { loadLibrary, saveLibrary } from './researchStore';
import { loadWatchRules, saveWatchRules } from './watchRulesStore';
import { loadWorkspace, saveWorkspaceValues } from './workspaceStore';

export interface BackupFiles {
  research: string;
  watchRules: string;
  workspace: string;
}

export function currentBackup(files: BackupFiles, now = new Date()): BackupFile {
  return buildBackup(
    {
      research: loadLibrary(files.research),
      watchRules: loadWatchRules(files.watchRules),
      workspace: loadWorkspace(files.workspace).values,
    },
    now
  );
}

/** Folder for the copies saved before each restore: beside the workspace file. */
export function backupsDir(files: BackupFiles): string {
  return path.join(path.dirname(files.workspace), 'backups');
}

/**
 * Replace saved research, watch alerts and workspace with the backup's. A copy of the current
 * state is written first; its path (relative to the data folder's parent) is returned.
 * Secret fields in the AI settings are kept from this computer.
 */
export function restoreBackup(files: BackupFiles, backup: BackupFile, now = new Date()): { savedCopy: string } {
  const before = currentBackup(files, now);
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const copy = path.join(backupsDir(files), `before-restore-${stamp}.json`);
  writeFileAtomic(copy, JSON.stringify(before), 0o600);

  const current = loadWorkspace(files.workspace).values;
  const workspace: Record<string, string> = {};
  for (const [key, value] of Object.entries(backup.contents.workspace)) {
    let merged = value;
    if (current[key]) {
      try {
        merged = JSON.stringify(keepSecrets(JSON.parse(value), JSON.parse(current[key])));
      } catch {
        // current value unreadable: restore the backup's as it is
      }
    }
    workspace[key] = merged;
  }

  saveLibrary(files.research, backup.contents.research);
  saveWatchRules(files.watchRules, backup.contents.watchRules);
  saveWorkspaceValues(files.workspace, workspace, now);
  return { savedCopy: path.join('data', 'local', 'backups', path.basename(copy)) };
}
