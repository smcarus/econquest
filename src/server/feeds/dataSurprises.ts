/**
 * Data surprises inputs (R9, src/utils/dataSurprises.ts). Daily step world:surprises downloads the
 * BCB Focus monthly IPCA medians, the IPCA outturn (SGS 433), the euro area HICP (Eurostat), the BLS
 * CPI and a snapshot of the Kalshi CPI market, and keeps data/live/surprise-inputs.json. Kalshi
 * snapshots and the day each US CPI outturn was first seen are added to the saved copy, never
 * replaced, so an expectation counts only if it was saved before the release. At most every 6 hours.
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from '../config';
import { describeNetworkError } from '../../utils/connectionCheck';
import { fetchWithTimeout } from '../http';
import { writeFileAtomic } from '../../utils/atomicWrite';
import { eurostatHicpUrl, parseEurostatHicp } from '../../utils/nationalCpi';
import {
  BLS_CPI_URL,
  FOCUS_MONTHLY_URL,
  KALSHI_CPI_URL,
  kalshiImpliedMeans,
  parseBlsCpi,
  parseFocusMonthly,
  parseSgsMonthly,
  sgsUrl,
  stampFirstSeen,
  type Expectation,
  type SurpriseInputs,
} from '../../utils/dataSurprises';

const HOUR = 60 * 60 * 1000;
const TIMEOUT_MS = 90_000;
const FILE = 'surprise-inputs.json';
const KEEP_SNAPSHOTS = 2000;

let saved: { value: SurpriseInputs | null; triedAt: number } | null = null;
let inFlight: Promise<SurpriseInputs | null> | null = null;
const filePath = () => path.join(DATA_DIR, 'live', FILE);

export function loadSurpriseInputs(): SurpriseInputs | null {
  if (!saved) {
    let v: SurpriseInputs | null = null;
    try {
      const x = JSON.parse(fs.readFileSync(filePath(), 'utf8'));
      if (x?.pulledAt) v = { problems: [], ...x };
    } catch {
      // nothing saved yet
    }
    saved = { value: v, triedAt: v ? Date.parse(v.pulledAt) : 0 };
  }
  return saved.value;
}

async function getJson(url: string, what: string, problems: string[]): Promise<unknown | null> {
  try {
    const res = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!res.ok) {
      problems.push(`${what} refused (HTTP ${res.status})`);
      return null;
    }
    return await res.json();
  } catch (e) {
    problems.push(`${what}: ${describeNetworkError(e, TIMEOUT_MS)}`);
    return null;
  }
}

/** Downloads every input when the saved copy is over 6 hours old (an hour after a full miss). */
export function fetchSurpriseInputs(opts: { force?: boolean } = {}): Promise<SurpriseInputs | null> {
  const cur = loadSurpriseInputs();
  const due = opts.force || ((!cur || Date.now() - Date.parse(cur.pulledAt) >= 6 * HOUR) && Date.now() - (saved?.triedAt ?? 0) >= HOUR);
  if (!due) return Promise.resolve(cur);
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const problems: string[] = [];
    const [focusJ, ipcaJ, hicpJ, blsJ, kalshiJ] = await Promise.all([
      getJson(FOCUS_MONTHLY_URL, 'BCB Focus monthly survey', problems),
      getJson(sgsUrl(433), 'BCB SGS 433 (IPCA)', problems),
      getJson(eurostatHicpUrl(['EA'], 240), 'Eurostat euro area HICP', problems),
      getJson(BLS_CPI_URL, 'BLS CPI', problems),
      getJson(KALSHI_CPI_URL, 'Kalshi CPI market', problems),
    ]);
    const focus = focusJ ? parseFocusMonthly(focusJ) : [];
    const ipca = ipcaJ ? parseSgsMonthly(ipcaJ) : [];
    const ea = hicpJ ? parseEurostatHicp(hicpJ).EA ?? [] : [];
    const bls = blsJ ? parseBlsCpi(blsJ) : [];
    const snaps: Expectation[] = kalshiJ ? kalshiImpliedMeans(kalshiJ).map((k) => ({ period: k.period, value: k.mean, at: today })) : [];
    if (focusJ && !focus.length) problems.push('BCB Focus monthly survey answered, but no IPCA median could be read');
    if (blsJ && !bls.length) problems.push('BLS answered, but no CPI months could be read');
    if (kalshiJ && !snaps.length) problems.push('Kalshi answered, but no CPI market ladder could be read');
    if (!focus.length && !ipca.length && !ea.length && !bls.length && !snaps.length && cur) {
      saved = { value: cur, triedAt: Date.now() };
      return cur;
    }
    // Kalshi: one snapshot per day and month forecast; earlier days are kept.
    const keptSnaps = [...(cur?.kalshi ?? []).filter((s) => !snaps.some((n) => n.period === s.period && n.at === s.at)), ...snaps].slice(-KEEP_SNAPSHOTS);
    const next: SurpriseInputs = {
      pulledAt: now.toISOString(),
      focus: focus.length ? focus : cur?.focus,
      ipca: ipca.length ? ipca : cur?.ipca,
      eaHicp: ea.length ? ea : cur?.eaHicp,
      usCpi: bls.length ? stampFirstSeen(cur?.usCpi, bls, today) : cur?.usCpi,
      kalshi: keptSnaps,
      problems,
    };
    try {
      fs.mkdirSync(path.dirname(filePath()), { recursive: true });
      writeFileAtomic(filePath(), JSON.stringify(next));
    } catch {
      // keep the memory copy
    }
    saved = { value: next, triedAt: Date.now() };
    return next;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function resetSurprisesForTests(): void {
  saved = null;
  inFlight = null;
}
