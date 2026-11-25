/**
 * Nelder-Mead simplex minimiser (Nelder and Mead 1965, with the standard coefficients of Lagarias,
 * Reeds, Wright and Wright 1998), for the small likelihoods the app fits itself (GARCH, ARMA).
 * Deterministic: the same start always gives the same answer. Pure, browser-safe.
 */
export interface MinimiseResult {
  x: number[];
  f: number;
  iterations: number;
  converged: boolean;
}

export function nelderMead(fn: (x: number[]) => number, start: number[], opts: { step?: number; maxIter?: number; tol?: number } = {}): MinimiseResult {
  const n = start.length;
  const step = opts.step ?? 0.1;
  const maxIter = opts.maxIter ?? 2000 * n;
  const tol = opts.tol ?? 1e-10;
  const safe = (x: number[]) => {
    const v = fn(x);
    return Number.isFinite(v) ? v : Infinity;
  };
  let simplex: number[][] = [start.slice()];
  for (let i = 0; i < n; i++) {
    const p = start.slice();
    p[i] = p[i] !== 0 ? p[i] * (1 + step) : step;
    simplex.push(p);
  }
  let values = simplex.map(safe);
  let it = 0;
  let converged = false;
  for (; it < maxIter; it++) {
    const order = values.map((v, i) => i).sort((a, b) => values[a] - values[b]);
    simplex = order.map((i) => simplex[i]);
    values = order.map((i) => values[i]);
    const spread = Math.abs(values[n] - values[0]);
    const size = Math.max(...simplex.slice(1).map((p) => Math.max(...p.map((v, j) => Math.abs(v - simplex[0][j])))));
    if (spread <= tol * (Math.abs(values[0]) + tol) && size <= 1e-8 * (1 + Math.max(...simplex[0].map(Math.abs)))) {
      converged = true;
      break;
    }
    const centroid = Array.from({ length: n }, (_, j) => simplex.slice(0, n).reduce((a, p) => a + p[j], 0) / n);
    const at = (t: number) => centroid.map((c, j) => c + t * (simplex[n][j] - c));
    const xr = at(-1);
    const fr = safe(xr);
    if (fr < values[0]) {
      const xe = at(-2);
      const fe = safe(xe);
      if (fe < fr) {
        simplex[n] = xe;
        values[n] = fe;
      } else {
        simplex[n] = xr;
        values[n] = fr;
      }
    } else if (fr < values[n - 1]) {
      simplex[n] = xr;
      values[n] = fr;
    } else {
      const outside = fr < values[n];
      const xc = at(outside ? -0.5 : 0.5);
      const fc = safe(xc);
      if (fc < (outside ? fr : values[n])) {
        simplex[n] = xc;
        values[n] = fc;
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          values[i] = safe(simplex[i]);
        }
      }
    }
  }
  const best = values.indexOf(Math.min(...values));
  return { x: simplex[best], f: values[best], iterations: it, converged };
}

/** Repeated Nelder-Mead restarts from the last best point, which helps on long, flat valleys. */
export function minimise(fn: (x: number[]) => number, start: number[], restarts = 3, opts: { step?: number; maxIter?: number; tol?: number } = {}): MinimiseResult {
  let r = nelderMead(fn, start, opts);
  for (let k = 1; k < restarts; k++) {
    const next = nelderMead(fn, r.x, opts);
    const improved = next.f < r.f - 1e-12;
    r = next.f <= r.f ? next : r;
    if (!improved) break;
  }
  return r;
}
