/**
 * World Bank development projects (R5, src/utils/wbProjects.ts): every active project from the
 * Projects API and the IDA statement of credits, grants and guarantees from Finances One, both no
 * key. Saved in data/live/wb-projects.json and downloaded again after a week (the daily download
 * step world:wb_projects). When the project list fails the saved copy is kept and the download is
 * not tried again for an hour; when only the IDA statement fails the projects are saved without
 * paid-out figures and the last IDA copy is kept.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import {
  IDA_CREDITS_PAGE,
  WB_PROJECTS_PAGE,
  idaByProject,
  idaCreditsPageUrl,
  parseIdaPage,
  parseProjectsPage,
  projectsPageUrl,
  type WbProject,
  type WbProjectsPull,
} from '../../utils/wbProjects';

const HOUR = 60 * 60 * 1000;
const MAX_AGE = 7 * 24 * HOUR;
const TIMEOUT_MS = 90_000;
const FILE = 'wb-projects.json';
/** Safety limits: about 2,000 active projects and 12,000 IDA rows today. */
const MAX_PROJECT_PAGES = 10;
const MAX_IDA_PAGES = 40;

let memory: { pull: WbProjectsPull | null; triedAt: number } | null = null;
let inFlight: Promise<WbProjectsPull | null> | null = null;

export function loadWbProjects(): WbProjectsPull | null {
  if (!memory) {
    try {
      const saved = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'live', FILE), 'utf8')) as WbProjectsPull;
      if (saved?.pulledAt && Array.isArray(saved.projects)) memory = { pull: saved, triedAt: Date.parse(saved.pulledAt) };
    } catch {
      // never downloaded
    }
  }
  return memory?.pull ?? null;
}

async function getJson(url: string, what: string): Promise<unknown | null> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      console.warn(`[${what}] refused (HTTP ${res.status}): ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[${what}] ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

async function pullProjects(): Promise<WbProject[] | null> {
  const all: WbProject[] = [];
  for (let page = 0; page < MAX_PROJECT_PAGES; page++) {
    const url = projectsPageUrl(page * WB_PROJECTS_PAGE);
    const got = parseProjectsPage(await getJson(url, 'World Bank projects'));
    if (!got) {
      console.warn(`[World Bank projects] not in the expected layout: ${url}`);
      return null;
    }
    all.push(...got.projects);
    if (!got.projects.length || all.length >= got.total) break;
  }
  return all;
}

async function pullIda(): Promise<Array<Record<string, unknown>> | null> {
  const rows: Array<Record<string, unknown>> = [];
  // Each row once: if the service ignored the page offset, the same rows would come back again and
  // be added twice, which would overstate what was paid out.
  const seen = new Set<string>();
  for (let page = 0; page < MAX_IDA_PAGES; page++) {
    const url = idaCreditsPageUrl(page * IDA_CREDITS_PAGE);
    const got = parseIdaPage(await getJson(url, 'IDA statement of credits'));
    if (!got) {
      console.warn(`[IDA statement of credits] not in the expected layout: ${url}`);
      return null;
    }
    let added = 0;
    for (const r of got) {
      const key = JSON.stringify(r);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(r);
      added++;
    }
    if (got.length < IDA_CREDITS_PAGE || added === 0) break;
  }
  return rows;
}

/** Active projects and IDA amounts; the saved copy when the World Bank does not answer. */
export function fetchWbProjects(opts: { force?: boolean } = {}): Promise<WbProjectsPull | null> {
  const saved = loadWbProjects();
  if (!opts.force) {
    if (saved && Date.now() - Date.parse(saved.pulledAt) < MAX_AGE) return Promise.resolve(saved);
    if (memory && Date.now() - memory.triedAt < HOUR) return Promise.resolve(saved);
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const projects = await pullProjects();
    if (!projects) {
      memory = { pull: saved, triedAt: Date.now() };
      return saved;
    }
    const idaRows = await pullIda();
    const ida = idaRows ? idaByProject(idaRows) : null;
    const now = new Date().toISOString();
    const fresh: WbProjectsPull = {
      pulledAt: now,
      projects,
      ida: ida && Object.keys(ida).length ? ida : (saved?.ida ?? null),
      ...(ida && Object.keys(ida).length ? { idaPulledAt: now } : saved?.idaPulledAt ? { idaPulledAt: saved.idaPulledAt } : {}),
    };
    memory = { pull: fresh, triedAt: Date.now() };
    try {
      fs.mkdirSync(path.join(DATA_DIR, 'live'), { recursive: true });
      writeFileAtomic(path.join(DATA_DIR, 'live', FILE), JSON.stringify(fresh));
    } catch {
      // keep the memory copy
    }
    return fresh;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Tests only. */
export function resetWbProjectsForTests(): void {
  memory = null;
  inFlight = null;
}
