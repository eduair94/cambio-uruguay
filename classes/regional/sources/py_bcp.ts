// Paraguay — Banco Central del Paraguay (HTML).
//
// The BCP has no JSON API: its rate service sits behind Cloudflare and answers
// 403. What it does publish are two server-rendered pages, and between them they
// are the richest single source in this whole set:
//
//   * `referencial-fluctuante` — the free-floating market's reference rate,
//     recomputed every half hour through the day, with both the running average
//     of the session ("acumulado") and the value of that half-hour block. The
//     LAST row of the table is the current reference; earlier rows are the day's
//     path.
//   * `monedas` — the planilla: guaraníes per unit for ~26 currencies, including
//     the real, the peso argentino, the peso chileno, the boliviano and the peso
//     uruguayo, all fixed on the same day by the same institution.
//
// Two parsing traps live here. Paraguay writes `6.021,64` (dot thousands, comma
// decimals), so every number goes through `parseLocaleNumber`. And the intraday
// table is padded with EMPTY `<tr>` rows between half-hour blocks — reading "the
// last row" without skipping them yields nothing, which is why the parser walks
// backwards to the last row that actually has cells.
import * as cheerio from "cheerio";
import { fetchText } from "../net";
import { makeQuote, parseLocaleNumber } from "../quote";
import type { RegionalHistoryPoint, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "py_bcp",
  name: "Banco Central del Paraguay",
  country: "PY",
  url: "https://www.bcp.gov.py/webapps/web/cotizacion/referencial-fluctuante",
  access: "scrape",
  publisher: "central-bank",
  covers: "Tipo de cambio referencial del mercado libre (compra y venta, actualizado cada media hora) y la planilla oficial con ~26 monedas en guaraníes.",
};

const REFERENCIAL_URL = "https://www.bcp.gov.py/webapps/web/cotizacion/referencial-fluctuante";
const MONEDAS_URL = "https://www.bcp.gov.py/webapps/web/cotizacion/monedas";

const MONTHS: Record<string, string> = {
  ENERO: "01",
  FEBRERO: "02",
  MARZO: "03",
  ABRIL: "04",
  MAYO: "05",
  JUNIO: "06",
  JULIO: "07",
  AGOSTO: "08",
  SETIEMBRE: "09",
  SEPTIEMBRE: "09",
  OCTUBRE: "10",
  NOVIEMBRE: "11",
  DICIEMBRE: "12",
};

