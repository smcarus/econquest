/**
 * Peer comparison for a policy review (parked idea PC2, pulled forward by Sam on 13 November 2026):
 * the review country's diagnosis figures beside the same figures for peer countries the user picks,
 * each read from that country's saved pull on or before the review's "As of" day, so every column
 * shows the data as it stood on the same day. For each figure: the peers' median (when two or more
 * peers have it) and where the review country ranks among all the countries that have it.
 *
 * A description, not a judgement: a figure above or below its peers is not good or bad by itself.
 * Browser-safe and pure; the server builds each peer's diagnosis from its archived pull.
 */
import type { Diagnosis } from './reviewDiagnosis';

export const MAX_PEERS = 6;

export interface PeerCell {
  iso3: string;
  value: number | null;
  period: string;
}

export interface PeerRow {
  ref: number;
  field: string;
  group: string;
  label: string;
  unit: string;
  own: number | null;
  ownPeriod: string;
  peers: PeerCell[];
  /** Median of the peers that have the figure, when two or more do. */
  median?: number;
  /** The review country's place among every country with the figure, 1 = highest. */
  rank?: number;
  /** How many countries (review country included) have the figure. */
  of: number;
}

export interface PeerInput {
  iso3: string;
  /** The peer's diagnosis from its pull on or before the As of day, or null with the reason. */
  diagnosis: Diagnosis | null;
  reason?: string;
}

export interface PeerTable {
  asOf: string;
  peers: Array<{ iso3: string; pullDate?: string; missing?: string }>;
  rows: PeerRow[];
}

const round = (n: number) => Math.round(n * 100) / 100;

export function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

/** Up to MAX_PEERS distinct three-letter codes, without the review country. */
export function parsePeerList(raw: unknown, own: string): string[] {
  const list = String(raw ?? '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((x) => /^[A-Z]{3}$/.test(x) && x !== own);
  return [...new Set(list)].slice(0, MAX_PEERS);
}

export function peerTable(own: Diagnosis, peers: PeerInput[]): PeerTable {
  const rows: PeerRow[] = own.figures.map((f) => {
    const cells: PeerCell[] = peers.map((p) => {
      const x = p.diagnosis?.figures.find((y) => y.field === f.field);
      return { iso3: p.iso3, value: x?.value ?? null, period: x?.value != null ? x.period : '' };
    });
    const peerVals = cells.flatMap((c) => (c.value === null ? [] : [c.value]));
    const all = f.value === null ? peerVals : [f.value, ...peerVals];
    const med = peerVals.length >= 2 ? median(peerVals) : undefined;
    return {
      ref: f.ref,
      field: f.field,
      group: f.group,
      label: f.label,
      unit: f.unit,
      own: f.value,
      ownPeriod: f.value === null ? '' : f.period,
      peers: cells,
      ...(med !== undefined ? { median: med } : {}),
      ...(f.value !== null && peerVals.length ? { rank: 1 + peerVals.filter((v) => v > f.value!).length } : {}),
      of: all.length,
    };
  });
  return {
    asOf: own.asOf,
    peers: peers.map((p) => ({ iso3: p.iso3, ...(p.diagnosis ? { pullDate: p.diagnosis.pullDate } : { missing: p.reason || 'no saved pull' }) })),
    rows,
  };
}
