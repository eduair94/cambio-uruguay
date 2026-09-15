// classes/combustibles/api.ts
import { BASELINE_FUEL_SOURCE_URL } from "./baseline";
import type { FuelRow } from "./parse";
import type { FuelMeta } from "./store";

export interface FuelResponse {
  asOf: string | null;
  sourceUrl: string;
  latest: FuelRow;
  previous: FuelRow | null;
  rows: FuelRow[];
}

export function buildFuelResponse(rows: FuelRow[], meta: FuelMeta | null): FuelResponse {
  const sorted = [...rows].sort((a, b) => a.from.localeCompare(b.from));
  return {
    asOf: meta?.asOf ?? null,
    sourceUrl: meta?.sourceUrl ?? BASELINE_FUEL_SOURCE_URL,
    latest: sorted[sorted.length - 1],
    previous: sorted.length > 1 ? sorted[sorted.length - 2] : null,
    rows: sorted,
  };
}
