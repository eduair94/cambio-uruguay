// Global fallback — open.er-api.com (ExchangeRate-API's key-free endpoint).
//
// One request returns the dollar against every currency on the board. It is a
// mid-market reference, not a price anybody trades at, and it is deliberately
// the LOWEST-priority source: when a central bank answers, the central bank
// wins. It earns its place for two jobs neither of which a national source can
// do:
//
//   * a country whose source is down still has a line on the board, marked as a
//     third-party reference rather than silently missing;
//   * every national number has something independent to be checked against, so
//     a parser that starts returning a number 10x off is caught by arithmetic
//     rather than by somebody noticing.
//
// It updates once a day, so it is never the freshest number and the board must
// not present it as one.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalCountry, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "world_erapi",
  name: "ExchangeRate-API (open)",
  country: "UY",
  url: "https://www.exchangerate-api.com/docs/free",
  access: "api",
  publisher: "market-data",
  covers: "Referencia diaria del dólar contra todas las monedas de la región. Se usa como respaldo cuando una fuente nacional no responde y como control cruzado de las demás.",
};

const URL = "https://open.er-api.com/v6/latest/USD";

interface ErApiResponse {
  result?: string;
  time_last_update_utc?: string;
  base_code?: string;
  rates?: Record<string, number>;
}

/** Currency -> the country whose board row it belongs to. */
const COUNTRY_OF: Record<string, RegionalCountry> = {
  ARS: "AR",
  BRL: "BR",
  CLP: "CL",
  PYG: "PY",
  BOB: "BO",
  UYU: "UY",
};

export function parseErApi(payload: ErApiResponse | null): RegionalQuote[] {
  const rates = payload?.rates;
  if (!rates) return [];
  const at = payload?.time_last_update_utc;
  const quotes: RegionalQuote[] = [];
  for (const [code, country] of Object.entries(COUNTRY_OF)) {
    const value = rates[code];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    const quote = makeQuote({
      country,
      market: "internacional",
      label: "Referencia internacional (mid-market)",
      kind: "reference",
      base: "USD",
      quote: code,
      avg: value,
      updatedAt: at,
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export async function fetchWorldErApi(): Promise<RegionalQuote[]> {
  return parseErApi(await fetchJson<ErApiResponse>(URL));
}
