// Shared shape for the daily price point recorded per offer. Kept separate from record.ts so
// classes/models/PricewatchOffer.ts (which record.ts does not need to import) can reference it
// without pulling in the Mongo pipeline code.

/** One day, one price. `lp` (list price) is null on the days a seller shows no crossed-out price.
 * `c` (currency, "UYU"/"USD") was added 2026-09-17, additive and optional for backward compatibility:
 * points written before this field existed simply omit it. The reader that cares about mixing
 * currencies across days (`classes/priceevents/analyze.ts`) treats a missing `c` as "unknown" rather
 * than filtering on it — the ratio-plausibility guard in that same file is the safety net for a point
 * whose currency we can't check this way. */
export interface PricewatchPoint {
  d: string;
  p: number;
  lp: number | null;
  c?: "UYU" | "USD";
}
