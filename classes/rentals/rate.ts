// The USD reference the whole run shares.
//
// Half the Uruguayan rental market quotes in dollars and half in pesos, so nothing on the page —
// not a filter, not a sort, not "el alquiler típico en Pocitos" — works until both are expressed in
// the same currency. We use the MEDIAN selling rate of the casas de cambio (the rate a tenant
// actually pays to buy the dollars), never the BCU or the interbank rate.
import { fetchJson } from "./net";

// The API host, NOT the site: `cambio-uruguay.com/api/` is the Nuxt app's own route namespace and
// answers 404 for the rate rows. The Express API lives on its own subdomain.
export const RENTALS_RATE_API = (process.env.RENTALS_RATE_API || "https://api.cambio-uruguay.com").replace(/\/+$/, "");

export interface RateRow {
  code?: string;
  origin?: string;
  type?: string;
  sell?: number | string;
}

/** Rate rows that are NOT what a person pays at a counter. */
const NOT_A_COUNTER_RATE = ["INTERBANCARIO", "PROMED.FONDO", "CABLE"];

/**
 * Median USD selling rate across the casas. Pure, so the filter is testable: the public rate feed
 * is one flat array with every currency and every rate TYPE interleaved, and picking the wrong
 * rows (the BCU's, or the interbank one) shifts every converted rent on the page.
 */
export function medianUsdSell(rows: readonly RateRow[] | null | undefined): number {
  const sells = (rows || [])
    .filter(
      (row) =>
        row.code === "USD" &&
        row.origin !== "bcu" &&
        !NOT_A_COUNTER_RATE.includes(row.type || "") &&
        Number(row.sell) > 0
    )
    .map((row) => Number(row.sell))
    .sort((a, b) => a - b);
  if (!sells.length) return 0;
  const middle = Math.floor(sells.length / 2);
  return sells.length % 2 ? sells[middle]! : (sells[middle - 1]! + sells[middle]!) / 2;
}

export async function fetchUsdUyuRate(): Promise<number> {
  const configured = Number(process.env.RENTALS_USD_UYU);
  if (Number.isFinite(configured) && configured > 0) return configured;

  const rows = await fetchJson<RateRow[]>(`${RENTALS_RATE_API}/`, {
    timeoutMs: 25_000,
    retries: 1,
    unthrottled: true,
  });
  return medianUsdSell(rows);
}
