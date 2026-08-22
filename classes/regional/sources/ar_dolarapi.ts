// Argentina — dolarapi.com.
//
// The one endpoint that returns all seven Argentine dollars in one shape.
// Argentina does not have "a" dollar: it has an official rate, a street rate
// (blue), two market-priced legal ones (MEP/bolsa and contado con liquidación),
// a wholesale rate, a crypto rate and a card rate that carries the tax load. A
// page that shows one of them and calls it "the dollar in Argentina" is wrong
// six times out of seven, so the board carries all of them and labels each.
//
// The same publisher's `/v1/cotizaciones` adds the other currencies priced in
// pesos (EUR, BRL, CLP, UYU) — that is where the ARS/UYU leg comes from, and it
// is the only free source that publishes it as a market price rather than as a
// derived cross.
import { makeQuote } from "../quote";
import { fetchJson } from "../net";
import type { RegionalKind, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "ar_dolarapi",
  name: "DolarAPI",
  country: "AR",
  url: "https://dolarapi.com",
  access: "api",
  publisher: "market-data",
  covers: "Los siete dólares argentinos (oficial, blue, bolsa, CCL, mayorista, cripto y tarjeta) más euro, real, peso chileno y peso uruguayo en pesos argentinos.",
};

const DOLARES_URL = "https://dolarapi.com/v1/dolares";
const COTIZACIONES_URL = "https://dolarapi.com/v1/cotizaciones";

interface DolarApiRow {
  moneda?: string;
  casa?: string;
  nombre?: string;
  compra?: number | null;
  venta?: number | null;
  fechaActualizacion?: string;
}

/** Market slug -> what kind of price it is, and how the board should call it. */
const MARKETS: Record<string, { kind: RegionalKind; label: string }> = {
  oficial: { kind: "official", label: "Dólar oficial" },
  blue: { kind: "parallel", label: "Dólar blue" },
  bolsa: { kind: "financial", label: "Dólar MEP (bolsa)" },
  contadoconliqui: { kind: "financial", label: "Contado con liquidación" },
  mayorista: { kind: "wholesale", label: "Dólar mayorista" },
  cripto: { kind: "financial", label: "Dólar cripto" },
  tarjeta: { kind: "card", label: "Dólar tarjeta" },
};

/** Currencies `/v1/cotizaciones` prices in pesos, with the label the board uses. */
const CROSS_CURRENCIES: Record<string, string> = {
  EUR: "Euro oficial",
  BRL: "Real oficial",
  CLP: "Peso chileno oficial",
  UYU: "Peso uruguayo oficial",
};

export async function fetchArDolarApi(): Promise<RegionalQuote[]> {
  const [dolares, cotizaciones] = await Promise.all([
    fetchJson<DolarApiRow[]>(DOLARES_URL),
    fetchJson<DolarApiRow[]>(COTIZACIONES_URL),
  ]);

  const quotes: RegionalQuote[] = [];

  for (const row of Array.isArray(dolares) ? dolares : []) {
    const market = String(row.casa || "").toLowerCase();
    const spec = MARKETS[market];
    if (!spec) continue;
    const quote = makeQuote({
      country: "AR",
      market,
      label: spec.label,
      kind: spec.kind,
      base: "USD",
      quote: "ARS",
      buy: row.compra,
      sell: row.venta,
      updatedAt: row.fechaActualizacion,
      source: meta.id,
      sourceUrl: DOLARES_URL,
    });
    if (quote) quotes.push(quote);
  }

  for (const row of Array.isArray(cotizaciones) ? cotizaciones : []) {
    const code = String(row.moneda || "").toUpperCase();
    // USD is already covered by `/v1/dolares`, which splits it into seven markets.
    const label = CROSS_CURRENCIES[code];
    if (!label) continue;
    const quote = makeQuote({
      country: "AR",
      market: "oficial",
      label,
      kind: "official",
      base: code,
      quote: "ARS",
      buy: row.compra,
      sell: row.venta,
      updatedAt: row.fechaActualizacion,
      source: meta.id,
      sourceUrl: COTIZACIONES_URL,
    });
    if (quote) quotes.push(quote);
  }

  return quotes;
}
