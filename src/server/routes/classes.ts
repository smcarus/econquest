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
 * Assignments (Q3; src/utils/classAssignments.ts):
 *   GET    /api/classes/:id/quests                          teacher: Quests that can be set
 *   GET    /api/classes/:id/assignments                     the assignments, with my own due time
 *   POST   /api/classes/:id/assignments                     teacher: set a Quest (due time, AI rule, instructions)
 *   POST   /api/classes/:id/assignments/:aid/extension      teacher: a private due time for one student ({ due: null } removes it)
 *   POST   /api/classes/:id/assignments/:aid/reveal         teacher: show entries to students before the last due time
 *   DELETE /api/classes/:id/assignments/:aid                teacher: remove an assignment
 *   POST   /api/classes/:id/assignments/:aid/entries        student: hand in (or replace) an entry before the due time
 *   GET    /api/classes/:id/assignments/:aid/entries        teacher and markers: all; students: their own until the last due time
 *   POST   /api/classes/:id/copy                            teacher: copy assignments from another class, dates moved by the term gap
 *   GET    /api/classes/:id/calendar.ics                    the due times as a calendar file
 * Feedback (Q6; src/utils/classFeedback.ts), in data/local/class-feedback.jsonl and class-reviews.jsonl:
 *   POST   /api/classes/:id/assignments/:aid/settings       teacher: peer review and the sensitive-topic switch
 *   GET    /api/classes/:id/assignments/:aid/feedback       teacher and markers: all feedback; students: on their own entry
 *   POST   /api/classes/:id/assignments/:aid/feedback       teacher and markers: comment on one entry (by its ref), with an optional mark
 *   GET    /api/classes/:id/assignments/:aid/peer           students: the arguments to review and reviews of their own; teacher and markers: all reviews
 *   POST   /api/classes/:id/assignments/:aid/peer           student: review a classmate's argument (by its ref), after the last due time
 * Class table and reports (Q7; src/utils/classReport.ts):
 *   GET    /api/classes/:id/table                           the class table, as the class setting lets me see it
 *   POST   /api/classes/:id/table-settings                  teacher: what students see ({ tableView: own | nicknames | numbers })
 *   POST   /api/classes/:id/teams                           teacher: a team of 3 to 5 students ({ name, usernames })
 *   DELETE /api/classes/:id/teams/:tid                      teacher: remove a team
 *   GET    /api/classes/:id/report/:accountId               one student's report ('me' for my own; teacher and markers for anyone)
 * Gradebook and the end of a class (Q8; src/utils/classGradebook.ts):
 *   GET    /api/classes/:id/gradebook                       teacher: the gradebook rows and weights
 *   GET    /api/classes/:id/gradebook.csv                   teacher: the same as a CSV file
 *   POST   /api/classes/:id/gradebook-settings              teacher: the weights ({ weights: { participation, accuracy, calibration, marks } })
 *   GET    /api/classes/:id/my-record.csv                   student: my own entries, results and comments
 *   POST   /api/classes/:id/keep                            teacher: days an archived class is kept before it is deleted
 * An archived class is read-only. A class is archived 30 days after its term ends and deleted, with
 * its entries, feedback, reviews and class Quests, once its keeping period has passed.
 * Class Quests (Q4; src/utils/classQuests.ts), kept in data/local/class-quests/<class id>/:
 *   GET    /api/classes/:id/class-quests                    teacher and markers: the class's own Quests
 *   POST   /api/classes/:id/class-quests                    teacher: write a Forecast or Debate Quest for the class
 *   DELETE /api/classes/:id/class-quests/:qid               teacher: remove one no assignment uses
 *
 * Account roles (Viewer, Analyst, Admin; src/utils/permissions.ts) still decide what an account may
 * do in the rest of the app. A class role only decides what it may do in that class.
 */
import crypto from 'crypto';
import path from 'path';
import type express from 'express';
import { APP_ROOT, DATA_DIR } from '../config';
import type { Account } from '../../utils/auth';
import { CLASSES_NEED_SIGNIN, CLASSES_OFF_REASON, classesEnabled, classesFor, classProblems, classView, joinCodeFrom, nicknameProblems, normaliseJoinCode, roleIn, studentUsername, type ClassRole, type SchoolClass } from '../../utils/classes';
import { removeClassQuestsDir, rewriteJsonl, appendClassEntry, appendJsonl, changeClasses, classEntriesPath, classesPath, classFeedbackPath, classQuestsDir, classReviewsPath, loadClassEntries, loadClasses, loadClassQuests, loadJsonl, removeClassQuest, saveClassQuest } from '../../utils/classStore';
import { DEFAULT_WEIGHTS, GRADEBOOK_HEADER, KEEP_DAYS_DEFAULT, countedForMarks, gradeRow, gradebookCells, keepDaysProblems, lifecycleStep, weightProblems, type GradeWeights } from '../../utils/classGradebook';
import { toCsv } from '../../utils/csvExport';
import { resultState } from '../../utils/questResolve';
import { TABLE_VIEWS, TEAMS_MAX, reportSummary, tableRows, teamProblems, type ScoredClassEntry, type TableView } from '../../utils/classReport';

import { loadResolutions, resolutionsPath } from '../../utils/questResolveStore';
import { scoreEntry, type EntryScore, type QuestEntry } from '../../utils/questEntries';
import type { ForecastQuest } from '../../utils/quests';
import type { Point } from '../../utils/questScoring';
import type { SeriesSet } from '../../utils/seriesHistory';
import { FEED_DOWN, WORLD_SET, scoreFromRecord } from './quests';
import { entryRef, feedbackProblems, latestBy, peerAllocation, reviewProblems, type ClassFeedback, type ClassReview } from '../../utils/classFeedback';
import { CLASS_QUESTS_MAX, classQuestFileProblems, classQuestFrom, classQuestId, shiftClassQuest, type ClassQuestInput } from '../../utils/classQuests';
import { questLevel } from '../../utils/questLevels';
import { AI_RULES, INSTRUCTIONS_MAX, aiProblems, assignmentsIcs, daysBetween, dueFor, dueProblems, entriesVisibleToStudents, lastDueUtc, latestEntries, shiftLocal, validTimeZone, zonedToUtc, type AiRule, type ClassAssignment, type ClassEntry } from '../../utils/classAssignments';
import { loadLevels, loadQuests } from '../../utils/questStore';
import { answerFor, entryProblems, type EntryQuest } from '../../utils/questEntries';
import { questFileName, type Quest } from '../../utils/quests';
import { RateLimiter, type Bucket } from '../../utils/requestLimits';

const PEER_DEBATES_ONLY = 'Peer review is for Debate Quests, where students write an argument';

/** Class calls per caller: the app-wide limit applies too; joining is tighter, so codes cannot be guessed. */
export const CLASS_LIMITS: Record<'read' | 'write' | 'join', Bucket> = {
  read: { burst: 120, perMinute: 120 },
  write: { burst: 30, perMinute: 30 },
  join: { burst: 10, perMinute: 5 },
};

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
  /** Where Quest files are (quests/); class assignments read them even while Quests are off. */
  questsDir?: string;
  /** Defaults to data/local/class-entries.jsonl. */
  entriesFile?: string;
  /** Series for scoring class entries (Q7); without it, forecasts show as waiting for data. */
  seriesFor?: (iso3: string) => Promise<SeriesSet>;
  /** Recorded results; defaults to quests/resolutions.jsonl. */
  resolutionsFile?: string;
}

