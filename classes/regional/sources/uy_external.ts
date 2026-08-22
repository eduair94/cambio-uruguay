// Uruguay — lectura de un tercero sobre nuestro propio mercado.
//
// Todas las demás filas del tablero se contrastan contra alguien. La uruguaya no
// se contrastaba contra nadie, y es la única que armamos nosotros: si el scrape
// de casas se rompiera de una manera que no dispare las alarmas internas, el
// tablero regional lo mostraría igual y con nuestra firma.
//
// Esta fuente es un tercero que releva el mismo mercado. **No publica lo mismo
// que nosotros**: su compra/venta es el rango del mercado (la peor compra y la
// peor venta), no el mejor precio disponible, así que sus dos puntas no son
// comparables con las nuestras una a una. Su PUNTO MEDIO sí lo es, y por eso
// entra como referencia (`kind: reference`) y no como precio de mostrador: el
// validador la contrasta contra el BCU y, si se aleja más de un 5 %, la deja
// afuera diciendo por qué.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "uy_external",
  name: "DolarAPI Uruguay",
  country: "UY",
  url: "https://uy.dolarapi.com",
  access: "api",
  publisher: "market-data",
  covers: "Lectura de un tercero sobre el mercado uruguayo: el control externo de nuestros propios datos.",
};

const URL = "https://uy.dolarapi.com/v1/cotizaciones";

interface Row {
  moneda?: string;
  compra?: number | null;
  venta?: number | null;
  fechaActualizacion?: string;
}

const LABELS: Record<string, string> = {
  USD: "Dólar según un tercero (punto medio del mercado)",
  EUR: "Euro según un tercero (punto medio del mercado)",
};

export function parseUyExternal(rows: Row[] | null): RegionalQuote[] {
  if (!Array.isArray(rows)) return [];
  const quotes: RegionalQuote[] = [];
  for (const row of rows) {
    const code = String(row.moneda || "").toUpperCase();
    const label = LABELS[code];
    if (!label) continue;
    const buy = typeof row.compra === "number" ? row.compra : null;
    const sell = typeof row.venta === "number" ? row.venta : null;
    if (buy === null || sell === null) continue;
    const quote = makeQuote({
      country: "UY",
      market: "terceros",
      label,
      kind: "reference",
      base: code,
      quote: "UYU",
      // Sólo el punto medio: sus puntas describen el rango del mercado, no una
      // operación, y publicarlas como compra/venta invitaría a compararlas con
      // las nuestras, que son la mejor punta de cada lado.
      avg: (buy + sell) / 2,
      updatedAt: row.fechaActualizacion,
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export async function fetchUyExternal(): Promise<RegionalQuote[]> {
  return parseUyExternal(await fetchJson<Row[]>(URL));
}
