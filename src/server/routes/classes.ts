/**
 * Classes for Quests in the classroom (roadmap Phase 5, Q1; src/utils/classes.ts). Behind their own
 * switch, CLASSES_ENABLED=on, and only with sign-in, since a role in a class belongs to an account.
 *
 *   GET    /api/classes                         the classes I am in, and whether I may make one
 *   POST   /api/classes                         make a class for a term (Analyst or Admin; I become its teacher)
 *   POST   /api/classes/join                    join with a code, as a student (any signed-in account)
 *   GET    /api/classes/:id                     one class, as my role in it lets me see it
 *   POST   /api/classes/:id/members             teacher: add an existing account as marker or student
 *   DELETE /api/classes/:id/members/:accountId  teacher: take someone out (never the last teacher)
 *   POST   /api/classes/:id/students            teacher: make Viewer accounts from nicknames; passwords shown once
 *   POST   /api/classes/:id/code                teacher: a new join code (the old one stops working)
 *   POST   /api/classes/:id/archive             teacher: archive or restore ({ archived: true | false })
 *
 * Account roles (Viewer, Analyst, Admin; src/utils/permissions.ts) still decide what an account may
 * do in the rest of the app. A class role only decides what it may do in that class.
 */
import crypto from 'crypto';
import type express from 'express';
import { DATA_DIR } from '../config';
import type { Account } from '../../utils/auth';
import { CLASSES_NEED_SIGNIN, CLASSES_OFF_REASON, classesEnabled, classesFor, classProblems, classView, joinCodeFrom, nicknameProblems, normaliseJoinCode, roleIn, studentUsername, type ClassRole, type SchoolClass } from '../../utils/classes';
import { changeClasses, classesPath, loadClasses } from '../../utils/classStore';

export interface ClassDeps {
  /** Defaults to process.env.CLASSES_ENABLED. */
  enabled?: () => boolean;
  /** Defaults to data/local/classes.json. */
  file?: string;
  signedIn: (res: express.Response) => Account | null;
  /** True once accounts exist and every call needs one (src/utils/auth.ts authMode 'required'). */
  authRequired: () => boolean;
  accountById: (id: string) => Account | undefined;
  accountByUsername: (username: string) => Account | undefined;
  /** Makes a Viewer account with a random password and returns both. */
  makeStudent: (username: string, displayName: string) => { account: Account; password: string };
  audit?: (summary: string) => void;
  now?: () => Date;
}

