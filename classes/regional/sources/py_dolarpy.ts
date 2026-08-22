// Paraguay — DolarPy.
//
// El agregador que le faltaba a Paraguay: en una sola respuesta trae el
// referencial del Banco Central y el mostrador de once casas de cambio
// (Bonanza, Alberdi, Chaco, Eurocambios, Familiar, GNB, La Moneda, Maxicambios,
// Mundial, MyD) más la cotización de la SET.
//
// Aporta dos cosas distintas:
//   * una segunda lectura del referencial del BCP, que hasta ahora se leía de
//     una sola página HTML sin nada con qué contrastarla;
//   * un precio de mostrador que representa al MERCADO y no a una casa. Se
//     construye igual que la fila uruguaya: mejor compra y mejor venta entre las
//     casas que están en el mercado, filtrando por mediana las que dejaron el
//     cartel puesto (acá aparecen como 0,00 — La Moneda lo publicaba así el día
//     que se escribió esto, y un cero que llegue al tablero es una división por
//     cero tres capas más adelante).
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "py_dolarpy",
  name: "DolarPy",
  country: "PY",
  url: "https://dolar.melizeche.com/",
  access: "api",
  publisher: "market-data",
  covers: "El referencial del BCP más el mostrador de once casas de cambio paraguayas en una sola respuesta: la única forma de tener consenso en Paraguay.",
};

const URL = "https://dolar.melizeche.com/api/1.0/";

interface House {
  compra?: number;
  venta?: number;
  referencial_diario?: number;
}

interface DolarPyResponse {
  dolarpy?: Record<string, House>;
  updated?: string;
}

/** Fuera de un factor 2 de la mediana no es un precio: es un cartel viejo. */
const MEDIAN_FACTOR = 2;

export function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function parseDolarPy(payload: DolarPyResponse | null): RegionalQuote[] {
  const houses = payload?.dolarpy;
  if (!houses) return [];
  const at = payload?.updated || null;
  const quotes: RegionalQuote[] = [];

  // El referencial del banco central, para contrastar con el scrape del BCP.
  const bcp = houses.bcp;
  if (bcp) {
    const quote = makeQuote({
      country: "PY",
      market: "referencial",
      label: "Tipo de cambio referencial (mercado libre)",
      kind: "official",
      base: "USD",
      quote: "PYG",
      buy: bcp.compra ?? null,
      sell: bcp.venta ?? null,
      avg: bcp.referencial_diario ?? null,
      updatedAt: at,
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  }

  // El mostrador, como mercado y no como una casa suelta. `set` es la
  // Subsecretaría de Estado de Tributación: una cotización administrativa, no un
  // precio de mostrador, así que queda afuera del compuesto.
  const counters = Object.entries(houses)
    .filter(([name]) => name !== "bcp" && name !== "set")
    .map(([, house]) => house)
    .filter((house) => (house.compra ?? 0) > 0 && (house.venta ?? 0) > 0);

  const buyReference = median(counters.map((house) => house.compra!));
  const sellReference = median(counters.map((house) => house.venta!));
  if (buyReference !== null && sellReference !== null) {
    const plausible = counters.filter(
      (house) =>
        house.compra! >= buyReference / MEDIAN_FACTOR &&
        house.compra! <= buyReference * MEDIAN_FACTOR &&
        house.venta! >= sellReference / MEDIAN_FACTOR &&
        house.venta! <= sellReference * MEDIAN_FACTOR
    );
    if (plausible.length) {
      const quote = makeQuote({
        country: "PY",
        market: "casas",
        label: "Dólar en casas de cambio (mejor precio)",
        kind: "retail",
        base: "USD",
        quote: "PYG",
        buy: Math.max(...plausible.map((house) => house.compra!)),
        sell: Math.min(...plausible.map((house) => house.venta!)),
        sample: plausible.length,
        updatedAt: at,
        source: meta.id,
        sourceUrl: URL,
      });
      if (quote) quotes.push(quote);
    }
  }

  return quotes;
}

export async function fetchPyDolarPy(): Promise<RegionalQuote[]> {
  return parseDolarPy(await fetchJson<DolarPyResponse>(URL));
}
