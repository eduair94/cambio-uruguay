// Chile — mindicador.cl (dólar observado del Banco Central de Chile).
//
// Chile's reference rate is the "dólar observado": the average of the previous
// business day's interbank operations, published each morning and valid for the
// whole day. It is therefore ALWAYS yesterday's market — the snapshot stamps it
// with the day it belongs to rather than with "now", because a rate that is one
// business day old by design must not be displayed as a live tick.
//
// The same endpoint carries the UF, the unit Chilean rents, mortgages and
// contracts are actually denominated in. It is not a currency, so it is not on
// the FX board; it is kept here as a labelled indicator because "the dollar in
// Chile" without the UF explains none of what a Chilean price means.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalHistoryPoint, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "cl_mindicador",
  name: "mindicador.cl (Banco Central de Chile)",
  country: "CL",
  url: "https://mindicador.cl",
  access: "api",
  publisher: "central-bank",
  covers: "Dólar observado y euro del Banco Central de Chile, con su serie diaria por año, más la UF.",
};

const LATEST = "https://mindicador.cl/api";
const SERIES = "https://mindicador.cl/api/dolar";

interface Indicator {
  codigo?: string;
  nombre?: string;
  unidad_medida?: string;
  fecha?: string;
  valor?: number;
}

interface MindicadorLatest {
  fecha?: string;
  dolar?: Indicator;
  euro?: Indicator;
  uf?: Indicator;
}

interface MindicadorSeries {
  codigo?: string;
  serie?: Array<{ fecha?: string; valor?: number }>;
}

export function parseMindicador(payload: MindicadorLatest | null): RegionalQuote[] {
  if (!payload) return [];
  const quotes: RegionalQuote[] = [];

  const legs: Array<[Indicator | undefined, string, string]> = [
    [payload.dolar, "USD", "Dólar observado"],
    [payload.euro, "EUR", "Euro observado"],
  ];

  for (const [indicator, base, label] of legs) {
    if (!indicator) continue;
    const quote = makeQuote({
      country: "CL",
      market: "observado",
      label,
      kind: "official",
      base,
      quote: "CLP",
      avg: indicator.valor,
      // `fecha` is the day the value is valid for, not the moment we read it.
      updatedAt: indicator.fecha,
      source: meta.id,
      sourceUrl: LATEST,
    });
    if (quote) quotes.push(quote);
  }

  return quotes;
}

export async function fetchClMindicador(): Promise<RegionalQuote[]> {
  return parseMindicador(await fetchJson<MindicadorLatest>(LATEST));
}

/**
 * Daily observed-dollar series for one calendar year (`2026`), for the backfill.
 * Null when the endpoint could not be read — an empty year and a dead endpoint
 * must not log the same line.
 */
export async function fetchClDolarHistory(year: number): Promise<RegionalHistoryPoint[] | null> {
  const payload = await fetchJson<MindicadorSeries>(`${SERIES}/${year}`, { timeoutMs: 20_000 });
  if (payload === null) return null;
  const serie = payload?.serie;
  if (!Array.isArray(serie)) return [];
  const points: RegionalHistoryPoint[] = [];
  for (const row of serie) {
    const value = row.valor;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    const day = String(row.fecha || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    points.push({
      key: "CL:observado:USDCLP",
      country: "CL",
      market: "observado",
      base: "USD",
      quote: "CLP",
      day,
      buy: null,
      sell: null,
      avg: value,
      source: meta.id,
    });
  }
  return points;
}
