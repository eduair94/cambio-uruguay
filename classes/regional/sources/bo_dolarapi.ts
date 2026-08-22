// Bolivia — DolarAPI Bolivia.
//
// Bolivia is the case that proves why the board separates `official` from
// `parallel`. The boliviano has been pegged at 6,96 per dollar since 2011 and
// the official rate barely moves; what people actually transact at is the
// parallel/crypto price, which has run far above it. Publishing only the
// official number would be publishing a rate almost nobody can buy at, and
// publishing only the parallel one would be dropping the legal reference — so
// both are on the board, labelled, with the gap between them computed.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalKind, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "bo_dolarapi",
  name: "DolarAPI Bolivia",
  country: "BO",
  url: "https://bo.dolarapi.com",
  access: "api",
  publisher: "market-data",
  covers: "Dólar oficial boliviano y el precio paralelo (Binance P2P), que es donde se ve la brecha real.",
};

const URL = "https://bo.dolarapi.com/v1/dolares";

interface Row {
  moneda?: string;
  casa?: string;
  nombre?: string;
  compra?: number | null;
  venta?: number | null;
  fechaActualizacion?: string;
}

const MARKETS: Record<string, { market: string; label: string; kind: RegionalKind }> = {
  oficial: { market: "oficial", label: "Dólar oficial", kind: "official" },
  binance: { market: "paralelo", label: "Dólar paralelo (Binance P2P)", kind: "parallel" },
  paralelo: { market: "paralelo", label: "Dólar paralelo", kind: "parallel" },
};

export function parseBoDolarApi(rows: Row[] | null): RegionalQuote[] {
  if (!Array.isArray(rows)) return [];
  const quotes: RegionalQuote[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const spec = MARKETS[String(row.casa || "").toLowerCase()];
    if (!spec) continue;
    const quote = makeQuote({
      country: "BO",
      market: spec.market,
      label: spec.label,
      kind: spec.kind,
      base: "USD",
      quote: "BOB",
      buy: row.compra,
      sell: row.venta,
      updatedAt: row.fechaActualizacion,
      source: meta.id,
      sourceUrl: URL,
    });
    if (!quote || seen.has(quote.id)) continue;
    seen.add(quote.id);
    quotes.push(quote);
  }
  return quotes;
}

export async function fetchBoDolarApi(): Promise<RegionalQuote[]> {
  return parseBoDolarApi(await fetchJson<Row[]>(URL));
}
