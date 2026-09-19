import { selectRentalZoneRepresentatives, type RentalZoneMarketObservation } from "./market";

/**
 * Does a neighbourhood attribute show up in what is asked for rent? Computed on the job, stored,
 * never on a request. Unit: an official area with at least MIN_LISTINGS apartments whose built area
 * is explicit; outcome: the median asked rent per built m² (UYU). Between neighbourhoods everything
 * moves together (income, coast, age of the stock), so these are associations, never causes, and
 * the page says so. Bootstrap resampling is seeded: the same inputs give the same numbers.
 */
export const IMPACT_MIN_LISTINGS = 15;
export const IMPACT_MIN_ZONES = 20;
const BOOTSTRAP = 2000;

export const IMPACT_ATTRIBUTES = ["luz", "agua", "alumbrado", "saneamiento", "limpieza", "calles", "denuncias"] as const;
export type ImpactAttribute = typeof IMPACT_ATTRIBUTES[number];

export interface ImpactZone { zone: string; name: string; n: number; rentM2: number }
export interface ImpactAttributeResult {
  attribute: ImpactAttribute;
  zones: number;
  rho: number;
  rhoLow: number;
  rhoHigh: number;
  /** x at the 25th and 75th percentile among the zones. */
  xLow: number;
  xHigh: number;
  /** Change in rent per m² from a zone at xLow to one at xHigh, from a log-linear fit, in %. */
  pct: number;
  pctLow: number;
  pctHigh: number;
  verdict: "lower" | "higher" | "inconclusive";
  points: Array<{ zone: string; x: number; y: number }>;
}
export interface PriceImpact {
  version: 1;
  generatedAt: string;
  rentalDataAsOf: string;
  outcome: "rent-per-built-m2";
  minimumListings: number;
  zones: ImpactZone[];
  attributes: ImpactAttributeResult[];
  joint: { zones: number; r2: number; coefficients: Array<{ attribute: ImpactAttribute; pctPerSd: number; low: number; high: number }> } | null;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b), middle = (sorted.length - 1) / 2;
  return (sorted[Math.floor(middle)] + sorted[Math.ceil(middle)]) / 2;
};
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b), position = (sorted.length - 1) * p;
  const low = Math.floor(position), high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
};
function ranks(values: number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].value === order[i].value) j++;
    for (let k = i; k <= j; k++) result[order[k].index] = (i + j) / 2;
    i = j + 1;
  }
  return result;
}
function pearson(x: number[], y: number[]): number {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}
const spearman = (x: number[], y: number[]) => pearson(ranks(x), ranks(y));
function slope(x: number[], y: number[]): number {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
  return sxx ? sxy / sxx : 0;
}

/** Solves A·x = b by Gaussian elimination with partial pivoting; null when singular. */
function solve(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length, a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = 0; row < n; row++) if (row !== col) {
      const factor = a[row][col] / a[col][col];
      for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}
function inverse(matrix: number[][]): number[][] | null {
  const n = matrix.length, columns: number[][] = [];
  for (let i = 0; i < n; i++) {
    const column = solve(matrix, Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
    if (!column) return null;
    columns.push(column);
  }
  return Array.from({ length: n }, (_, i) => columns.map(column => column[i]));
}

/** OLS with heteroskedasticity-robust (HC1) standard errors. */
function regression(X: number[][], y: number[]): { beta: number[]; se: number[]; r2: number } | null {
  const n = X.length, k = X[0].length;
  const xtx = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((sum, row) => sum + row[i] * row[j], 0)));
  const xty = Array.from({ length: k }, (_, i) => X.reduce((sum, row, r) => sum + row[i] * y[r], 0));
  const inv = inverse(xtx), beta = solve(xtx, xty);
  if (!inv || !beta) return null;
  const residuals = X.map((row, r) => y[r] - row.reduce((sum, value, i) => sum + value * beta[i], 0));
  const meat = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((sum, row, r) => sum + row[i] * row[j] * residuals[r] ** 2, 0)));
  const cov = inv.map(row => Array.from({ length: k }, (_, j) => row.reduce((sum, value, m) => sum + value * meat[m].reduce((s, v, q) => s + v * inv[q][j], 0), 0)));
  const scale = n / (n - k), mean = y.reduce((a, b) => a + b, 0) / n;
  const total = y.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  return { beta, se: cov.map((row, i) => Math.sqrt(Math.max(0, row[i] * scale))), r2: total ? 1 - residuals.reduce((s, v) => s + v * v, 0) / total : 0 };
}