export function registerClassRoutes(app: express.Express, deps: ClassDeps): void {
  const enabled = deps.enabled ?? (() => classesEnabled(process.env.CLASSES_ENABLED));
  const file = deps.file ?? classesPath(DATA_DIR);
  const entriesFile = deps.entriesFile ?? classEntriesPath(DATA_DIR);
  const feedbackFile = classFeedbackPath(entriesFile);
  const reviewsFile = classReviewsPath(entriesFile);
  const questsDir = deps.questsDir ?? path.join(APP_ROOT, 'quests');
  const now = () => (deps.now ? deps.now() : new Date()).toISOString();
  const audit = deps.audit ?? (() => {});
  const nameOf = (id: string) => {
    const a = deps.accountById(id);
    return a ? { username: a.username, displayName: a.displayName } : undefined;
  };
  const who = (a: Account) => `${a.displayName} (${a.username})`;
  const limiter = new RateLimiter();
  /** Rate limit for class calls, by signed-in account (or address), on top of the app-wide one. */
  const classRateLimit = (kind: keyof typeof CLASS_LIMITS): express.RequestHandler => (req, res, next) => {
    const caller = deps.signedIn(res)?.id ?? req.socket.remoteAddress ?? 'unknown';
    const wait = limiter.take(`${caller}:${kind}`, CLASS_LIMITS[kind]);
    if (wait > 0) {
      res.setHeader('Retry-After', String(wait));
      return res.status(429).json({ enabled: true, error: `Too many class requests; try again in ${wait} seconds` });
    }
    next();
  };

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
  const viewReply = (cls: SchoolClass, a: Account) => ({ enabled: true, class: classView(cls, a.id, nameOf, now().slice(0, 10)) });

  /**
   * The end of a class: archive it 30 days after its term, delete it (and everything kept for it)
   * once its keeping period has passed. Run when the class list is read.
   */
  const sweep = () => {
    const today = now().slice(0, 10);
    const steps = loadClasses(file).map((c) => ({ c, step: lifecycleStep(c, today) })).filter((x) => x.step);
    if (!steps.length) return;
    const gone: SchoolClass[] = [];
    changeClasses(file, (classes) => {
      for (const c of classes) {
        const step = lifecycleStep(c, today);
        if (step === 'archive') {
          c.archivedAt = now();
          c.keepDays = c.keepDays ?? KEEP_DAYS_DEFAULT;
        }
        if (step === 'delete') gone.push(c);
      }
      const ids = new Set(gone.map((c) => c.id));
      for (let i = classes.length - 1; i >= 0; i--) if (ids.has(classes[i]!.id)) classes.splice(i, 1);
    });
    for (const x of steps.filter((y) => y.step === 'archive')) audit(`The class "${x.c.name}" (${x.c.term.label}) was archived, 30 days after its term ended`);
    for (const c of gone) {
      for (const f of [entriesFile, feedbackFile, reviewsFile]) rewriteJsonl<{ classId: string }>(f, (r) => r.classId !== c.id);
      removeClassQuestsDir(file, c.id);
      audit(`The class "${c.name}" (${c.term.label}) and everything kept for it were deleted at the end of its keeping period`);
    }
  };
  /** Archived classes are read-only; the reply is sent when this one is. */
  const readOnly = (cls: SchoolClass, res: express.Response): boolean => {
    if (!cls.archivedAt) return false;
    res.status(400).json({ enabled: true, error: 'This class is archived' });
    return true;
  };

  app.get('/api/classes', classRateLimit('read'), (_req, res) => {
    if (!enabled()) return res.json({ enabled: false, reason: CLASSES_OFF_REASON });
    sweep();
    const a = deps.authRequired() ? deps.signedIn(res) : null;
    if (!a) return res.json({ enabled: true, needSignIn: true, reason: CLASSES_NEED_SIGNIN, classes: [], canCreate: false });
    res.json({ enabled: true, classes: classesFor(loadClasses(file), a.id, nameOf, now().slice(0, 10)), canCreate: a.role !== 'viewer' });
  });

  app.post('/api/classes', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    if (a.role === 'viewer') return res.status(403).json({ enabled: true, error: 'A Viewer account cannot make a class. Ask your administrator for an Analyst account' });
    const body = (req.body || {}) as { name?: unknown; term?: Record<string, unknown> };
    const problems = classProblems(body);
    const tzGiven = (req.body as { timeZone?: unknown })?.timeZone;
    if (tzGiven !== undefined && tzGiven !== '' && !validTimeZone(tzGiven)) problems.push('Give the time zone as a name like America/Chicago');
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    const cls = changeClasses(file, (classes) => {
      const c: SchoolClass = {
        id: crypto.randomUUID(),
        name: String(body.name).trim(),
        term: { label: String(body.term!.label).trim(), starts: String(body.term!.starts), ends: String(body.term!.ends) },
        code: freshCode(classes),
        createdAt: now(),
        createdBy: a.id,
        timeZone: validTimeZone((req.body as { timeZone?: unknown })?.timeZone) ? String((req.body as { timeZone?: unknown }).timeZone) : 'UTC',
        members: [{ accountId: a.id, role: 'teacher', joinedAt: now() }],
        refSecret: crypto.randomBytes(32).toString('hex'),
      };
      classes.push(c);
      return c;
    });
    audit(`${who(a)} made the class "${cls.name}" (${cls.term.label})`);
    res.json(viewReply(cls, a));
  });

  app.post('/api/classes/join', classRateLimit('join'), (req, res) => {
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

  app.get('/api/classes/:id', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = loadClasses(file).find((c) => c.id === req.params.id);
    if (!cls || !roleIn(cls, a.id)) return res.status(404).json({ enabled: true, error: 'No class with that id that you are in' });
    res.json(viewReply(cls, a));
  });

  app.post('/api/classes/:id/members', classRateLimit('write'), (req, res) => {
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
      if (readOnly(c, res)) return (sent = true), null;
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

  app.delete('/api/classes/:id/members/:accountId', classRateLimit('write'), (req, res) => {
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

  app.post('/api/classes/:id/students', classRateLimit('write'), (req, res) => {
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

  app.post('/api/classes/:id/code', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (readOnly(c, res)) return (sent = true), null;
      c.code = freshCode(classes);
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} made a new join code for the class "${cls.name}"`);
    res.json(viewReply(cls, a));
  });

  app.post('/api/classes/:id/archive', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const archived = req.body?.archived !== false;
    const keepDays = req.body?.keepDays;
    if (archived && keepDays !== undefined && keepDaysProblems(keepDays).length) return res.status(400).json({ enabled: true, error: keepDaysProblems(keepDays).join('; ') });
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (archived) {
        c.archivedAt = c.archivedAt ?? now();
        c.keepDays = typeof keepDays === 'number' ? keepDays : c.keepDays ?? KEEP_DAYS_DEFAULT;
      } else delete c.archivedAt;
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} ${archived ? 'archived' : 'restored'} the class "${cls.name}"`);
    res.json(viewReply(cls, a));
  });

  // ---- Assignments (Q3) ----------------------------------------------------------------------
  /** Quests a class can be set: any Quest on file but Signal Quests (entered in public only), still taking entries. */
  const classQuestsOf = (classId: string) => loadClassQuests(classQuestsDir(file, classId));
  type Found = { quest: Quest; approved: boolean; classQuest: boolean; hash: string };
  /** A class Quest's fingerprint: SHA-256 of the file as the app writes it. */
  const classHash = (q: Quest) => crypto.createHash('sha256').update(`${JSON.stringify(q, null, 2)}\n`).digest('hex');
  /** The class's own Quests, then the Quests on file. */
  const questsFor = (classId: string): Found[] => [
    ...classQuestsOf(classId).map((quest) => ({ quest, approved: true, classQuest: true, hash: classHash(quest) })),
    ...loadQuests(questsDir).map((x) => ({ quest: x.quest, approved: x.approved, classQuest: false, hash: x.hash })),
  ];
  const settable = (today: string, classId: string) => questsFor(classId).filter((x) => x.quest.type !== 'signal' && x.quest.closesOn >= today);
  const questFor = (id: string, classId: string): Found | undefined => questsFor(classId).find((x) => x.quest.id === id && x.quest.type !== 'signal');
  const answerKind = (q: Quest) => (q.type === 'debate' ? 'position' : q.type === 'replication' ? 'value' : q.type === 'forecast' && q.rule.kind === 'level' ? 'level' : 'probability');
  /** The class, if I am in it; otherwise the reply already sent. */
  const asMember = (classes: SchoolClass[], id: string, a: Account, res: express.Response): SchoolClass | null => {
    const cls = classes.find((c) => c.id === id);
    if (!cls || !roleIn(cls, a.id)) {
      res.status(404).json({ enabled: true, error: 'No class with that id that you are in' });
      return null;
    }
    return cls;
  };
  const assignmentView = (cls: SchoolClass, x: ClassAssignment, a: Account, entries: ClassEntry[], nowIso: string) => {
    const role = roleIn(cls, a.id)!;
    const mine = dueFor(x, a.id);
    const latest = latestEntries(entries, x.id);
    const myEntry = latest.find((e) => e.accountId === a.id);
    return {
      id: x.id,
      questId: x.questId,
      questVersion: x.questVersion,
      title: x.title,
      due: mine.due,
      dueUtc: mine.dueUtc,
      extended: mine.extended,
      classDue: x.due,
      aiRule: x.aiRule,
      instructions: x.instructions ?? '',
      open: nowIso <= mine.dueUtc,
      entriesVisible: role !== 'student' || entriesVisibleToStudents(x, nowIso),
      revealed: Boolean(x.revealedAt),
      peerReview: Boolean(x.peerReview),
      sensitive: Boolean(x.sensitive),
      ...(myEntry ? { myEntry: { answer: myEntry.answer, rationale: myEntry.rationale ?? '', at: myEntry.at } } : {}),
      ...(role === 'student'
        ? {}
        : {
            entryCount: latest.length,
            studentCount: cls.members.filter((m) => m.role === 'student').length,
            extensions: x.extensions.map((e) => ({ accountId: e.accountId, username: nameOf(e.accountId)?.username ?? '(account removed)', due: e.due })),
          }),
    };
  };

  app.get('/api/classes/:id/quests', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asTeacher(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    const today = now().slice(0, 10);
    const levels = loadLevels(questsDir);
    res.json({
      enabled: true,
      quests: settable(today, cls.id).map((x) => ({ id: x.quest.id, title: x.quest.title, type: x.quest.type, closesOn: x.quest.closesOn, approved: x.approved, classQuest: x.classQuest, level: questLevel(x.quest, levels) ?? null })),
    });
  });

  app.get('/api/classes/:id/assignments', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    const entries = loadClassEntries(entriesFile).filter((e) => e.classId === cls.id);
    const nowIso = now();
    const list = (cls.assignments ?? []).slice().sort((x, y) => x.dueUtc.localeCompare(y.dueUtc));
    const levels = loadLevels(questsDir);
    res.json({
      enabled: true,
      timeZone: cls.timeZone || 'UTC',
      assignments: list.map((x) => {
        const found = questFor(x.questId, cls.id);
        const q = found?.quest;
        return {
          ...assignmentView(cls, x, a, entries, nowIso),
          answerKind: q ? answerKind(q) : 'probability',
          positions: q?.type === 'debate' ? q.positions : undefined,
          questMissing: !q,
          classQuest: Boolean(found?.classQuest),
          summary: q?.summary ?? '',
          rule: q?.type === 'forecast' ? q.rule : undefined,
          level: q ? questLevel(q, levels) ?? null : null,
        };
      }),
    });
  });

  app.post('/api/classes/:id/assignments', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const body = (req.body || {}) as { questId?: unknown; due?: unknown; aiRule?: unknown; instructions?: unknown; peerReview?: unknown; sensitive?: unknown };
    const found = questFor(String(body.questId || ''), String(req.params.id));
    if (!found) return res.status(400).json({ enabled: true, error: 'Pick a Quest on file (Signal Quests are entered in public, so they cannot be set for a class)' });
    const aiRule = body.aiRule as AiRule;
    if (!AI_RULES.includes(aiRule)) return res.status(400).json({ enabled: true, error: 'Choose a rule on AI use' });
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
    if (instructions.length > INSTRUCTIONS_MAX) return res.status(400).json({ enabled: true, error: `Instructions: at most ${INSTRUCTIONS_MAX} characters` });
    const peerReview = body.peerReview === true;
    const sensitive = body.sensitive === true;
    if (peerReview && found.quest.type !== 'debate') return res.status(400).json({ enabled: true, error: PEER_DEBATES_ONLY });
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (readOnly(c, res)) return (sent = true), null;
      const tz = c.timeZone || 'UTC';
      const problems = dueProblems(body.due, tz, found.quest.closesOn, now());
      if (problems.length) {
        res.status(400).json({ enabled: true, error: problems.join('; ') });
        return (sent = true), null;
      }
      const x: ClassAssignment = { id: crypto.randomUUID(), questId: found.quest.id, questVersion: found.quest.version, title: found.quest.title, due: String(body.due), dueUtc: zonedToUtc(String(body.due), tz)!, aiRule, ...(instructions ? { instructions } : {}), extensions: [], createdAt: now(), ...(peerReview ? { peerReview } : {}), ...(sensitive ? { sensitive } : {}) };
      c.assignments = [...(c.assignments ?? []), x];
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} set the Quest ${found.quest.id} for the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  });

  /** Teacher changes to one assignment: an extension, showing entries early, or removing it. */
  const changeAssignment = (req: express.Request, res: express.Response, a: Account, change: (c: SchoolClass, x: ClassAssignment) => string | null, summary: string) => {
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (readOnly(c, res)) return (sent = true), null;
      const x = (c.assignments ?? []).find((y) => y.id === req.params.aid);
      if (!x) {
        res.status(404).json({ enabled: true, error: 'No assignment with that id in this class' });
        return (sent = true), null;
      }
      const problem = change(c, x);
      if (problem) {
        res.status(400).json({ enabled: true, error: problem });
        return (sent = true), null;
      }
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} ${summary} in the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  };

  app.post('/api/classes/:id/assignments/:aid/extension', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const target = deps.accountByUsername(String(req.body?.username || '').trim().toLowerCase());
    changeAssignment(req, res, a, (c, x) => {
      if (!target || roleIn(c, target.id) !== 'student') return 'That username is not a student in this class';
      if (req.body?.due === null) {
        x.extensions = x.extensions.filter((e) => e.accountId !== target.id);
        return null;
      }
      const q = questFor(x.questId, c.id);
      if (!q) return 'The Quest is no longer on file';
      const tz = c.timeZone || 'UTC';
      const problems = dueProblems(req.body?.due, tz, q.quest.closesOn, now());
      if (problems.length) return problems.join('; ');
      x.extensions = [...x.extensions.filter((e) => e.accountId !== target.id), { accountId: target.id, due: String(req.body.due), dueUtc: zonedToUtc(String(req.body.due), tz)! }];
      return null;
    }, `changed the due time for ${target?.username ?? 'a student'} on ${req.params.aid}`);
  });

  app.post('/api/classes/:id/assignments/:aid/reveal', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    changeAssignment(req, res, a, (_c, x) => {
      x.revealedAt = x.revealedAt ?? now();
      return null;
    }, `showed the entries for ${req.params.aid} to students`);
  });

  app.delete('/api/classes/:id/assignments/:aid', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    changeAssignment(req, res, a, (c, x) => {
      c.assignments = (c.assignments ?? []).filter((y) => y.id !== x.id);
      return null;
    }, `removed the assignment ${req.params.aid}`);
  });

  app.post('/api/classes/:id/assignments/:aid/entries', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    if (roleIn(cls, a.id) !== 'student') return res.status(403).json({ enabled: true, error: 'Only students of this class hand in entries' });
    if (readOnly(cls, res)) return;
    const x = (cls.assignments ?? []).find((y) => y.id === req.params.aid);
    if (!x) return res.status(404).json({ enabled: true, error: 'No assignment with that id in this class' });
    const nowIso = now();
    if (nowIso > dueFor(x, a.id).dueUtc) return res.status(400).json({ enabled: true, error: 'This assignment is past its due time' });
    const found = questFor(x.questId, cls.id);
    if (!found) return res.status(400).json({ enabled: true, error: 'The Quest is no longer on file' });
    const body = (req.body || {}) as { answer?: Record<string, unknown>; rationale?: unknown; code?: unknown; aiNote?: unknown; aiDeclaredNone?: unknown };
    const quest = found.quest as EntryQuest;
    const input = {
      questId: quest.id,
      answer: answerFor(quest, body.answer ?? {}),
      ...(typeof body.rationale === 'string' && body.rationale.trim() ? { rationale: body.rationale.trim().slice(0, 4000) } : {}),
      ...(typeof body.code === 'string' && body.code.trim() ? { code: body.code.trim() } : {}),
    };
    const problems = [...entryProblems(input, quest, nowIso.slice(0, 10)), ...aiProblems(x.aiRule, body.aiNote, body.aiDeclaredNone)];
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    const entry: ClassEntry = {
      id: crypto.randomUUID(),
      classId: cls.id,
      assignmentId: x.id,
      accountId: a.id,
      questId: quest.id,
      questVersion: quest.version,
      questHash: found.hash,
      answer: input.answer,
      ...(input.rationale ? { rationale: input.rationale } : {}),
      ...(input.code ? { code: input.code } : {}),
      ai: { rule: x.aiRule, ...(x.aiRule === 'note' ? { note: String(body.aiNote).trim().slice(0, 1000) } : {}), ...(x.aiRule === 'none' ? { declaredNone: true } : {}) },
      at: nowIso,
    };
    appendClassEntry(entriesFile, entry);
    res.json({ enabled: true, entry: { answer: entry.answer, rationale: entry.rationale ?? '', at: entry.at } });
  });

  app.get('/api/classes/:id/assignments/:aid/entries', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    const x = (cls.assignments ?? []).find((y) => y.id === req.params.aid);
    if (!x) return res.status(404).json({ enabled: true, error: 'No assignment with that id in this class' });
    const role = roleIn(cls, a.id)!;
    const all = loadClassEntries(entriesFile).filter((e) => e.classId === cls.id);
    let latest = latestEntries(all, x.id);
    if (role === 'student' && !entriesVisibleToStudents(x, now())) latest = latest.filter((e) => e.accountId === a.id);
    const replaced = (accountId: string) => all.filter((e) => e.assignmentId === x.id && e.accountId === accountId).length - 1;
    const hide = namesHidden(x, role);
    const secret = role === 'student' ? '' : secretOf(cls.id);
    const hidden = hiddenNames(latest.map((e) => e.accountId), x.id, role === 'student' ? 'Classmate' : 'Student');
    res.json({
      enabled: true,
      hiddenUntilDue: role === 'student' && !entriesVisibleToStudents(x, now()),
      namesHidden: hide,
      entries: latest
        .map((e) => ({
          name: e.accountId === a.id ? nameOf(e.accountId)?.displayName ?? '(account removed)' : hide ? hidden.get(e.accountId)! : nameOf(e.accountId)?.displayName ?? '(account removed)',
          mine: e.accountId === a.id,
          ...(role === 'student' ? {} : { ref: entryRef(secret, x.id, e.accountId) }),
          answer: e.answer,
          rationale: e.rationale ?? '',
          code: e.code ?? '',
          at: e.at,
          ...(role === 'student' ? {} : { username: hide ? '' : nameOf(e.accountId)?.username ?? '', ai: e.ai, replaced: replaced(e.accountId), late: e.at > dueFor(x, e.accountId).dueUtc }),
        }))
        .sort((p, q) => p.name.localeCompare(q.name, undefined, { numeric: true })),
    });
  });

  // ---- Feedback, peer review and sensitive topics (Q6) ---------------------------------------
  /** Names are hidden from students and markers on a sensitive assignment (the teacher sees them). */
  const namesHidden = (x: ClassAssignment, role: ClassRole) => Boolean(x.sensitive) && role !== 'teacher';
  /** "Student 1", "Student 2"... in a fixed order that does not follow names. */
  const hiddenNames = (accountIds: string[], assignmentId: string, word: string) => {
    const order = [...peerAllocation(assignmentId, accountIds, 0).keys()];
    return new Map(order.map((id, i) => [id, `${word} ${i + 1}`]));
  };
  /** The class's key for entry references, made the first time an older class needs one. */
  const secretOf = (classId: string): string => {
    const have = loadClasses(file).find((c) => c.id === classId)?.refSecret;
    if (have) return have;
    return changeClasses(file, (classes) => {
      const c = classes.find((y) => y.id === classId)!;
      c.refSecret = c.refSecret ?? crypto.randomBytes(32).toString('hex');
      return c.refSecret;
    });
  };
  /** The student whose entry a ref points at, among those who handed in. */
  const studentByRef = (cls: SchoolClass, x: ClassAssignment, ref: unknown): string | undefined => {
    if (typeof ref !== 'string' || !/^[0-9a-f]{16}$/.test(ref)) return undefined;
    const secret = secretOf(cls.id);
    return latestEntries(loadClassEntries(entriesFile), x.id).find((e) => e.classId === cls.id && entryRef(secret, x.id, e.accountId) === ref)?.accountId;
  };
  /** The class and assignment for a feedback call, if I am in the class; otherwise the reply already sent. */
  const memberAndAssignment = (req: express.Request, res: express.Response, a: Account) => {
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return null;
    const x = (cls.assignments ?? []).find((y) => y.id === req.params.aid);
    if (!x) {
      res.status(404).json({ enabled: true, error: 'No assignment with that id in this class' });
      return null;
    }
    return { cls, x, role: roleIn(cls, a.id)! };
  };

  app.post('/api/classes/:id/assignments/:aid/settings', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const body = (req.body || {}) as { peerReview?: unknown; sensitive?: unknown };
    changeAssignment(req, res, a, (c, x) => {
      if (typeof body.peerReview === 'boolean') {
        if (body.peerReview && questFor(x.questId, c.id)?.quest.type !== 'debate') return PEER_DEBATES_ONLY;
        if (body.peerReview) x.peerReview = true;
        else delete x.peerReview;
      }
      if (typeof body.sensitive === 'boolean') {
        const handedIn = loadClassEntries(entriesFile).some((e) => e.classId === c.id && e.assignmentId === x.id);
        if (!body.sensitive && x.sensitive && handedIn) return 'Entries are in, so this assignment stays a sensitive topic: the students handed in on that promise';
        if (body.sensitive) x.sensitive = true;
        else delete x.sensitive;
      }
      return null;
    }, `changed the feedback settings on ${req.params.aid}`);
  });

  app.get('/api/classes/:id/assignments/:aid/feedback', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const m = memberAndAssignment(req, res, a);
    if (!m) return;
    const { cls, x, role } = m;
    const rows = latestBy(
      loadJsonl<ClassFeedback>(feedbackFile).filter((f) => f.classId === cls.id && f.assignmentId === x.id),
      (f) => `${f.accountId}:${f.by}`,
    );
    const by = (f: ClassFeedback) => nameOf(f.by)?.displayName ?? '(account removed)';
    if (role === 'student') return res.json({ enabled: true, feedback: rows.filter((f) => f.accountId === a.id).map((f) => ({ by: by(f), text: f.text, mark: f.mark ?? '', at: f.at })) });
    const secret = secretOf(cls.id);
    const hide = namesHidden(x, role);
    const hidden = hiddenNames(latestEntries(loadClassEntries(entriesFile), x.id).filter((e) => e.classId === cls.id).map((e) => e.accountId), x.id, 'Student');
    res.json({
      enabled: true,
      feedback: rows.map((f) => ({ ref: entryRef(secret, x.id, f.accountId), student: hide ? hidden.get(f.accountId) ?? 'Student' : nameOf(f.accountId)?.displayName ?? '(account removed)', by: by(f), mine: f.by === a.id, text: f.text, mark: f.mark ?? '', at: f.at })),
    });
  });

  app.post('/api/classes/:id/assignments/:aid/feedback', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const m = memberAndAssignment(req, res, a);
    if (!m) return;
    const { cls, x, role } = m;
    if (role === 'student') return res.status(403).json({ enabled: true, error: 'Only the teacher and markers write feedback' });
    if (cls.archivedAt) return res.status(400).json({ enabled: true, error: 'This class is archived' });
    const problems = feedbackProblems(req.body?.text, req.body?.mark);
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    const student = studentByRef(cls, x, req.body?.ref);
    if (!student) return res.status(404).json({ enabled: true, error: 'No entry with that reference on this assignment' });
    const mark = typeof req.body?.mark === 'string' ? req.body.mark.trim() : '';
    const row: ClassFeedback = { id: crypto.randomUUID(), classId: cls.id, assignmentId: x.id, accountId: student, by: a.id, text: String(req.body.text).trim(), ...(mark ? { mark } : {}), at: now() };
    appendJsonl(feedbackFile, row);
    audit(`${who(a)} wrote feedback on an entry for ${x.id} in the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  });

  /** Peer review opens once nobody can hand in any more. */
  const peerOpen = (x: ClassAssignment) => Boolean(x.peerReview) && now() > lastDueUtc(x);
  const peerAuthors = (cls: SchoolClass, x: ClassAssignment) => latestEntries(loadClassEntries(entriesFile).filter((e) => e.classId === cls.id), x.id);

  app.get('/api/classes/:id/assignments/:aid/peer', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const m = memberAndAssignment(req, res, a);
    if (!m) return;
    const { cls, x, role } = m;
    if (!x.peerReview) return res.status(400).json({ enabled: true, error: 'Peer review is not on for this assignment' });
    const open = peerOpen(x);
    const reviews = latestBy(
      loadJsonl<ClassReview>(reviewsFile).filter((r) => r.classId === cls.id && r.assignmentId === x.id),
      (r) => `${r.reviewerId}:${r.authorId}`,
    );
    const entries = peerAuthors(cls, x);
    const allocation = peerAllocation(x.id, entries.map((e) => e.accountId));
    if (role === 'student') {
      const secret = secretOf(cls.id);
      const toReview = open
        ? (allocation.get(a.id) ?? []).map((authorId, i) => {
            const e = entries.find((y) => y.accountId === authorId)!;
            const mine = reviews.find((r) => r.reviewerId === a.id && r.authorId === authorId);
            return { ref: entryRef(secret, x.id, authorId), label: `Classmate ${String.fromCharCode(65 + i)}`, answer: e.answer, rationale: e.rationale ?? '', myReview: mine?.text ?? '' };
          })
        : [];
      return res.json({
        enabled: true,
        open,
        opensAt: lastDueUtc(x),
        handedIn: allocation.has(a.id),
        toReview,
        aboutMine: open ? reviews.filter((r) => r.authorId === a.id).map((r) => ({ text: r.text, at: r.at })) : [],
      });
    }
    const hide = namesHidden(x, role);
    const hidden = hiddenNames(entries.map((e) => e.accountId), x.id, 'Student');
    const name = (id: string) => (hide ? hidden.get(id) ?? 'Student' : nameOf(id)?.displayName ?? '(account removed)');
    res.json({
      enabled: true,
      open,
      opensAt: lastDueUtc(x),
      expected: [...allocation.values()].reduce((n, l) => n + l.length, 0),
      reviews: reviews.map((r) => ({ author: name(r.authorId), reviewer: name(r.reviewerId), text: r.text, at: r.at })),
    });
  });

  app.post('/api/classes/:id/assignments/:aid/peer', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const m = memberAndAssignment(req, res, a);
    if (!m) return;
    const { cls, x, role } = m;
    if (role !== 'student') return res.status(403).json({ enabled: true, error: 'Only students of this class write peer reviews' });
    if (cls.archivedAt) return res.status(400).json({ enabled: true, error: 'This class is archived' });
    if (!x.peerReview) return res.status(400).json({ enabled: true, error: 'Peer review is not on for this assignment' });
    if (!peerOpen(x)) return res.status(400).json({ enabled: true, error: 'Peer review opens when everyone’s due time has passed' });
    const problems = reviewProblems(req.body?.text);
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    const author = studentByRef(cls, x, req.body?.ref);
    const allocation = peerAllocation(x.id, peerAuthors(cls, x).map((e) => e.accountId));
    if (!author || !(allocation.get(a.id) ?? []).includes(author)) return res.status(404).json({ enabled: true, error: 'That argument is not one of the two given to you to review' });
    const row: ClassReview = { id: crypto.randomUUID(), classId: cls.id, assignmentId: x.id, authorId: author, reviewerId: a.id, text: String(req.body.text).trim(), at: now() };
    appendJsonl(reviewsFile, row);
    res.json({ enabled: true, ok: true });
  });

  // ---- Class table, teams and student reports (Q7) ------------------------------------------
  const resultsFile = deps.resolutionsFile ?? resolutionsPath(questsDir);
  /** Daily or weekly points for a series, or why there are none. */
  const pointsFor = async (ref: { country: string; series: string }): Promise<Point[] | { reason: string }> => {
    if (!deps.seriesFor) return { reason: 'No series on this server' };
    try {
      const set = await deps.seriesFor(ref.country === 'WLD' ? WORLD_SET : ref.country);
      const x = set.series.find((y) => y.id === ref.series);
      if (!x || !x.points.length) return { reason: set.missing.find((m) => m.id === ref.series)?.reason || 'No published values' };
      return x.points.map((pt) => ({ date: pt.date, value: pt.value }));
    } catch {
      return { reason: FEED_DOWN };
    }
  };
  /** Every counted entry of the class (the latest per student and assignment), scored. */
  const scoreClass = async (cls: SchoolClass): Promise<ScoredClassEntry[]> => {
    const all = loadClassEntries(entriesFile).filter((e) => e.classId === cls.id);
    const recorded = loadResolutions(resultsFile).lines;
    const today = now().slice(0, 10);
    const cache = new Map<string, Promise<Point[] | { reason: string }>>();
    const get = (ref: { country: string; series: string }) => {
      const k = `${ref.country}|${ref.series}`;
      if (!cache.has(k)) cache.set(k, pointsFor(ref));
      return cache.get(k)!;
    };
    const out: ScoredClassEntry[] = [];
    for (const x of cls.assignments ?? []) {
      const found = questFor(x.questId, cls.id);
      for (const e of latestEntries(all, x.id)) {
        const like = { questId: e.questId, questVersion: e.questVersion, answer: e.answer } as QuestEntry;
        let score: EntryScore;
        const q = found?.quest;
        if (!q) score = { status: 'unresolvable', note: 'The Quest is no longer on file' };
        else if (q.type === 'debate') score = { status: 'debate', note: 'Debate Quests are argued, not scored' };
        else score = (!found.classQuest && scoreFromRecord(like, recorded)) || (q.type === 'forecast' ? await scoreForecast(like, q, get, today) : { status: 'waiting', note: `Scored after ${q.closesOn}` });
        out.push({ accountId: e.accountId, assignmentId: x.id, title: x.title, answer: e.answer as Record<string, number>, at: e.at, score });
      }
    }
    return out;
  };
  const scoreForecast = async (like: QuestEntry, q: ForecastQuest, get: (ref: { country: string; series: string }) => Promise<Point[] | { reason: string }>, today: string): Promise<EntryScore> => {
    const pts = new Map<string, Point[] | { reason: string }>();
    for (const r of [q.rule, ...(q.fallback !== 'unresolvable' ? [q.fallback.rule] : [])]) pts.set(`${r.ref.country}|${r.ref.series}`, await get(r.ref));
    return scoreEntry(like, q, (rule) => pts.get(`${rule.ref.country}|${rule.ref.series}`) ?? { reason: 'No series' }, today);
  };
  /** Entries on a sensitive assignment stay out of the table; only the teacher and the student see them, in the report. */
  const sensitiveIds = (cls: SchoolClass) => new Set((cls.assignments ?? []).filter((x) => x.sensitive).map((x) => x.id));

  app.get('/api/classes/:id/table', classRateLimit('read'), async (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    const role = roleIn(cls, a.id)!;
    const view: TableView = cls.tableView ?? 'own';
    const hidden = sensitiveIds(cls);
    const scored = (await scoreClass(cls)).filter((x) => !hidden.has(x.assignmentId));
    const students = cls.members.filter((m) => m.role === 'student').map((m) => m.accountId);
    const numbers = hiddenNames(students, cls.id, 'Student');
    const display = (id: string) => nameOf(id)?.displayName ?? '(account removed)';
    const staff = role !== 'student';
    const name = (id: string) => (staff || id === a.id || view === 'nicknames' ? display(id) : numbers.get(id) ?? 'Student');
    const rows = tableRows(scored, (id) => (students.includes(id) ? id : null))
      .filter((r) => staff || view !== 'own' || r.key === a.id)
      .map((r) => ({ ...r, key: undefined, name: name(r.key), mine: r.key === a.id, ...(staff ? { accountId: r.key } : {}) }));
    const teams = cls.teams ?? [];
    const teamOf = new Map(teams.flatMap((t) => t.members.map((m) => [m, t.id] as const)));
    const myTeam = teamOf.get(a.id);
    const teamRows = tableRows(scored, (id) => teamOf.get(id) ?? null)
      .filter((r) => staff || view !== 'own' || r.key === myTeam)
      .map((r) => {
        const t = teams.find((y) => y.id === r.key)!;
        return { ...r, key: undefined, id: t.id, name: t.name, mine: t.id === myTeam, members: staff || t.id === myTeam || view === 'nicknames' ? t.members.map(display) : t.members.map((m) => numbers.get(m) ?? 'Student') };
      });
    res.json({ enabled: true, tableView: view, rows, teams: teamRows, allTeams: staff ? teams.map((t) => ({ id: t.id, name: t.name, members: t.members.map(display) })) : undefined, sensitiveLeftOut: hidden.size > 0 });
  });

  app.post('/api/classes/:id/table-settings', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const view = req.body?.tableView as TableView;
    if (!TABLE_VIEWS.includes(view)) return res.status(400).json({ enabled: true, error: 'Choose what students see of the class table' });
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (readOnly(c, res)) return (sent = true), null;
      c.tableView = view;
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} set what students see of the class table to "${view}" in the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  });

  app.post('/api/classes/:id/teams', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const usernames = Array.isArray(req.body?.usernames) ? (req.body.usernames as unknown[]).map((u) => String(u ?? '').trim().toLowerCase()).filter(Boolean) : null;
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (readOnly(c, res)) return (sent = true), null;
      const ids = (usernames ?? []).map((u) => deps.accountByUsername(u)?.id ?? `?${u}`);
      const teams = c.teams ?? [];
      const problems = teams.length >= TEAMS_MAX ? [`A class has at most ${TEAMS_MAX} teams`] : teamProblems(req.body?.name, usernames ? ids : null, (id) => roleIn(c, id) === 'student', (id) => teams.some((t) => t.members.includes(id)));
      if (problems.length) {
        res.status(400).json({ enabled: true, error: problems.join('; ') });
        return (sent = true), null;
      }
      c.teams = [...teams, { id: crypto.randomUUID(), name: String(req.body.name).trim(), members: [...new Set(ids)] }];
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} made a team in the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  });

  app.delete('/api/classes/:id/teams/:tid', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      if (!(c.teams ?? []).some((t) => t.id === req.params.tid)) {
        res.status(404).json({ enabled: true, error: 'No team with that id in this class' });
        return (sent = true), null;
      }
      c.teams = (c.teams ?? []).filter((t) => t.id !== req.params.tid);
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} removed a team in the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  });

  app.get('/api/classes/:id/report/:accountId', classRateLimit('read'), async (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    const role = roleIn(cls, a.id)!;
    const target = req.params.accountId === 'me' ? a.id : String(req.params.accountId);
    if (role === 'student' && target !== a.id) return res.status(403).json({ enabled: true, error: 'A student sees only their own report' });
    if (roleIn(cls, target) !== 'student') return res.status(404).json({ enabled: true, error: 'That account is not a student in this class' });
    // A marker does not see entries on a sensitive topic; the teacher and the student do.
    const hidden = role === 'marker' ? sensitiveIds(cls) : new Set<string>();
    const mine = (await scoreClass(cls)).filter((x) => x.accountId === target && !hidden.has(x.assignmentId));
    const assignments = new Map((cls.assignments ?? []).map((x) => [x.id, x]));
    const feedback = latestBy(
      loadJsonl<ClassFeedback>(feedbackFile).filter((f) => f.classId === cls.id && f.accountId === target && !hidden.has(f.assignmentId)),
      (f) => `${f.assignmentId}:${f.by}`,
    );
    const reviews = latestBy(
      loadJsonl<ClassReview>(reviewsFile).filter((r) => r.classId === cls.id && r.authorId === target && !hidden.has(r.assignmentId) && assignments.get(r.assignmentId) && peerOpen(assignments.get(r.assignmentId)!)),
      (r) => `${r.assignmentId}:${r.reviewerId}`,
    );
    res.json({
      enabled: true,
      student: nameOf(target)?.displayName ?? '(account removed)',
      className: cls.name,
      term: cls.term.label,
      madeAt: now(),
      summary: reportSummary(mine),
      entries: mine
        .sort((p, q) => p.at.localeCompare(q.at))
        .map((x) => {
          const q = questFor(assignments.get(x.assignmentId)?.questId ?? '', cls.id)?.quest;
          return { title: x.title, answer: x.answer, at: x.at, score: x.score, ...(q?.type === 'debate' ? { positions: q.positions } : {}) };
        }),
      feedback: feedback.map((f) => ({ assignment: assignments.get(f.assignmentId)?.title ?? '', by: nameOf(f.by)?.displayName ?? '(account removed)', text: f.text, mark: f.mark ?? '', at: f.at })),
      reviews: reviews.map((r) => ({ assignment: assignments.get(r.assignmentId)?.title ?? '', text: r.text, at: r.at })),
    });
  });

  // ---- Gradebook, own record and keeping period (Q8) -----------------------------------------
  /** Assignments whose Quest was withdrawn, found unresolvable or is gone: they drop out of the marks. */
  const voidedIds = (cls: SchoolClass) => {
    const lines = loadResolutions(resultsFile).lines;
    return new Set(
      (cls.assignments ?? [])
        .filter((x) => {
          const f = questFor(x.questId, cls.id);
          if (!f) return true;
          if (f.classQuest) return false;
          const st = resultState(lines, x.questId, x.questVersion).state;
          return st === 'withdrawn' || st === 'unresolvable';
        })
        .map((x) => x.id),
    );
  };
  const gradebook = async (cls: SchoolClass) => {
    const sensitive = sensitiveIds(cls);
    const voided = voidedIds(cls);
    const counted = (cls.assignments ?? []).filter((x) => !sensitive.has(x.id) && !voided.has(x.id));
    const scored = countedForMarks((await scoreClass(cls)).filter((x) => !sensitive.has(x.assignmentId)), voided);
    const marks = latestBy(
      loadJsonl<ClassFeedback>(feedbackFile).filter((f) => f.classId === cls.id && f.mark && !sensitive.has(f.assignmentId) && !voided.has(f.assignmentId)),
      (f) => `${f.assignmentId}:${f.accountId}:${f.by}`,
    );
    const weights: GradeWeights = cls.weights ?? DEFAULT_WEIGHTS;
    const rows = cls.members
      .filter((m) => m.role === 'student')
      .map((m) => {
        const mine = scored.filter((x) => x.accountId === m.accountId);
        return gradeRow(
          {
            student: nameOf(m.accountId)?.displayName ?? '(account removed)',
            username: nameOf(m.accountId)?.username ?? '',
            assignments: counted.length,
            handedIn: new Set(mine.map((x) => x.assignmentId)).size,
            summary: reportSummary(mine),
            marks: marks.filter((f) => f.accountId === m.accountId).map((f) => f.mark!),
          },
          weights,
        );
      })
      .sort((p, q) => p.student.localeCompare(q.student));
    return { weights, rows, leftOut: { sensitive: sensitive.size, voided: voided.size } };
  };

  app.get('/api/classes/:id/gradebook', classRateLimit('read'), async (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asTeacher(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    res.json({ enabled: true, ...(await gradebook(cls)) });
  });

  app.get('/api/classes/:id/gradebook.csv', classRateLimit('read'), async (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asTeacher(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    const g = await gradebook(cls);
    audit(`${who(a)} downloaded the gradebook of the class "${cls.name}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="econquest-gradebook.csv"');
    res.send(toCsv(GRADEBOOK_HEADER, g.rows.map(gradebookCells)));
  });

  app.post('/api/classes/:id/gradebook-settings', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const problems = weightProblems(req.body?.weights);
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      const w = req.body.weights as GradeWeights;
      c.weights = { participation: w.participation, accuracy: w.accuracy, calibration: w.calibration, marks: w.marks };
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} changed the gradebook weights of the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  });

  app.get('/api/classes/:id/my-record.csv', classRateLimit('read'), async (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    if (roleIn(cls, a.id) !== 'student') return res.status(403).json({ enabled: true, error: 'This download is for students of the class' });
    // Sensitive topics never leave this copy, not even in a student's own file.
    const sensitive = sensitiveIds(cls);
    const voided = voidedIds(cls);
    const mine = (await scoreClass(cls)).filter((x) => x.accountId === a.id && !sensitive.has(x.assignmentId));
    const feedback = latestBy(
      loadJsonl<ClassFeedback>(feedbackFile).filter((f) => f.classId === cls.id && f.accountId === a.id && !sensitive.has(f.assignmentId)),
      (f) => `${f.assignmentId}:${f.by}`,
    );
    const title = (aid: string) => (cls.assignments ?? []).find((x) => x.id === aid)?.title ?? '';
    const answer = (ans: Record<string, number>) => (typeof ans.probability === 'number' ? ans.probability : ans.level ?? ans.value ?? ans.position ?? null);
    const rows = [
      ...mine.map((x) => [x.title, 'entry', x.at, answer(x.answer), x.score.status === 'settled' && x.score.answer === 'probability' ? x.score.brier : null, x.score.status === 'settled' ? x.score.skill : null, voided.has(x.assignmentId) ? 'voided' : x.score.status, '', '']),
      ...feedback.map((f) => [title(f.assignmentId), 'feedback', f.at, null, null, null, '', f.mark ?? '', f.text]),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="econquest-my-class-record.csv"');
    res.send(toCsv(['assignment', 'kind', 'at', 'answer', 'brier', 'skill', 'status', 'mark', 'text'], rows));
  });

  app.post('/api/classes/:id/keep', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const problems = keepDaysProblems(req.body?.keepDays);
    if (problems.length) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    let sent = false;
    const cls = changeClasses(file, (classes) => {
      const c = asTeacher(classes, String(req.params.id), a, res);
      if (!c) return (sent = true), null;
      c.keepDays = req.body.keepDays as number;
      return c;
    });
    if (sent || !cls) return;
    audit(`${who(a)} set the class "${cls.name}" to be kept ${cls.keepDays} days after archiving`);
    res.json(viewReply(cls, a));
  });

  app.post('/api/classes/:id/copy', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const fromId = String(req.body?.fromClassId || '');
    const today = now().slice(0, 10);
    let sent = false;
    const out = changeClasses(file, (classes) => {
      const to = asTeacher(classes, String(req.params.id), a, res);
      if (!to) return (sent = true), null;
      if (readOnly(to, res)) return (sent = true), null;
      const from = classes.find((c) => c.id === fromId);
      if (!from || roleIn(from, a.id) !== 'teacher' || from.id === to.id) {
        res.status(404).json({ enabled: true, error: 'Pick another class that you teach to copy from' });
        return (sent = true), null;
      }
      const shift = daysBetween(from.term.starts, to.term.starts);
      const tz = to.timeZone || 'UTC';
      const copied: string[] = [];
      const skipped: string[] = [];
      const pendingQuests: Quest[] = [];
      for (const x of from.assignments ?? []) {
        const due = shiftLocal(x.due, shift);
        let q = questFor(x.questId, from.id);
        if (q?.classQuest) {
          // A class Quest moves with its class: same id, dates moved by the term gap, checked again.
          const existing = classQuestsOf(to.id).find((y) => y.id === x.questId);
          const moved = existing ?? shiftClassQuest(q.quest, shift, today);
          const p = existing ? [] : classQuestFileProblems(moved, questFileName(moved));
          if (p.length) {
            skipped.push(`${x.title}: ${p[0]}`);
            continue;
          }
          if (!existing) pendingQuests.push(moved);
          q = { quest: moved, approved: true, classQuest: true, hash: classHash(moved) };
        }
        const problems = q ? dueProblems(due, tz, q.quest.closesOn, now()) : ['The Quest is no longer on file'];
        if (q && q.quest.closesOn < today) problems.unshift(`The Quest closed on ${q.quest.closesOn}`);
        if (problems.length) {
          skipped.push(`${x.title}: ${problems[0]}`);
          continue;
        }
        to.assignments = [...(to.assignments ?? []), { id: crypto.randomUUID(), questId: x.questId, questVersion: q!.quest.version, title: q!.quest.title, due, dueUtc: zonedToUtc(due, tz)!, aiRule: x.aiRule, ...(x.instructions ? { instructions: x.instructions } : {}), extensions: [], createdAt: now(), ...(x.peerReview ? { peerReview: true } : {}), ...(x.sensitive ? { sensitive: true } : {}) }];
        copied.push(x.title);
      }
      for (const q of pendingQuests) saveClassQuest(classQuestsDir(file, to.id), q);
      return { to, from, copied, skipped };
    });
    if (sent || !out) return;
    audit(`${who(a)} copied ${out.copied.length} assignment(s) from "${out.from.name}" to "${out.to.name}"`);
    res.json({ enabled: true, copied: out.copied, skipped: out.skipped });
  });

  // ---- Class Quests (Q4) ---------------------------------------------------------------------
  app.get('/api/classes/:id/class-quests', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    if (roleIn(cls, a.id) === 'student') return res.status(403).json({ enabled: true, error: 'Students see a class Quest when it is set for the class' });
    const used = new Set((cls.assignments ?? []).map((x) => x.questId));
    res.json({
      enabled: true,
      quests: classQuestsOf(cls.id).map((q) => ({
        id: q.id,
        type: q.type,
        title: q.title,
        summary: q.summary,
        level: q.level ?? null,
        opensOn: q.opensOn,
        closesOn: q.closesOn,
        rule: q.type === 'forecast' ? q.rule : undefined,
        positions: q.type === 'debate' ? q.positions : undefined,
        author: q.author,
        used: used.has(q.id),
      })),
    });
  });

  app.post('/api/classes/:id/class-quests', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asTeacher(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    if (cls.archivedAt) return res.status(400).json({ enabled: true, error: 'This class is archived' });
    const dir = classQuestsDir(file, cls.id);
    const mine = classQuestsOf(cls.id);
    if (mine.length >= CLASS_QUESTS_MAX) return res.status(400).json({ enabled: true, error: `A class holds at most ${CLASS_QUESTS_MAX} Quests` });
    const body = (req.body || {}) as ClassQuestInput;
    const title = typeof body.title === 'string' ? body.title : '';
    const taken = new Set(questsFor(cls.id).map((x) => x.quest.id));
    let id = classQuestId(title, crypto.randomBytes(3).toString('hex'));
    while (taken.has(id)) id = classQuestId(title, crypto.randomBytes(3).toString('hex'));
    const { quest, problems } = classQuestFrom(body, { id, author: a.username, today: now().slice(0, 10) });
    if (!quest) return res.status(400).json({ enabled: true, error: problems.join('; ') });
    saveClassQuest(dir, quest);
    audit(`${who(a)} wrote the class Quest ${quest.id} for the class "${cls.name}"`);
    res.json({ enabled: true, id: quest.id });
  });

  app.delete('/api/classes/:id/class-quests/:qid', classRateLimit('write'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asTeacher(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    const q = classQuestsOf(cls.id).find((y) => y.id === req.params.qid);
    if (!q) return res.status(404).json({ enabled: true, error: 'No class Quest with that id in this class' });
    if ((cls.assignments ?? []).some((x) => x.questId === q.id)) return res.status(400).json({ enabled: true, error: 'This Quest is set for the class. Remove the assignment first' });
    removeClassQuest(classQuestsDir(file, cls.id), q);
    audit(`${who(a)} removed the class Quest ${q.id} from the class "${cls.name}"`);
    res.json({ enabled: true, ok: true });
  });

  app.get('/api/classes/:id/calendar.ics', classRateLimit('read'), (req, res) => {
    const a = me(res);
    if (!a) return;
    const cls = asMember(loadClasses(file), String(req.params.id), a, res);
    if (!cls) return;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="econquest-class.ics"');
    res.send(assignmentsIcs(cls.name, cls.assignments ?? [], a.id, now()));
  });
}
