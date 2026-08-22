// Argentina — Bluelytics.
//
// Second, independent reading of the two rates that matter most (official and
// blue), which is the whole point of keeping it: when two publishers that survey
// different casas agree on the blue to within a percent, the number is a market
// price; when they diverge, one of them is quoting a stale board and the
// snapshot says so instead of averaging the disagreement away.
//
// It is also the only free source here that publishes a BLUE euro — the street
// price of the euro in Buenos Aires, which no central bank prints.
import { makeQuote } from "../quote";
import { fetchJson } from "../net";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "ar_bluelytics",
  name: "Bluelytics",
  country: "AR",
  url: "https://bluelytics.com.ar",
  access: "api",
  publisher: "market-data",
  covers: "Dólar oficial y blue con promedio propio, más el euro blue (el único precio de calle del euro que se publica).",
};

const URL = "https://api.bluelytics.com.ar/v2/latest";

interface Leg {
  value_avg?: number;
  value_sell?: number;
  value_buy?: number;
}

interface BluelyticsResponse {
  oficial?: Leg;
  blue?: Leg;
  oficial_euro?: Leg;
  blue_euro?: Leg;
  last_update?: string;
}

export async function fetchArBluelytics(): Promise<RegionalQuote[]> {
  const data = await fetchJson<BluelyticsResponse>(URL);
  if (!data) return [];
  const at = data.last_update;

  const legs: Array<[Leg | undefined, string, string, "official" | "parallel", string]> = [
    [data.oficial, "oficial", "USD", "official", "Dólar oficial"],
    [data.blue, "blue", "USD", "parallel", "Dólar blue"],
    [data.oficial_euro, "oficial", "EUR", "official", "Euro oficial"],
    [data.blue_euro, "blue", "EUR", "parallel", "Euro blue"],
  ];

  const quotes: RegionalQuote[] = [];
  for (const [leg, market, base, kind, label] of legs) {
    if (!leg) continue;
    const quote = makeQuote({
      country: "AR",
      market,
      label,
      kind,
      base,
      quote: "ARS",
      buy: leg.value_buy,
      sell: leg.value_sell,
      avg: leg.value_avg,
      updatedAt: at,
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}
