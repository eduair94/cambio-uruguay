// Argentina — BCRA (Banco Central de la República Argentina).
//
// The central bank's own reference table, and the only source in the set that
// prices the whole region against one currency in one document: guaraníes,
// reales, pesos chilenos, bolivianos and pesos uruguayos all quoted in pesos
// argentinos on the same day, by the institution whose number is the legal
// reference. Everything else in this file's neighbourhood is either a market
// price or a cross we computed; this is neither.
//
// `tipoCotizacion` is pesos per unit of the foreign currency; `tipoPase` is
// dollars per unit. Only the first is used — the pass-through rate is the
// bank's own USD cross and duplicating it would put two spellings of the same
// number on the board.
//
// Note for the deploy box: bcra.gob.ar has historically served an incomplete
// certificate chain. If this source starts failing with a TLS error while the
// browser is fine, that is the reason — the fix is a pinned intermediate like
// `classes/bcurates/certs.ts`, never disabling verification.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalHistoryPoint, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "ar_bcra",
  name: "BCRA",
  country: "AR",
  url: "https://www.bcra.gob.ar/BCRAyVos/cotizaciones_por_fecha.asp",
  access: "api",
  publisher: "central-bank",
  covers: "Tabla oficial del banco central argentino: toda la región (real, guaraní, peso chileno, boliviano, peso uruguayo) cotizada en pesos argentinos el mismo día.",
};

const URL = "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones";

interface BcraRow {
  codigoMoneda?: string;
  descripcion?: string;
  tipoPase?: number;
  tipoCotizacion?: number;
}

interface BcraResponse {
  status?: number;
  results?: { fecha?: string; detalle?: BcraRow[] };
}

/** The currencies the regional board reasons about. The BCRA table has ~50. */
const WANTED: Record<string, string> = {
  USD: "Dólar de referencia BCRA",
  EUR: "Euro de referencia BCRA",
  BRL: "Real de referencia BCRA",
  CLP: "Peso chileno de referencia BCRA",
  PYG: "Guaraní de referencia BCRA",
  UYU: "Peso uruguayo de referencia BCRA",
  BOB: "Boliviano de referencia BCRA",
};

export function parseBcra(payload: BcraResponse | null): RegionalQuote[] {
  const rows = payload?.results?.detalle;
  if (!Array.isArray(rows)) return [];
  const day = payload?.results?.fecha;
  const at = day ? `${day}T00:00:00-03:00` : null;

  const quotes: RegionalQuote[] = [];
  for (const row of rows) {
    const code = String(row.codigoMoneda || "").toUpperCase();
    const label = WANTED[code];
    if (!label) continue;
    // The table lists ARS itself with a zero cotización; makeQuote drops it.
    const quote = makeQuote({
      country: "AR",
      market: "referencia",
      label,
      kind: "official",
      base: code,
      quote: "ARS",
      avg: row.tipoCotizacion,
      updatedAt: at,
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export async function fetchArBcra(): Promise<RegionalQuote[]> {
  return parseBcra(await fetchJson<BcraResponse>(URL));
}

// --- Historia ----------------------------------------------------------------
//
// El BCRA guarda su serie cambiaria **desde el 2 de enero de 1996**, quince años
// antes de donde arranca el agregador que usábamos: el peso a uno por dólar de
// la convertibilidad, el salto de 2002 y todo lo que vino después. Se pagina de
// a 1000 días, y hay que pedirla por moneda.

const HISTORY_URL = "https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones";

/** Primer día que el BCRA publica. Pedir antes devuelve 400, no una lista vacía. */
export const BCRA_HISTORY_START = "1996-01-02";

interface BcraHistoryPage {
  status?: number;
  metadata?: { resultset?: { count?: number; offset?: number; limit?: number } };
  results?: Array<{ fecha?: string; detalle?: BcraRow[] }>;
}

/**
 * Serie diaria del dólar de referencia del BCRA. Devuelve null si la API no
 * respondió — que no es lo mismo que un tramo sin datos.
 */
export async function fetchArBcraHistory(from: string, to: string): Promise<RegionalHistoryPoint[] | null> {
  const points: RegionalHistoryPoint[] = [];
  const LIMIT = 1000;
  let offset = 0;
  let answered = 0;

  // Hasta 30 páginas: 30 000 días es más de un siglo, así que el tope es un
  // freno contra un `count` corrupto, no un límite de cobertura.
  for (let page = 0; page < 30; page++) {
    const url = `${HISTORY_URL}/USD?fechadesde=${from}&fechahasta=${to}&limit=${LIMIT}&offset=${offset}`;
    const payload = await fetchJson<BcraHistoryPage>(url, { timeoutMs: 30_000 });
    if (!payload?.results) break;
    answered++;

    for (const row of payload.results) {
      const day = String(row.fecha || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      const value = row.detalle?.find((entry) => entry.codigoMoneda === "USD")?.tipoCotizacion;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      points.push({
        key: "AR:referencia:USDARS",
        country: "AR",
        market: "referencia",
        base: "USD",
        quote: "ARS",
        day,
        buy: null,
        sell: null,
        avg: value,
        source: meta.id,
      });
    }

    const total = payload.metadata?.resultset?.count ?? points.length;
    offset += LIMIT;
    if (offset >= total || !payload.results.length) break;
  }

  return answered ? points : null;
}
