// Brasil — AwesomeAPI (economia.awesomeapi.com.br).
//
// Spot market data for the real, refreshed through the trading day, with the
// session high, low and change the central bank's daily fixing cannot give.
// Three things here exist nowhere else in this source set:
//
//   * `USD-BRLT` — the TOURISM dollar, which is what a traveller actually pays
//     at a Brazilian câmbio. It runs several percent above the commercial rate
//     (bid 5.10 / ask 5.50 the day this was written, ≈8%), and quoting the
//     commercial rate to somebody about to change money in Chuí understates the
//     cost by exactly that much.
//   * `ARS-BRL` — a DIRECT peso/real cross, not one we implied through the
//     dollar, so the implied cross can be checked against a traded one.
//   * intraday high/low, which is what makes "el real se movió hoy" a fact.
import { fetchJson } from "../net";
import { makeQuote, parseLocaleNumber } from "../quote";
import type { RegionalKind, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "br_awesomeapi",
  name: "AwesomeAPI",
  country: "BR",
  url: "https://docs.awesomeapi.com.br/api-de-moedas",
  access: "api",
  publisher: "market-data",
  covers: "Dólar comercial y dólar TURISMO (lo que realmente cobra un câmbio), euro y el cruce directo peso argentino/real, con máximo, mínimo y variación del día.",
};

const URL = "https://economia.awesomeapi.com.br/last/USD-BRL,USD-BRLT,EUR-BRL,ARS-BRL";

interface AwesomeRow {
  code?: string;
  codein?: string;
  name?: string;
  high?: string;
  low?: string;
  varBid?: string;
  pctChange?: string;
  bid?: string;
  ask?: string;
  timestamp?: string;
  create_date?: string;
}

interface Spec {
  key: string;
  base: string;
  market: string;
  label: string;
  kind: RegionalKind;
}

const SPECS: Spec[] = [
  { key: "USDBRL", base: "USD", market: "comercial", label: "Dólar comercial", kind: "wholesale" },
  { key: "USDBRLT", base: "USD", market: "turismo", label: "Dólar turismo", kind: "retail" },
  { key: "EURBRL", base: "EUR", market: "comercial", label: "Euro comercial", kind: "wholesale" },
  { key: "ARSBRL", base: "ARS", market: "comercial", label: "Peso argentino (cruce directo)", kind: "reference" },
];

/** Unix seconds -> ISO. AwesomeAPI's `create_date` has no timezone; the stamp does. */
function stampToIso(row: AwesomeRow): string | null {
  const seconds = Number(row.timestamp);
  if (Number.isFinite(seconds) && seconds > 0) return new Date(seconds * 1000).toISOString();
  return row.create_date ? `${row.create_date.replace(" ", "T")}-03:00` : null;
}

export function parseAwesome(payload: Record<string, AwesomeRow> | null): RegionalQuote[] {
  if (!payload) return [];
  const quotes: RegionalQuote[] = [];
  for (const spec of SPECS) {
    const row = payload[spec.key];
    if (!row) continue;
    const quote = makeQuote({
      country: "BR",
      market: spec.market,
      label: spec.label,
      kind: spec.kind,
      base: spec.base,
      quote: "BRL",
      buy: parseLocaleNumber(row.bid, "dot"),
      sell: parseLocaleNumber(row.ask, "dot"),
      high: parseLocaleNumber(row.high, "dot"),
      low: parseLocaleNumber(row.low, "dot"),
      variationPct: parseLocaleNumber(row.pctChange, "dot"),
      updatedAt: stampToIso(row),
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export async function fetchBrAwesome(): Promise<RegionalQuote[]> {
  return parseAwesome(await fetchJson<Record<string, AwesomeRow>>(URL));
}
