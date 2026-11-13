/**
 * Service tokens from the server's own command line, for a deployment set up by script (console
 * integration item 11). The same tokens as Menu > Settings > API tokens; a running app sees a change
 * at once. Every change is written to the audit log.
 *
 *   npm run tokens -- list
 *   npm run tokens -- create "<name>" <scope>[,<scope>...] [--account <username>]
 *        prints the secret once; --account puts positions it sends in that account's workspace
 *   npm run tokens -- revoke <id>
 *
 * Scopes: read:data, read:council, read:events, write:holdings, write:exclusions, run:scenarios.
 * Under Docker: docker compose exec econquest npm run tokens -- list
 * Uses DATA_DIR like the server (default ./data).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { ApiTokenStore, apiTokensFile } from '../src/utils/apiTokenStore';
import { SCOPES } from '../src/utils/apiTokens';
import { appendAudit, auditFiles, setAuditSealKey } from '../src/utils/auditStore';
import { AuthStore } from '../src/utils/authStore';
import { normaliseUsername, sessionLimits } from '../src/utils/auth';
import { sealKeyFrom } from '../src/utils/auditSeal';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const store = new ApiTokenStore(apiTokensFile(dataDir));
const audit = auditFiles(dataDir);
setAuditSealKey(sealKeyFrom(process.env.AUDIT_SEAL_KEY));
const [cmd, ...args] = process.argv.slice(2);

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

switch (cmd) {
  case 'list': {
    const list = store.list();
    if (!list.length) console.log('No API tokens.');
    for (const t of list) {
      console.log(`${t.id}  ${t.revokedAt ? 'revoked' : 'active '}  ${t.name.padEnd(30)} ${t.scopes.join(',').padEnd(40)} made ${t.createdAt.slice(0, 10)} by ${t.createdBy}${t.lastUsedAt ? `, last used ${t.lastUsedAt.slice(0, 16).replace('T', ' ')} UTC` : ', never used'}`);
    }
    break;
  }
  case 'create': {
    const accIdx = args.indexOf('--account');
    const account = accIdx >= 0 ? args[accIdx + 1] : undefined;
    const rest = accIdx >= 0 ? args.filter((_, i) => i !== accIdx && i !== accIdx + 1) : args;
    const [name, scopeList] = rest;
    if (!name || !scopeList) fail(`Usage: npm run tokens -- create "<name>" <scope>[,<scope>...] [--account <username>]. Scopes: ${SCOPES.join(', ')}.`);
    let createdById: string | undefined;
    if (account) {
      const a = new AuthStore(dataDir, sessionLimits(process.env)).byUsername(normaliseUsername(account));
      if (!a) fail(`No account "${account}". See: npm run users -- list`);
      createdById = a.id;
    }
    const made = store.create({ name, scopes: scopeList.split(',').map((s) => s.trim()).filter(Boolean), createdBy: 'the command line', createdById });
    if ('error' in made) fail(made.error);
    appendAudit(audit, { kind: 'api', summary: `Made the API token "${made.token.name}" (${made.token.scopes.join(', ')}) from the command line`, detail: { token: made.token.id, scopes: made.token.scopes } });
    console.log(`Token "${made.token.name}" (${made.token.id}) made with ${made.token.scopes.join(', ')}.`);
    console.log(`Secret (shown once; send it as "Authorization: Bearer <secret>"): ${made.secret}`);
    break;
  }
  case 'revoke': {
    const id = args[0];
    if (!id) fail('Give the token id (npm run tokens -- list).');
    const t = store.revoke(id, 'the command line');
    if (!t) fail(`No token with id ${id}.`);
    appendAudit(audit, { kind: 'api', summary: `Revoked the API token "${t.name}" from the command line`, detail: { token: t.id } });
    console.log(`Token "${t.name}" revoked; it stops working at once.`);
    break;
  }
  default:
    console.log('Usage: npm run tokens -- list | create "<name>" <scope>[,<scope>...] [--account <username>] | revoke <id>');
    process.exit(cmd ? 1 : 0);
}
