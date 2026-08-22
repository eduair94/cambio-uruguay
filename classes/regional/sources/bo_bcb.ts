// Bolivia — Banco Central de Bolivia (HTML).
//
// Hasta ahora Bolivia era el único país del tablero con UNA sola fuente, y
// justo el país donde el número importa más: el oficial y el paralelo llevan
// años separados, así que equivocarse en el oficial no se nota comparando con
// el mercado.
//
// El BCB no publica API; publica el tipo de cambio en su portada, dentro de un
// widget con clase `bcb-tco-num`. Es un solo número —bolivianos por dólar, sin
// spread— y viene con la leyenda de para qué días rige: "VIGENTE PARA EL SÁBADO
// 22, DOMINGO 23 Y LUNES 24 DE AGOSTO, 2026". Igual que Chile, publica hacia
// adelante, así que el valor puede estar fechado en el futuro; se guarda con el
// día de la lectura y el rango queda en la etiqueta, que es lo que un lector
// necesita ver.
import * as cheerio from "cheerio";
import { fetchText } from "../net";
import { makeQuote, parseLocaleNumber } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "bo_bcb",
  name: "Banco Central de Bolivia",
  country: "BO",
  url: "https://www.bcb.gob.bo/",
  access: "scrape",
  publisher: "central-bank",
  covers: "El tipo de cambio oficial que fija el banco central boliviano, leído de su portada. Es la única forma de contrastar el oficial de Bolivia.",
};

const URL = "https://www.bcb.gob.bo/";

/** Pure parser, para que el test no necesite red. */
export function parseBoBcb(html: string): RegionalQuote[] {
  const $ = cheerio.load(html);
  const raw = $(".bcb-tco-num").first().text().trim();
  // Bolivia escribe 11,50: coma decimal.
  const value = parseLocaleNumber(raw, "latam");
  if (value === null) return [];

  const validity = $(".bcb-kpi2-asof").first().text().replace(/\s+/g, " ").trim();
  const label = validity ? `Dólar oficial (${validity.toLowerCase()})` : "Dólar oficial";

  const quote = makeQuote({
    country: "BO",
    market: "oficial",
    label,
    kind: "official",
    base: "USD",
    quote: "BOB",
    avg: value,
    // La página no trae una estampa legible por máquina; la lectura es la estampa.
    updatedAt: null,
    source: meta.id,
    sourceUrl: URL,
  });
  return quote ? [quote] : [];
}

export async function fetchBoBcb(): Promise<RegionalQuote[]> {
  const html = await fetchText(URL, { headers: { accept: "text/html,*/*;q=0.8" } });
  if (!html) return [];
  return parseBoBcb(html);
}
