import type { CouncilAssessmentRun, SupremeCouncilOutput } from '../types/council';

/**
 * The council's final report, only when an AI model wrote it in a council run. Every country starts
 * with a built-in report (template text and a verdict) that the older desks still read; it is not a
 * result and must not appear in memos, notes or briefs as one.
 */
/** Shown where the council's agreement would go: nothing in the app measures it, so it is never a built-in number. */
export const COHERENCE_MISSING = 'Missing (the council does not measure agreement yet)';

/** The council's agreement as a percentage, or Missing with the reason. */
export function coherenceText(sc: Pick<SupremeCouncilOutput, 'globalCoherenceScore'> | null | undefined): string {
  const v = sc?.globalCoherenceScore;
  return typeof v === 'number' && Number.isFinite(v) ? `${Math.round(v * 100)}%` : COHERENCE_MISSING;
}

/** The composite risk score as "0.62 / 1.00" (or out of 100), or Missing when there is no report. */
export function compositeText(sc: Pick<SupremeCouncilOutput, 'compositeRiskScore'> | null | undefined, outOf: 1 | 100 = 1): string {
  const v = sc?.compositeRiskScore;
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'Missing (no council report yet)';
  return outOf === 100 ? `${Math.round(v * 100)}/100` : `${v.toFixed(2)} / 1.00`;
}

export function modelCouncil(run: Pick<CouncilAssessmentRun, 'supremeCouncil'> | null | undefined): SupremeCouncilOutput | undefined {
  const sc = run?.supremeCouncil;
  return sc && sc.fromModel === true ? sc : undefined;
}
