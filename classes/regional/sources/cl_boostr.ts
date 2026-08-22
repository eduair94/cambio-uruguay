// Chile — Boostr.
//
// Segunda lectura del dólar observado y del euro. Los dos publicadores chilenos
// beben del mismo fijado del Banco Central, así que cuando coinciden no prueban
// que el número sea correcto: prueban que **lo leímos bien**. Eso es
// exactamente lo que falta cuando un país tiene una sola fuente y esa fuente
// cambia el formato de su respuesta un martes cualquiera.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "cl_boostr",
  name: "Boostr",
  country: "CL",
  url: "https://api.boostr.cl/",
  access: "api",
  publisher: "market-data",
  covers: "Segunda lectura del dólar observado y el euro del Banco Central de Chile, para contrastar la primera.",
};

const URL = "https://api.boostr.cl/economy/indicators.json";

interface Indicator {
  date?: string;
  value?: number;
}

interface BoostrResponse {
  status?: string;
  data?: { dolar?: Indicator; euro?: Indicator };
}

export function parseBoostr(payload: BoostrResponse | null): RegionalQuote[] {
  const data = payload?.data;
  if (!data) return [];
  const quotes: RegionalQuote[] = [];

  for (const [indicator, base, label] of [
    [data.dolar, "USD", "Dólar observado"],
    [data.euro, "EUR", "Euro observado"],
  ] as const) {
    if (!indicator) continue;
    const quote = makeQuote({
      country: "CL",
      market: "observado",
      label,
      kind: "official",
      base,
      quote: "CLP",
      avg: indicator.value ?? null,
      // La fecha es el día para el que rige el valor, no el momento de la lectura.
      updatedAt: indicator.date ? `${indicator.date}T00:00:00-04:00` : null,
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }

  return quotes;
}

export async function fetchClBoostr(): Promise<RegionalQuote[]> {
  return parseBoostr(await fetchJson<BoostrResponse>(URL));
}
