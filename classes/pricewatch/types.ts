// Shared shape for the daily price point recorded per offer. Kept separate from record.ts so
// classes/models/PricewatchOffer.ts (which record.ts does not need to import) can reference it
// without pulling in the Mongo pipeline code.

/** One day, one price. `lp` (list price) is null on the days a seller shows no crossed-out price. */
export interface PricewatchPoint {
  d: string;
  p: number;
  lp: number | null;
}
