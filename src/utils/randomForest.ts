/**
 * Random forest regression (Breiman 2001, Machine Learning 45): many regression trees, each grown
 * on a bootstrap resample of the rows and choosing each split among a random third of the
 * predictors, averaged. Trees catch thresholds and interactions a linear model misses; averaging
 * keeps their noise down. Deterministic: the resamples come from a fixed seed, so every run gives
 * the same forest. Splits minimise the squared error, as scikit-learn's DecisionTreeRegressor.
 * Pure, browser-safe.
 */
import { seededRandom } from './backtest';

export interface ForestParams {
  trees: number;
  maxDepth: number;
  minLeaf: number;
  /** Predictors tried at each split (default: a third of them, at least one). */
  mtry?: number;
  seed: number;
}

type Node = { leaf: number } | { j: number; cut: number; left: Node; right: Node };

export interface Forest {
  trees: Node[];
  /** Out-of-bag root mean square error (each row predicted only by trees that did not see it). */
  oobRmse: number | null;
}

function grow(X: number[][], y: number[], rows: number[], depth: number, p: ForestParams, mtry: number, rand: () => number): Node {
  const mean = rows.reduce((a, i) => a + y[i], 0) / rows.length;
  if (depth >= p.maxDepth || rows.length < 2 * p.minLeaf) return { leaf: mean };
  const k = X[0].length;
  // Random subset of predictors (partial Fisher-Yates).
  const cols = Array.from({ length: k }, (_, j) => j);
  for (let i = 0; i < mtry; i++) {
    const r = i + Math.floor(rand() * (k - i));
    [cols[i], cols[r]] = [cols[r], cols[i]];
  }
  let best: { j: number; cut: number; sse: number } | null = null;
  const total = rows.reduce((a, i) => a + y[i], 0);
  const totalSq = rows.reduce((a, i) => a + y[i] * y[i], 0);
  for (const j of cols.slice(0, mtry)) {
    const sorted = rows.slice().sort((a, b) => X[a][j] - X[b][j]);
    let ls = 0;
    let lsq = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const v = y[sorted[i]];
      ls += v;
      lsq += v * v;
      const nl = i + 1;
      const nr = sorted.length - nl;
      if (nl < p.minLeaf || nr < p.minLeaf) continue;
      const a = X[sorted[i]][j];
      const b = X[sorted[i + 1]][j];
      if (a === b) continue;
      const rs = total - ls;
      const sse = lsq - (ls * ls) / nl + (totalSq - lsq) - (rs * rs) / nr;
      if (!best || sse < best.sse - 1e-12) best = { j, cut: (a + b) / 2, sse };
    }
  }
  if (!best) return { leaf: mean };
  const left = rows.filter((i) => X[i][best!.j] <= best!.cut);
  const right = rows.filter((i) => X[i][best!.j] > best!.cut);
  return { j: best.j, cut: best.cut, left: grow(X, y, left, depth + 1, p, mtry, rand), right: grow(X, y, right, depth + 1, p, mtry, rand) };
}

function predictTree(n: Node, x: number[]): number {
  let node = n;
  while (!('leaf' in node)) node = x[node.j] <= node.cut ? node.left : node.right;
  return node.leaf;
}

export function fitForest(X: number[][], y: number[], p: ForestParams): Forest | { error: string } {
  const n = X.length;
  if (!n || n !== y.length) return { error: 'No rows to fit.' };
  if (n < 2 * p.minLeaf) return { error: `Only ${n} rows; a tree with leaves of ${p.minLeaf} needs at least ${2 * p.minLeaf}.` };
  if ([...y, ...X.flat()].some((v) => !Number.isFinite(v))) return { error: 'A predictor or the target has a gap; rows must be complete.' };
  const k = X[0].length;
  const mtry = Math.max(1, Math.min(k, p.mtry ?? Math.floor(k / 3)));
  const rand = seededRandom(p.seed);
  const trees: Node[] = [];
  const oobSum = Array(n).fill(0);
  const oobN = Array(n).fill(0);
  for (let b = 0; b < p.trees; b++) {
    const rows = Array.from({ length: n }, () => Math.floor(rand() * n));
    const seen = new Set(rows);
    const tree = grow(X, y, rows, 0, p, mtry, rand);
    trees.push(tree);
    for (let i = 0; i < n; i++)
      if (!seen.has(i)) {
        oobSum[i] += predictTree(tree, X[i]);
        oobN[i]++;
      }
  }
  let se = 0;
  let m = 0;
  for (let i = 0; i < n; i++)
    if (oobN[i]) {
      se += (y[i] - oobSum[i] / oobN[i]) ** 2;
      m++;
    }
  return { trees, oobRmse: m ? Math.sqrt(se / m) : null };
}

export function predictForest(f: Forest, x: number[]): number {
  return f.trees.reduce((a, t) => a + predictTree(t, x), 0) / f.trees.length;
}