export function buildPriceImpact({ observations, zoneOf, names, attributes, usdUyu, now, rentalDataAsOf }: {
  observations: Iterable<RentalZoneMarketObservation>;
  zoneOf: (propertyKey: string) => string | null;
  names: Readonly<Record<string, string>>;
  attributes: Partial<Record<ImpactAttribute, Readonly<Record<string, number>>>>;
  usdUyu: number;
  now: Date;
  rentalDataAsOf: string;
}): PriceImpact {
  const perZone = new Map<string, number[]>();
  for (const row of selectRentalZoneRepresentatives(observations, { usdUyu, now: now.getTime() })) {
    if (row.propertyType !== "apartamento" || row.areaBuilt === null || row.areaBuilt <= 0) continue;
    const zone = zoneOf(row.propertyKey);
    if (!zone) continue;
    const value = (row.price * (row.currency === "USD" ? usdUyu : 1)) / row.areaBuilt;
    if (!Number.isFinite(value) || value <= 0) continue;
    const list = perZone.get(zone) || [];
    list.push(value);
    perZone.set(zone, list);
  }
  const zones: ImpactZone[] = [...perZone.entries()]
    .filter(([, values]) => values.length >= IMPACT_MIN_LISTINGS)
    .map(([zone, values]) => ({ zone, name: names[zone] || zone, n: values.length, rentM2: round(median(values), 1) }))
    .sort((a, b) => a.zone.localeCompare(b.zone));
  const outcome = new Map(zones.map(zone => [zone.zone, Math.log(zone.rentM2)]));
  const results: ImpactAttributeResult[] = [];
  for (const attribute of IMPACT_ATTRIBUTES) {
    const values = attributes[attribute];
    if (!values) continue;
    const pairs = zones.filter(zone => Number.isFinite(values[zone.zone])).map(zone => ({ zone: zone.zone, x: values[zone.zone], y: outcome.get(zone.zone)! }));
    if (pairs.length < IMPACT_MIN_ZONES) continue;
    const x = pairs.map(pair => pair.x), y = pairs.map(pair => pair.y);
    const xLow = percentile(x, 0.25), xHigh = percentile(x, 0.75);
    const effect = (xs: number[], ys: number[]) => 100 * (Math.exp(slope(xs, ys) * (xHigh - xLow)) - 1);
    const next = random(0x5eed + results.length);
    const rhos: number[] = [], effects: number[] = [];
    for (let b = 0; b < BOOTSTRAP; b++) {
      const index = Array.from({ length: pairs.length }, () => Math.floor(next() * pairs.length));
      const bx = index.map(i => x[i]), by = index.map(i => y[i]);
      rhos.push(spearman(bx, by)); effects.push(effect(bx, by));
    }
    const rhoLow = percentile(rhos, 0.025), rhoHigh = percentile(rhos, 0.975);
    results.push({
      attribute, zones: pairs.length, rho: round(spearman(x, y)), rhoLow: round(rhoLow), rhoHigh: round(rhoHigh),
      xLow: round(xLow, 2), xHigh: round(xHigh, 2), pct: round(effect(x, y), 1),
      pctLow: round(percentile(effects, 0.025), 1), pctHigh: round(percentile(effects, 0.975), 1),
      verdict: rhoHigh < 0 ? "lower" : rhoLow > 0 ? "higher" : "inconclusive",
      points: pairs.map(pair => ({ zone: pair.zone, x: round(pair.x, 2), y: round(Math.exp(pair.y), 1) })),
    });
  }
  let joint: PriceImpact["joint"] = null;
  const used = results.map(result => result.attribute);
  const common = zones.filter(zone => used.every(attribute => Number.isFinite(attributes[attribute]![zone.zone])));
  if (used.length >= 2 && common.length >= used.length + 12) {
    const columns = used.map(attribute => common.map(zone => attributes[attribute]![zone.zone]));
    const standardized = columns.map(column => {
      const mean = column.reduce((a, b) => a + b, 0) / column.length;
      const sd = Math.sqrt(column.reduce((s, v) => s + (v - mean) ** 2, 0) / (column.length - 1)) || 1;
      return column.map(value => (value - mean) / sd);
    });
    const X = common.map((_, r) => [1, ...standardized.map(column => column[r])]);
    const fit = regression(X, common.map(zone => outcome.get(zone.zone)!));
    if (fit) joint = {
      zones: common.length, r2: round(fit.r2),
      coefficients: used.map((attribute, i) => ({
        attribute, pctPerSd: round(100 * (Math.exp(fit.beta[i + 1]) - 1), 1),
        low: round(100 * (Math.exp(fit.beta[i + 1] - 1.96 * fit.se[i + 1]) - 1), 1),
        high: round(100 * (Math.exp(fit.beta[i + 1] + 1.96 * fit.se[i + 1]) - 1), 1),
      })),
    };
  }
  return { version: 1, generatedAt: now.toISOString(), rentalDataAsOf, outcome: "rent-per-built-m2", minimumListings: IMPACT_MIN_LISTINGS, zones, attributes: results, joint };
}
