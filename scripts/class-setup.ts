/**
 * Class setup in one command (npm run class:setup; roadmap Phase 5, Q2). For a professor running
 * EconQuest for a class on their own computer or a school server. It:
 *   1. turns classes on in .env (CLASSES_ENABLED=on) and opens the app to the school network
 *      (HOST=0.0.0.0), unless --local;
 *   2. makes the first administrator account when there is none and --admin is given (the password
 *      is printed once); sign-in is then required for everyone;
 *   3. pins the release for the term (data/local/class-release.json; src/utils/classRelease.ts), so
 *      `npm run go` and `npm run update` keep this version until the last day of the term;
 *   4. prints the address students open and what to tell school IT staff (docs/SCHOOL_IT.md).
 *
 *   npm run class:setup -- --until 2027-05-07 --admin prof     first time, for a term ending 7 May
 *   npm run class:setup -- --until 2027-05-07 --local          classes on, this computer only
 *   npm run class:setup -- --until 2027-05-07 --no-pin         no pinned release
 *   npm run class:setup -- --status                            what is set now
 *   npm run class:setup -- --unpin                             end the term pin early
 *
 * Run it again at any time: it only changes what it names. Then start the app as usual
 * (npm run go on a Mac, npm run dev on any computer) and keep it running during class.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { APP_ROOT, DATA_DIR } from '../src/server/config';
import { AuthStore } from '../src/utils/authStore';
import { newAccount, normaliseUsername, sessionLimits, usernameProblem } from '../src/utils/auth';
import { CLASS_RELEASE_FILE, classEnvChanges, pinHolds, pinSentence, setEnvValues, studentAddress, type ClassReleasePin } from '../src/utils/classRelease';
import { randomBytes } from 'crypto';

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const value = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};
const today = new Date().toISOString().slice(0, 10);
const pinFile = path.join(DATA_DIR, 'local', CLASS_RELEASE_FILE);
const envFile = path.join(APP_ROOT, '.env');
const readPin = (): ClassReleasePin | null => {
  try {
    return JSON.parse(fs.readFileSync(pinFile, 'utf8')) as ClassReleasePin;
  } catch {
    return null;
  }
};
const version = (JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8')) as { version: string }).version;
const commit = (() => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: APP_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
})();
const port = Number(process.env.PORT) || 3000;

if (flag('--status')) {
  const pin = readPin();
  const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  const live = (k: string) => env.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]*)"?`, 'm'))?.[1] ?? '(not set)';
  console.log(`Version     : ${version} (${commit.slice(0, 7)})`);
  console.log(`Classes     : CLASSES_ENABLED=${live('CLASSES_ENABLED')}`);
  console.log(`Network     : HOST=${live('HOST')}`);
  console.log(`Accounts    : ${new AuthStore(DATA_DIR, sessionLimits(process.env)).count()}`);
  console.log(`Term pin    : ${pin ? pinSentence(pin, today) : 'none'}`);
  process.exit(0);
}

if (flag('--unpin')) {
  const pin = readPin();
  if (!pin) {
    console.log('No term pin is set.');
  } else {
    fs.rmSync(pinFile);
    console.log(`Term pin removed (it held version ${pin.version} until ${pin.until}). The next npm run go or npm run update brings the newest code.`);
  }
  process.exit(0);
}

const until = value('--until');
const noPin = flag('--no-pin');
if (!noPin && (!until || !/^\d{4}-\d{2}-\d{2}$/.test(until) || Number.isNaN(Date.parse(`${until}T00:00:00Z`)))) fail('Give the last day of the term: --until YYYY-MM-DD (or --no-pin to keep updates on).');
if (until && until < today) fail(`--until ${until} is already past; give the last day of this term.`);

console.log(`EconQuest class setup, version ${version} (${commit.slice(0, 7)})\n`);
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) console.log(`Note: this computer has Node ${process.versions.node}; use Node 22 or newer.\n`);

// 1. .env
const local = flag('--local');
const before = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const changes = classEnvChanges(local);
fs.writeFileSync(envFile, setEnvValues(before, changes), { mode: 0o600 });
console.log(`1. .env: ${Object.entries(changes).map(([k, v]) => `${k}=${v}`).join(', ')}${local ? ' (this computer only)' : ' (open to the school network)'}`);

// 2. Accounts
const auth = new AuthStore(DATA_DIR, sessionLimits(process.env));
const adminName = value('--admin');
if (auth.count() > 0) {
  console.log(`2. Accounts: ${auth.count()} already, so sign-in is on. Teachers need an Analyst or Admin account (Menu > Users).`);
} else if (adminName) {
  const username = normaliseUsername(adminName);
  const problem = usernameProblem(username);
  if (problem) fail(`--admin ${adminName}: ${problem}`);
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const password = Array.from(randomBytes(20), (b) => alphabet[b % alphabet.length]).join('');
  auth.add(newAccount({ username, displayName: adminName, role: 'admin', password }));
  console.log(`2. Accounts: made the administrator "${username}". Password (shown this once; change it in Menu > Account): ${password}`);
} else {
  console.log(`2. Accounts: none yet. Run again with --admin <username> to make the first administrator, or${local ? ' make it in Menu > Account.' : ' open the app and use the one-time setup code the server prints when it starts.'}`);
}

// 3. Term pin
if (noPin) {
  console.log('3. Term pin: none (--no-pin); npm run go and npm run update bring new versions as usual.');
} else {
  const pin: ClassReleasePin = { version, commit, pinnedOn: today, until: until! };
  fs.mkdirSync(path.dirname(pinFile), { recursive: true });
  fs.writeFileSync(pinFile, `${JSON.stringify(pin, null, 2)}\n`);
  console.log(`3. ${pinSentence(pin, today)}`);
  if (!pinHolds(pin, today)) fail('The pin would not hold; check --until.');
}

// 4. What to tell students and IT
const address = local ? `http://localhost:${port}` : studentAddress(Object.values(os.networkInterfaces()).flat().filter((a): a is os.NetworkInterfaceInfo => Boolean(a)), port);
console.log(`4. Start the app (npm run go on a Mac, npm run dev on any computer) and keep it running during class.`);
console.log(`   Students open: ${address ?? `this computer's network address, port ${port} (no network address found now)`}`);
console.log('   Then: Menu > Quests > Classes > Make a class, and give students the join code.');
if (!local) console.log('   For school IT staff: docs/SCHOOL_IT.md (one page: port, network, what is stored, updates).');
