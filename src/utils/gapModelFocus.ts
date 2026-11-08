/**
 * Small gap model > "Ask the council about this run" (plan item L2c): the run as an Explain focus
 * (src/utils/explain.ts), labelled "Your model" so the council treats every number as the user's
 * own assumption, never as a published figure or a forecast. No AI call is made until the user
 * presses the button and sends the question.
 *
 * Browser-safe, pure.
 */
import type { ExplainFocus } from './explain';
import { GAP_PARAMS, type GapPoint, type GapResult, type GapShock } from './gapModel';

const n = (v: number) => String(Math.round(v * 100) / 100);
const point = (r: GapPoint) => `output gap ${n(r.y)}%, inflation ${n(r.p)}%, policy rate ${n(r.i)}%, exchange-rate gap ${n(r.q)}%`;
const VAR: Record<GapShock['variable'], string> = { y: 'output gap', p: 'inflation', i: 'policy rate', q: 'exchange-rate gap' };

export function gapRunFocus(run: Extract<GapResult, { ok: true }>, shocks: GapShock[], iso3: string, countryName: string): ExplainFocus {
  const last = run.path[run.path.length - 1]!;
  const half = Math.ceil(GAP_PARAMS.length / 2);
  const params = GAP_PARAMS.map((k) => `${k} ${n(run.params[k])}`);
  const mid = run.path[Math.floor((run.path.length - 1) / 2)]!;
  return {
    kind: 'panel',
    label: 'Your model: small gap model run',
    source: "Your model: the user's own parameters and starting point, not published figures and not a forecast",
    iso3,
    countryName,
    detail: [
      `Your parameters (1 of 2): ${params.slice(0, half).join(', ')}`,
      `Your parameters (2 of 2): ${params.slice(half).join(', ')}`,
      `Starting point, quarter 0: ${point(run.path[0]!)}`,
      shocks.length ? `Your shocks: ${shocks.map((s) => `${s.size >= 0 ? '+' : ''}${n(s.size)} points to ${VAR[s.variable]} in quarter ${s.quarter}`).join('; ')}` : 'No shocks added',
      `Quarter ${last.quarter}, the last: ${point(last)}`,
      ...(run.unstable
        ? [`The settings explode after quarter ${last.quarter}, so the path stops there`]
        : mid.quarter > 0 && mid.quarter < last.quarter
          ? [`Quarter ${mid.quarter}: ${point(mid)}`]
          : []),
      'Equations (1 of 2): output gap y = b1 y(-1) - b2 [i(-1) - p(-1) - rStar] + b3 q(-1); inflation p = c1 p(-1) + (1 - c1) pStar + c2 y(-1) + c3 [q(-1) - q(-2)]',
      'Equations (2 of 2): policy rate i = rho i(-1) + (1 - rho) [rStar + pStar + phiP (p - pStar) + phiY y]; exchange-rate gap q = d1 q(-1) - d2 (i - iForeign)',
    ],
  };
}
