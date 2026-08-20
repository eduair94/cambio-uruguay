import type { RawRental, RentalSource } from "../types";

/**
 * What every harvester returns. `ok: false` is a first-class outcome: the run keeps going, the
 * page says which portal is missing, and the previous data for that portal is preserved instead of
 * being deleted as "gone from the market".
 */
export interface RentalSourceResult {
  key: RentalSource;
  ok: boolean;
  listings: RawRental[];
  note: string;
}