/** `COTIZACIONES DEL 21 DE AGOSTO DE 2026` / `AL VIERNES 21 DE AGOSTO DEL 2026` -> ISO day. */
export function parseSpanishDate(raw: string): string | null {
  const match = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .match(/(\d{1,2})\s+DE\s+([A-Z]+)\s+DE[L]?\s+(\d{4})/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName];
  if (!month) return null;
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

/** The currencies the regional board keeps from the ~26 the planilla lists. */
const PLANILLA_CURRENCIES: Record<string, string> = {
  USD: "Dólar (planilla BCP)",
  EUR: "Euro (planilla BCP)",
  BRL: "Real (planilla BCP)",
  ARS: "Peso argentino (planilla BCP)",
  CLP: "Peso chileno (planilla BCP)",
  UYU: "Peso uruguayo (planilla BCP)",
  BOB: "Boliviano (planilla BCP)",
};

export interface BcpParseOptions {
  /**
   * Exigir que la fila tenga hora.
   *
   * La primera fila de la tabla NO es de la jornada: es `(*)Prom. 20/08`, el
   * promedio del día hábil anterior. En vivo eso está bien —un lunes a las 7 de
   * la mañana es lo mejor que hay y es lo que el propio BCP muestra—, pero en el
   * archivo es veneno: pedir un domingo o un feriado devuelve la página con el
   * encabezado del día pedido y ESA sola fila, así que guardarla copiaría el
   * valor del viernes sobre el domingo como si el mercado hubiera operado.
   */
  requireHour?: boolean;
}

/** Pure parser for the intraday reference table. */
export function parseBcpReferencial(html: string, options: BcpParseOptions = {}): RegionalQuote[] {
  const $ = cheerio.load(html);
  const day = parseSpanishDate($("table th h4").first().text() || $("table").first().text().slice(0, 200));

  const rows = $("table tbody tr").toArray();
  // Walk backwards: the table is padded with empty <tr> between half-hour blocks.
  for (let index = rows.length - 1; index >= 0; index--) {
    const cells = $(rows[index])
      .find("td")
      .map((_, cell) => $(cell).text().trim())
      .get();
    if (cells.length < 3) continue;
    const time = /^\d{1,2}:\d{2}$/.test(cells[0]) ? cells[0] : null;
    if (options.requireHour && !time) continue;
    const buy = parseLocaleNumber(cells[1], "latam");
    const sell = parseLocaleNumber(cells[2], "latam");
    if (buy === null && sell === null) continue;
    const quote = makeQuote({
      country: "PY",
      market: "referencial",
      label: "Tipo de cambio referencial (mercado libre)",
      kind: "official",
      base: "USD",
      quote: "PYG",
      buy,
      sell,
      // Asunción is UTC-3 (no DST since 2024).
      updatedAt: day ? `${day}T${time || "00:00"}:00-03:00` : null,
      source: meta.id,
      sourceUrl: REFERENCIAL_URL,
    });
    return quote ? [quote] : [];
  }
  return [];
}

/** Pure parser for the planilla (guaraníes per unit of each currency). */
export function parseBcpPlanilla(html: string): RegionalQuote[] {
  const $ = cheerio.load(html);
  const day = parseSpanishDate($("#cotizacion-interbancaria thead th").first().text());
  const quotes: RegionalQuote[] = [];

  $("#cotizacion-interbancaria tbody tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((_index, cell) => $(cell).text().trim().replace(/\s+/g, " "))
      .get();
    if (cells.length < 4) return;
    const code = cells[1].toUpperCase();
    const label = PLANILLA_CURRENCIES[code];
    if (!label) return;
    // Column 3 is guaraníes per unit of the currency — unambiguous regardless of
    // whether the currency is quoted directly or indirectly against the dollar
    // (the planilla marks the direct ones with an asterisk in column 0).
    const perUnit = parseLocaleNumber(cells[3], "latam");
    const quote = makeQuote({
      country: "PY",
      market: "planilla",
      label,
      kind: "official",
      base: code,
      quote: "PYG",
      avg: perUnit,
      updatedAt: day ? `${day}T00:00:00-03:00` : null,
      source: meta.id,
      sourceUrl: MONEDAS_URL,
    });
    if (quote) quotes.push(quote);
  });

  return quotes;
}

/**
 * La misma tabla, de un día pasado.
 *
 * El BCP acepta `?fecha=dd/mm/yyyy` y devuelve la jornada completa de ese día —
 * es la única forma de reconstruir la serie paraguaya, porque nadie la publica
 * como serie. Es un pedido por día, así que quien lo llame tiene que ir de a
 * poco: `deep_history.ts` lo hace con un presupuesto por corrida y sólo para los
 * días que faltan.
 *
 * Devuelve null si la página no respondió, y `[]` si respondió sin datos — un
 * feriado paraguayo no tiene cotización y eso es una respuesta, no una falla.
 */
export async function fetchBcpReferencialForDay(day: string): Promise<RegionalHistoryPoint[] | null> {
  const [year, month, date] = day.split("-");
  const html = await fetchText(`${REFERENCIAL_URL}?fecha=${date}/${month}/${year}`, {
    headers: { accept: "text/html,*/*;q=0.8" },
  });
  if (!html) return null;

  // `requireHour` descarta el promedio del día anterior, que es lo único que la
  // página muestra cuando el día pedido no operó.
  const quotes = parseBcpReferencial(html, { requireHour: true });
  // Y el filtro de fecha descarta una página que conteste con otro día.
  return quotes
    .filter((quote) => quote.updatedAt.slice(0, 10) === day)
    .map((quote) => ({
      key: quote.id,
      country: "PY" as const,
      market: quote.market,
      base: quote.base,
      quote: quote.quote,
      day,
      buy: quote.buy,
      sell: quote.sell,
      avg: quote.avg,
      source: meta.id,
    }));
}

export async function fetchPyBcp(): Promise<RegionalQuote[]> {
  const [referencial, planilla] = await Promise.all([
    fetchText(REFERENCIAL_URL, { headers: { accept: "text/html,*/*;q=0.8" } }),
    fetchText(MONEDAS_URL, { headers: { accept: "text/html,*/*;q=0.8" } }),
  ]);
  const quotes: RegionalQuote[] = [];
  if (referencial) quotes.push(...parseBcpReferencial(referencial));
  if (planilla) quotes.push(...parseBcpPlanilla(planilla));
  return quotes;
}
