/**
 * Country snapshot for outside systems (console integration item 6): every figure the app holds for
 * one country, read from what the daily download saved, with no council run needed. Each value
 * carries its source, the period it refers to, a validation badge and the shareable flag from the
 * licence register. A figure with no source reads Missing, with the reason; nothing is filled in.
 *
 * Pure: the server hands in what it has read, so the tests can feed recorded inputs.
 */
import { iso2For } from '../data/iso3166Alpha2';
import { seriesSummary, type SeriesSet } from '../utils/seriesHistory';
import { shareableSource, type ValueBadge } from '../utils/consoleEvents';
import type { PanelCell } from '../utils/panelTable';
import type { SignalStates } from './eventSources';

export interface SnapshotValue {
  id: string;
  label: string;
  unit: string;
  status: 'Live' | 'Missing';
  value: number | null;
  /** The period the value refers to (YYYY, YYYY-Qn, YYYY-MM or a date). */
  as_of: string | null;
  source: string | null;
  badge: ValueBadge | null;
  shareable: boolean;
  /** feed: a public source the daily download reads; own_file: a file you loaded (Menu > Your data). */
  origin?: 'feed' | 'own_file';
  pulled_at?: string;
  /** Later IMF projection years exist up to this period; the value above is the latest outturn. */
  projected_to?: string;
  reason?: string;
}

export interface SnapshotSignal {
  signal: string;
  label: string;
  state: string;
  as_of: string;
  source: string;
  badge: ValueBadge;
  shareable: boolean;
}

export interface CountrySnapshot {
  country: { iso2: string | null; iso3: string; name: string };
  generated_at: string;
  figures: SnapshotValue[];
  series: SnapshotValue[];
  signals: SnapshotSignal[];
  council: { run_id: string | null; note: string };
  sharing_mode: boolean;
  note: string;
}

const SIGNAL_LABEL: Record<string, string> = {
  cycle_clock: 'Policy cycle',
  cftc_crowding: 'CFTC positioning',
  regime_quadrant: 'Growth and inflation regime',
};

export const HELD_BACK = 'Held back: sharing mode is on and the source does not allow passing this value on.';

/** In sharing mode, a value whose source does not allow passing it on is held back, with the reason. */
function share(v: SnapshotValue, sharingMode: boolean): SnapshotValue {
  if (!sharingMode || v.shareable || v.status !== 'Live') return v;
  return { ...v, value: null, reason: HELD_BACK };
}

export function buildCountrySnapshot(input: {
  iso3: string;
  name: string;
  cells: PanelCell[];
  series: SeriesSet;
  signals: SignalStates | null;
  badges: Record<string, ValueBadge>;
  sharingMode: boolean;
  councilRunId: string | null;
  now?: Date;
}): CountrySnapshot {
  const { iso3, sharingMode } = input;
  const figures: SnapshotValue[] = input.cells.map((c) =>
    share(
      c.status === 'Live'
        ? { id: c.figureId, label: c.figure, unit: c.unit, status: 'Live', value: c.value, as_of: c.period || null, source: c.source, badge: 'official', shareable: shareableSource(c.source), origin: 'feed' }
        : { id: c.figureId, label: c.figure, unit: c.unit, status: 'Missing', value: null, as_of: null, source: null, badge: null, shareable: false, reason: c.reason || 'No source answered' },
      sharingMode
    )
  );
  const series: SnapshotValue[] = [
    ...input.series.series.map((s) => {
      const sum = seriesSummary(s);
      const own = Boolean(s.own);
      const v: SnapshotValue = {
        id: s.id,
        label: s.label,
        unit: s.unit,
        status: sum.latest === undefined ? 'Missing' : 'Live',
        value: sum.latest ?? null,
        as_of: sum.last ?? null,
        source: s.source,
        // A file you loaded is not a published figure: no badge says it was checked.
        badge: own ? 'not_validated' : 'official',
        shareable: own ? false : shareableSource(s.source),
        origin: own ? 'own_file' : 'feed',
        ...(s.pulledAt ? { pulled_at: s.pulledAt } : {}),
        ...(sum.projectedTo ? { projected_to: sum.projectedTo } : {}),
        ...(sum.latest === undefined ? { reason: 'The saved series has no values.' } : {}),
      };
      return share(v, sharingMode);
    }),
    ...input.series.missing.map((m): SnapshotValue => ({ id: m.id, label: m.label, unit: '', status: 'Missing', value: null, as_of: null, source: null, badge: null, shareable: false, reason: m.reason })),
  ];
  const signals: SnapshotSignal[] = Object.entries(input.signals ?? {})
    .filter(([k]) => k.startsWith(`${iso3}:`))
    .map(([k, s]) => {
      const signal = k.slice(iso3.length + 1);
      return { signal, label: SIGNAL_LABEL[signal] ?? signal, state: s.state, as_of: s.asOf, source: s.source, badge: input.badges[signal] ?? 'not_validated', shareable: shareableSource(s.source) };
    });
  return {
    country: { iso2: iso2For(iso3) ?? null, iso3, name: input.name },
    generated_at: (input.now ?? new Date()).toISOString(),
    figures,
    series,
    signals,
    council: {
      run_id: input.councilRunId,
      note: input.councilRunId ? 'The council answer is at /api/v1/integration/bundle/' + iso3 + ' (read:council).' : 'No council run on this country yet. The figures above do not need one.',
    },
    sharing_mode: sharingMode,
    note: 'Read from what the daily download saved; this call never fetches. Missing means no source answered, with the reason.',
  };
}
