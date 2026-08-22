// Argentina — ArgentinaDatos (daily history).
//
// The seven Argentine dollars as daily series, the oficial and blue ones back to
// 2011-01-03. This is the source that makes `GET /regional/history` worth
// calling: a comparison of "the region" that only knows today can describe a
// level but never a trend, and the trend is what a peso/real/guaraní question
// actually turns on.
//
// Not used for the live snapshot: it closes a day and publishes it, so its last
// point is yesterday. Today's price comes from the four live Argentine sources.
//
// Coverage measured on 2026-08-21: oficial/blue/mayorista 5 709 días desde 2011,
// contado con liqui desde 2013, bolsa desde 2018, tarjeta desde 2019, cripto
// desde 2023. A market that did not exist yet has no rows — that is history, not
// a gap to fill.
import { fetchJson } from "../net";
import type { RegionalHistoryPoint, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "ar_argentinadatos",
  name: "ArgentinaDatos",
  country: "AR",
  url: "https://argentinadatos.com",
  access: "api",
  publisher: "market-data",
  covers: "Serie diaria de los siete dólares argentinos; oficial y blue desde enero de 2011.",
};

const BASE = "https://api.argentinadatos.com/v1/cotizaciones/dolares";

/** The markets whose series we store, keyed by the slug this API uses. */
export const AR_HISTORY_MARKETS = [
  "oficial",
  "blue",
  "bolsa",
  "contadoconliqui",
  "mayorista",
  "cripto",
  "tarjeta",
] as const;

export type ArHistoryMarket = (typeof AR_HISTORY_MARKETS)[number];

interface Row {
  casa?: string;
  compra?: number;
  venta?: number;
  fecha?: string;
}

export function parseArHistory(market: ArHistoryMarket, rows: Row[] | null): RegionalHistoryPoint[] {
  if (!Array.isArray(rows)) return [];
  const points: RegionalHistoryPoint[] = [];
  for (const row of rows) {
    const day = String(row.fecha || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const buy = typeof row.compra === "number" && row.compra > 0 ? row.compra : null;
    const sell = typeof row.venta === "number" && row.venta > 0 ? row.venta : null;
    const avg = buy !== null && sell !== null ? (buy + sell) / 2 : (sell ?? buy);
    if (avg === null) continue;
    points.push({
      key: `AR:${market}:USDARS`,
      country: "AR",
      market,
      base: "USD",
      quote: "ARS",
      day,
      buy,
      sell,
      avg,
      source: meta.id,
    });
  }
  return points;
}

/**
 * Full series for one market. `since` trims the payload before it is stored.
 *
 * Returns NULL when the endpoint could not be read, and an empty array when it
 * answered with nothing. The distinction is not pedantry: a run where this
 * publisher rate-limited us logged "0 días" seven times in a row, which reads
 * exactly like "this market has no history" and hid a dead source for a day.
 */
export async function fetchArHistory(
  market: ArHistoryMarket,
  since?: string
): Promise<RegionalHistoryPoint[] | null> {
  const rows = await fetchJson<Row[]>(`${BASE}/${market}`, { timeoutMs: 30_000, retries: 2 });
  if (rows === null) return null;
  const points = parseArHistory(market, rows);
  return since ? points.filter((point) => point.day >= since) : points;
}
