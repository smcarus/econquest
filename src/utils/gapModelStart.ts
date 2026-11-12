/**
 * Gap model starting point (plan item L2b, Sam's choice 2026-11-08): when the user presses "Fill
 * starting point from latest data", the starting values are copied from the country's saved
 * figures, each with its source and period. Only live figures count (src/utils/dataStatus.ts);
 * a figure the app does not hold is Missing with a reason, never filled with a built-in value.
 * The model's parameters are never filled from here.
 *
 * Browser-safe, pure.
 */
import type { OpenDataSnapshot } from '../types/council';
import { getSnapshotDataStatus } from './dataStatus';
import type { GapStart } from './gapModel';

/** Why a starting value is Missing; the screen words each reason (src/i18n/messages/gapModel.ts). */
export type StartMissing = 'no_imf_gap' | 'no_cpi' | 'no_rate' | 'judgement';

export type StartFill = { key: GapStart; value: number; source: string; period?: string } | { key: GapStart; missing: StartMissing };

export function gapStartFromSnapshot(snapshot: OpenDataSnapshot): StartFill[] {
  const st = getSnapshotDataStatus(snapshot);
  const src = (path: string) => snapshot.liveFields?.[path] || '';
  const year = (path: string) => snapshot.imfIndicators?.years?.[path];
  const out: StartFill[] = [];

  const gap = st.live('imf.outputGapPct');
  out.push(
    gap !== undefined
      ? { key: 'y0', value: gap, source: src('imf.outputGapPct') || 'IMF World Economic Outlook', period: year('imf.outputGapPct') }
      : { key: 'y0', missing: 'no_imf_gap' }
  );

  const cpi = st.live('imf.cpiInflationPct');
  out.push(
    cpi !== undefined
      ? { key: 'p0', value: cpi, source: src('imf.cpiInflationPct') || 'IMF World Economic Outlook', period: year('imf.cpiInflationPct') }
      : { key: 'p0', missing: 'no_cpi' }
  );

  const rate = st.live('market.policyRatePct');
  out.push(
    rate !== undefined
      ? { key: 'i0', value: rate, source: src('market.policyRatePct'), period: snapshot.bisPolicyRate?.date }
      : { key: 'i0', missing: 'no_rate' }
  );

  out.push({ key: 'q0', missing: 'judgement' });
  return out;
}
