// Argentina — CriptoYa.
//
// Quinta lectura independiente de los mismos siete dólares. Con cinco fuentes,
// el filtro de consenso deja de ser teórico: una que se rompa queda afuera por
// mayoría y no por suerte.
//
// Su particularidad es que los dólares financieros no vienen como un número
// sino desglosados por instrumento: el MEP y el contado con liquidación se
// calculan con un bono concreto (AL30, GD30...) y en dos liquidaciones (`ci`,
// contado inmediato, y `24hs`). No son variantes cosméticas: son precios
// distintos del mismo dólar. Se toma **AL30 a 24 horas**, que es el más
// operado, y se dice cuál es — publicar "el MEP" sin decir con qué bono es
// exactamente lo que hace que dos sitios muestren números distintos y nadie
// entienda por qué.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "ar_criptoya",
  name: "CriptoYa",
  country: "AR",
  url: "https://criptoya.com/api",
  access: "api",
  publisher: "market-data",
  covers: "Quinta lectura de los dólares argentinos, con los financieros desglosados por bono y liquidación (se usa AL30 a 24 h) y el cripto por stablecoin.",
};

const URL = "https://criptoya.com/api/dolar";

interface Simple {
  price?: number;
  ask?: number;
  bid?: number;
  variation?: number;
  timestamp?: number;
}

interface ByBond {
  al30?: { "24hs"?: Simple; ci?: Simple };
  gd30?: { "24hs"?: Simple; ci?: Simple };
}

interface CriptoYaResponse {
  mayorista?: Simple;
  oficial?: Simple;
  tarjeta?: Simple;
  blue?: Simple;
  mep?: ByBond;
  ccl?: ByBond;
  cripto?: { usdt?: Simple; ccb?: Simple };
}

const stamp = (row: Simple | undefined): string | null =>
  row?.timestamp && Number.isFinite(row.timestamp) ? new Date(row.timestamp * 1000).toISOString() : null;

export function parseCriptoYa(payload: CriptoYaResponse | null): RegionalQuote[] {
  if (!payload) return [];
  const quotes: RegionalQuote[] = [];

  const push = (
    market: string,
    label: string,
    kind: "official" | "wholesale" | "parallel" | "financial" | "card",
    row: Simple | undefined
  ) => {
    if (!row) return;
    const quote = makeQuote({
      country: "AR",
      market,
      label,
      kind,
      base: "USD",
      quote: "ARS",
      buy: row.bid ?? null,
      sell: row.ask ?? null,
      avg: row.price ?? null,
      variationPct: row.variation ?? null,
      updatedAt: stamp(row),
      source: meta.id,
      sourceUrl: URL,
    });
    if (quote) quotes.push(quote);
  };

  push("oficial", "Dólar oficial", "official", payload.oficial);
  push("blue", "Dólar blue", "parallel", payload.blue);
  push("mayorista", "Dólar mayorista", "wholesale", payload.mayorista);
  push("tarjeta", "Dólar tarjeta", "card", payload.tarjeta);
  push("bolsa", "Dólar MEP (AL30 24 h)", "financial", payload.mep?.al30?.["24hs"]);
  push("contadoconliqui", "Contado con liquidación (AL30 24 h)", "financial", payload.ccl?.al30?.["24hs"]);
  push("cripto", "Dólar cripto (USDT)", "financial", payload.cripto?.usdt);

  return quotes;
}

export async function fetchArCriptoYa(): Promise<RegionalQuote[]> {
  return parseCriptoYa(await fetchJson<CriptoYaResponse>(URL));
}
