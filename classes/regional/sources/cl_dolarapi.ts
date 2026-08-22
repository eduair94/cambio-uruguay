// Chile — DolarAPI Chile.
//
// The observed rate the central bank publishes is a single mid price for the
// whole day; this is the two-sided price a Chilean casa de cambio actually
// quotes, which is what somebody changing money in Santiago or in a border town
// pays. Both belong on the board and they are not the same number: the retail
// spread is the difference between the reference and the transaction.
//
// It also carries the peso argentino in Chilean pesos, a cross that matters at
// the Andean crossings and that no central bank in this set publishes.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "cl_dolarapi",
  name: "DolarAPI Chile",
  country: "CL",
  url: "https://cl.dolarapi.com",
  access: "api",
  publisher: "market-data",
  covers: "Precio de mostrador (compra y venta) del dólar, el euro y el peso argentino en pesos chilenos.",
};

const URL = "https://cl.dolarapi.com/v1/cotizaciones";

interface Row {
  moneda?: string;
  nombre?: string;
  compra?: number | null;
  venta?: number | null;
  ultimoCierre?: number | null;
  fechaActualizacion?: string;
}

const LABELS: Record<string, string> = {
  USD: "Dólar de mostrador",
  EUR: "Euro de mostrador",
  ARS: "Peso argentino de mostrador",
};

export function parseClDolarApi(rows: Row[] | null): RegionalQuote[] {
  if (!Array.isArray(rows)) return [];
  const quotes: RegionalQuote[] = [];
  for (const row of rows) {
    const code = String(row.moneda || "").toUpperCase();
    const label = LABELS[code];
    if (!label) continue;
    const quote = makeQuote({
      country: "CL",
      market: "casas",
      label,
      kind: "retail",
      base: code,
      quote: "CLP",
      buy: row.compra,
      sell: row.venta,
      updatedAt: row.fechaActualizacion,
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export async function fetchClDolarApi(): Promise<RegionalQuote[]> {
  return parseClDolarApi(await fetchJson<Row[]>(URL));
}
