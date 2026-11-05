import type { CouncilAssessmentRun, SupremeCouncilOutput } from '../types/council';

/**
 * The council's final report, only when an AI model wrote it in a council run. Every country starts
 * with a built-in report (template text and a verdict) that the older desks still read; it is not a
 * result and must not appear in memos, notes or briefs as one.
 */
export function modelCouncil(run: Pick<CouncilAssessmentRun, 'supremeCouncil'> | null | undefined): SupremeCouncilOutput | undefined {
  const sc = run?.supremeCouncil;
  return sc && sc.fromModel === true ? sc : undefined;
}