export function registerClassRoutes(app: express.Express, deps: ClassDeps): void {
  const enabled = deps.enabled ?? (() => classesEnabled(process.env.CLASSES_ENABLED));
  const file = deps.file ?? classesPath(DATA_DIR);
  const now = () => (deps.now ? deps.now() : new Date()).toISOString();
  const audit = deps.audit ?? (() => {});
  const nameOf = (id: string) => {
    const a = deps.accountById(id);
    return a ? { username: a.username, displayName: a.displayName } : undefined;
  };
  const who = (a: Account) => `${a.displayName} (${a.username})`;

  /** The signed-in account, or the reply already sent. */
  const me = (res: express.Response): Account | null => {
    if (!enabled()) {
      res.status(404).json({ enabled: false, error: CLASSES_OFF_REASON });
      return null;
    }
    const a = deps.authRequired() ? deps.signedIn(res) : null;
    if (!a) {
      res.status(400).json({ enabled: true, error: CLASSES_NEED_SIGNIN });
      return null;
    }
    return a;
  };
  const freshCode = (classes: SchoolClass[]) => {
    for (;;) {
      const code = joinCodeFrom(crypto.randomBytes(8));
      if (!classes.some((c) => c.code === code)) return code;
    }
  };
  /** The class, if I am its teacher; otherwise the reply already sent. */
  const asTeacher = (classes: SchoolClass[], id: string, a: Account, res: express.Response): SchoolClass | null => {
    const cls = classes.find((c) => c.id === id);
    if (!cls || !roleIn(cls, a.id)) {
      res.status(404).json({ enabled: true, error: 'No class with that id that you are in' });
      return null;
    }
    if (roleIn(cls, a.id) !== 'teacher') {
      res.status(403).json({ enabled: true, error: 'Only a teacher of this class can do this' });
      return null;
    }
    return cls;
  };
  const viewReply = (cls: SchoolClass, a: Account) => ({ enabled: true, class: classView(cls, a.id, nameOf) });

  app.get('/api/classes', (_req, res) => {
    if (!enabled()) return res.json({ enabled: false, reason: CLASSES_OFF_REASON });
    const a = deps.authRequired() ? deps.signedIn(res) : null;
    if (!a) return res.json({ enabled: true, needSignIn: true, reason: CLASSES_NEED_SIGNIN, classes: [], canCreate: false });
    res.json({ enabled: true, classes: classesFor(loadClasses(file), a.id, nameOf), canCreate: a.role !== 'viewer' });
  });

  app.post('/api/classes', (req, res) => {
    const a = me(res);
    if (!a) return;
    if (a.role === 'viewer') return res.status(403).json({ enabled: true, error: 'A Viewer account cannot make a class. Ask your administrator for an Analyst account' });
    const body = (req.body || {}) as { name?: unknown; term?: Record<string, unknown> };
    const problems = classProblems(body);
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    const cls = changeClasses(file, (classes) => {
      const c: SchoolClass = {
        id: crypto.randomUUID(),
        name: String(body.name).trim(),
        term: { label: String(body.term!.label).trim(), starts: String(body.term!.starts), ends: String(body.term!.ends) },
        code: freshCode(classes),
        createdAt: now(),
        createdBy: a.id,
        members: [{ accountId: a.id, role: 'teacher', joinedAt: now() }],
      };
      classes.push(c);
      return c;
    });
    audit(`${who(a)} made the class "${cls.name}" (${cls.term.label})`);
    res.json(viewReply(cls, a));
  });

  app.post('/api/classes/join', (req, res) => {
    const a = me(res);
    if (!a) return;
    const code = normaliseJoinCode(req.body?.code);
    if (!code) return res.status(400).json({ enabled: true, error: 'A join code is eight letters and digits, like ABCD-EFGH' });
    const out = changeClasses(file, (classes) => {
      const cls = classes.find((c) => c.code === code);
      if (!cls) return { status: 404, error: 'No class has that join code. Check it with your teacher' };
      if (cls.archivedAt) return { status: 400, error: 'That class is archived and takes no new members' };
      if (roleIn(cls, a.id)) return { status: 409, error: 'You are already in this class', cls };
      cls.members.push({ accountId: a.id, role: 'student', joinedAt: now() });
      return { status: 200, cls };
    });
    if (out.status !== 200) return res.status(out.status).json({ enabled: true, error: out.error });
    audit(`${who(a)} joined the class "${out.cls!.name}" as a student`);
    res.json(viewReply(out.cls!, a));
  });

  app.get('/api/classes/:id', (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = loadClasses(file).find((c) => c.id === req.params.id);
    if (!cls || !roleIn(cls, a.id)) return res.status(404).json({ enabled: true, error: 'No class with that id that you are in' });
    res.json(viewReply(cls, a));
  });

  app.post('/api/classes/:id/members', (req, res) => {
    const a = me(res);
    if (!a) return;
    const role = req.body?.role as ClassRole;
    if (role !== 'marker' && role !== 'student') return res.status(400).json({ enabled: true, error: 'Add someone as a marker or a student' });
    const target = deps.accountByUsername(String(req.body?.username || '').trim().toLowerCase());
    if (!target || target.disabled) return res.status(404).json({ enabled: true, error: 'No active account with that username on this server' });
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      const existing = c.members.find((m) => m.accountId === target.id);
      if (existing?.role === 'teacher') {
        res.status(409).json({ enabled: true, error: 'That account teaches this class' });
        return (sent = true), null;
      }
      if (existing) existing.role = role;
      else c.members.push({ accountId: target.id, role, joinedAt: now() });
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} added ${who(target)} to the class "${cls.name}" as ${role}`);
    res.json(viewReply(cls, a));
  });

  app.delete('/api/classes/:id/members/:accountId', (req, res) => {
    const a = me(res);
    if (!a) return;
    let sent = false;
    const out = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      const i = c.members.findIndex((m) => m.accountId === req.params.accountId);
      if (i < 0) {
        res.status(404).json({ enabled: true, error: 'That account is not in this class' });
        return (sent = true), null;
      }
      if (c.members[i]!.role === 'teacher' && c.members.filter((m) => m.role === 'teacher').length <= 1) {
        res.status(409).json({ enabled: true, error: 'A class keeps at least one teacher' });
        return (sent = true), null;
      }
      const [gone] = c.members.splice(i, 1);
      return { c, gone: gone! };
    });
    if (sent || !out) return;
    audit(`${who(a)} took ${nameOf(out.gone.accountId)?.username ?? out.gone.accountId} out of the class "${out.c.name}"`);
    res.json(viewReply(out.c, a));
  });

  app.post('/api/classes/:id/students', (req, res) => {
    const a = me(res);
    if (!a) return;
    const nicknames = Array.isArray(req.body?.nicknames) ? (req.body.nicknames as unknown[]).map((n) => (typeof n === 'string' ? n.trim() : n)).filter((n) => n !== '') : req.body?.nicknames;
    const problems = nicknameProblems(nicknames);
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    const cls0 = loadClasses(file).find((c) => c.id === req.params.id);
    if (!cls0 || roleIn(cls0, a.id) !== 'teacher') {
      asTeacher(loadClasses(file), String(req.params.id), a, res);
      return;
    }
    if (cls0.archivedAt) return res.status(400).json({ enabled: true, error: 'That class is archived and takes no new members' });
    const created = (nicknames as string[]).map((nickname) => {
      const username = studentUsername(nickname, (u) => Boolean(deps.accountByUsername(u)));
      const { account, password } = deps.makeStudent(username, nickname);
      return { nickname, username, password, accountId: account.id };
    });
    const cls = changeClasses(file, (classes) => {
      const c = classes.find((x) => x.id === cls0.id)!;
      for (const s of created) if (!roleIn(c, s.accountId)) c.members.push({ accountId: s.accountId, role: 'student', joinedAt: now() });
      return c;
    });
    audit(`${who(a)} made ${created.length} student account(s) for the class "${cls.name}": ${created.map((s) => s.username).join(', ')}`);
    res.json({ ...viewReply(cls, a), created: created.map(({ nickname, username, password }) => ({ nickname, username, password })), note: 'Each password is shown this once. Hand them out; each student changes theirs in Menu > Account.' });
  });

  app.post('/api/classes/:id/code', (req, res) => {
    const a = me(res);
    if (!a) return;
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      c.code = freshCode(classes);
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} made a new join code for the class "${cls.name}"`);
    res.json(viewReply(cls, a));
  });

  app.post('/api/classes/:id/archive', (req, res) => {
    const a = me(res);
    if (!a) return;
    const archived = req.body?.archived !== false;
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (archived) c.archivedAt = c.archivedAt ?? now();
      else delete c.archivedAt;
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} ${archived ? 'archived' : 'restored'} the class "${cls.name}"`);
    res.json(viewReply(cls, a));
  });
}
