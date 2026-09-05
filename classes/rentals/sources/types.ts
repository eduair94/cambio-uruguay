import type { RawRental, RentalSource } from "../types";

/**
 * What every harvester returns. `ok: false` is a first-class outcome: the run keeps going, the
 * page says which portal is missing, and the previous data for that portal is preserved instead of
 * being deleted as "gone from the market".
 */
export interface RentalSourceResult {
  key: RentalSource;
  ok: boolean;
  /** No collection is attempted when the directory is available only for external consultation. */
  access?: "external_only";
  /** False for partial coverage: missing offers must not expire on its evidence. */
  complete?: boolean;
  listings: RawRental[];
  note: string;
}

/** Only a complete full sweep can interpret an advert's absence as evidence. */
export function sourcesAllowingExpiry(runs: RentalSourceResult[], mode: "full" | "fast"): Set<RentalSource> {
  return new Set(mode === "full" ? runs.filter((run) => run.ok && run.complete === true).map((run) => run.key) : []);
}
