// El documento `index:<mercado>` que lee la página: qué zonas o modelos tienen serie hoy (para los
// selectores) y los mayores movimientos de "misma oferta". El nivel no entra en "movimientos": un
// cambio de mediana puede ser sólo que cambió la mezcla de avisos.
import type {
  MarketIndexModel,
  MarketIndexScope,
  MarketMover,
  MarketPairStats,
  MarketSeriesEntry,
  MarketSeriesIndex,
  MarketVertical,
  MarketWindow,
} from "./types";

export const MARKET_MOVER_MIN_PAIRS = 20;
export const MARKET_MOVERS_PER_SIDE = 8;

export interface MarketIndexInput {
  vertical: MarketVertical;
  today: string;
  generatedAt: string;
  dataAsOf: string;
  previous: MarketSeriesIndex | null;
  entries: readonly MarketSeriesEntry[];
  observations: number;
  excluded: Record<string, number>;
}

type Candidate = { entry: MarketSeriesEntry; stats: MarketPairStats & { chg: number } };

const collator = new Intl.Collator("es", { sensitivity: "base" });

export function buildMarketIndex(input: MarketIndexInput): MarketSeriesIndex {
  const trackingSince =
    input.previous?.trackingSince && input.previous.trackingSince < input.today ? input.previous.trackingSince : input.today;
  const scopes = new Map<string, MarketIndexScope>();
  const models: MarketIndexModel[] = [];
  const pool: MarketSeriesEntry[] = [];

  for (const entry of input.entries) {
    const { dims } = entry.cohort;
    if (dims.vertical === "autos") {
      if (dims.scope === "model" && dims.marketSlug) {
        models.push({
          slug: dims.marketSlug,
          brand: entry.labels.brand ?? dims.marketSlug,
          model: entry.labels.model ?? "",
          n: entry.point.n,
          med: entry.point.med,
          w30: entry.point.w30?.chg ?? null,
        });
        pool.push(entry);
      }
      continue;
    }
    if (dims.propertyType !== "todas" || dims.bedrooms !== "any") continue;
    if (dims.scope !== "uy" && dims.scope !== "department" && dims.scope !== "neighborhood") continue;
    const token = entry.cohort.key.split("|")[4]!;
    const scope: MarketIndexScope = scopes.get(token) ?? {
      token,
      scope: dims.scope,
      department: dims.scope === "uy" ? null : entry.labels.department,
      neighborhood: dims.scope === "neighborhood" ? entry.labels.neighborhood : null,
      label: entry.label,
      n: {},
    };
    scope.n[dims.currency] = entry.point.n;
    scopes.set(token, scope);
    if (dims.scope !== "uy") pool.push(entry);
  }

  const rank = (scope: MarketIndexScope): number => (scope.scope === "uy" ? 0 : 1);
  const sortedScopes = [...scopes.values()].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      collator.compare(a.department ?? "", b.department ?? "") ||
      (a.scope === "department" ? 0 : 1) - (b.scope === "department" ? 0 : 1) ||
      collator.compare(a.neighborhood ?? "", b.neighborhood ?? ""),
  );
  models.sort((a, b) => collator.compare(a.brand, b.brand) || collator.compare(a.model, b.model));

  let window: MarketWindow | null = null;
  let candidates: Candidate[] = [];
  for (const option of [30, 7] as const) {
    const found = pool
      .map(entry => ({ entry, stats: entry.point[`w${option}`] }))
      .filter((row): row is Candidate => !!row.stats && row.stats.chg !== null && row.stats.n >= MARKET_MOVER_MIN_PAIRS);
    if (found.length) {
      window = option;
      candidates = found;
      break;
    }
  }
  const mover = ({ entry, stats }: Candidate): MarketMover => ({
    key: entry.cohort.key,
    label: entry.label,
    currency: entry.cohort.dims.currency,
    window: window!,
    chg: stats.chg,
    pairs: stats.n,
    down: stats.down,
    up: stats.up,
  });
  const byKey = (a: Candidate, b: Candidate): number => (a.entry.cohort.key < b.entry.cohort.key ? -1 : 1);
  const down = candidates
    .filter(row => row.stats.chg < 0)
    .sort((a, b) => a.stats.chg - b.stats.chg || byKey(a, b))
    .slice(0, MARKET_MOVERS_PER_SIDE)
    .map(mover);
  const up = candidates
    .filter(row => row.stats.chg > 0)
    .sort((a, b) => b.stats.chg - a.stats.chg || byKey(a, b))
    .slice(0, MARKET_MOVERS_PER_SIDE)
    .map(mover);

  return {
    key: `index:${input.vertical}`,
    vertical: input.vertical,
    day: input.today,
    generatedAt: input.generatedAt,
    dataAsOf: input.dataAsOf,
    trackingSince,
    observations: input.observations,
    cohorts: input.entries.length,
    excluded: input.excluded,
    scopes: sortedScopes,
    models,
    movers: { window, down, up },
  };
}
