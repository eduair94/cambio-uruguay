import moment from "moment-timezone";
import * as soap from "soap";

/**
 * Client + pure helpers for the BCU "cotizaciones" SOAP web service.
 *
 * Endpoint: awsbcucotizaciones (GeneXus). Unlike the HTML page the public site
 * scrapes, this service supports historical date-range queries, so it doubles as
 * the live source for the BCU scraper AND the backfill of past gaps.
 *
 * Response shape (verified against the live service):
 *   Salida.respuestastatus { status, codigoerror, mensaje }   // status "1" == ok
 *   Salida.datoscotizaciones["datoscotizaciones.dato"][]       // array (or single object)
 *     { Fecha, Moneda, Nombre, CodigoISO, Emisor, TCC, TCV, ArbAct, FormaArbitrar }
 *   TCC == buy, TCV == sell.
 */

export const COTIZACIONES_WSDL =
  "https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones?wsdl";

export interface BcuConversion {
  code: string;
  type: string;
}

/**
 * Maps the BCU `Nombre` field to our (code, type). Keys are the exact strings the
 * service returns and mirror the legacy HTML scraper's `conversions` map, so SOAP
 * rows merge into the same history series (same upsert key {origin,date,code,type}).
 */
export const BCU_CONVERSIONS: Record<string, BcuConversion> = {
  "DLS. USA BILLETE": { code: "USD", type: "BILLETE" },
  "DLS. USA CABLE": { code: "USD", type: "CABLE" },
  "DLS.PROMED.FONDO": { code: "USD", type: "PROMED.FONDO" },
  "PESO ARG.BILLETE": { code: "ARS", type: "BILLETE" },
  "REAL BILLETE": { code: "BRL", type: "BILLETE" },
  "UNIDAD INDEXADA": { code: "UI", type: "" },
  "UNIDAD PREVISIONAL": { code: "UP", type: "" },
  "UNIDAD REAJUSTAB": { code: "UR", type: "" },
};

/** Numeric Moneda codes to request — the set covered by BCU_CONVERSIONS. */
export const BCU_MONEDA_CODES: number[] = [2225, 2224, 2230, 501, 1001, 9700, 9800, 9900];

export interface BcuRawRow {
  Fecha: string | Date;
  Moneda: number;
  Nombre: string;
  CodigoISO?: string;
  Emisor?: string;
  TCC: number;
  TCV: number;
}

export interface BcuQuote {
  date: Date;
  code: string;
  type: string;
  name: string;
  buy: number;
  sell: number;
}

/**
 * Convert a BCU `Fecha` (UTC midnight of a business day) to the same Montevideo
 * start-of-day Date the daily scraper stores. We read the UTC calendar Y-M-D first;
 * interpreting the UTC-midnight instant directly in America/Montevideo would shift
 * it to the previous day (off-by-one).
 */
export function toMontevideoDate(fecha: string | Date): Date {
  const ymd = moment.utc(fecha).format("YYYY-MM-DD");
  return moment.tz(ymd, "America/Montevideo").startOf("day").toDate();
}

/** Throw if the SOAP response status is not success ("1"). */
export function assertOk(response: any): void {
  const st = response?.Salida?.respuestastatus;
  if (!st || String(st.status) !== "1") {
    const msg = st?.mensaje || `status=${st?.status} codigoerror=${st?.codigoerror}`;
    throw new Error(`BCU SOAP error: ${msg}`);
  }
}

/** Pull the rows out of the nested response, normalizing single-object → array. */
export function extractRows(response: any): BcuRawRow[] {
  const dato = response?.Salida?.datoscotizaciones?.["datoscotizaciones.dato"];
  if (!dato) return [];
  return Array.isArray(dato) ? dato : [dato];
}

/** Map raw rows to BcuQuote, dropping unknown currencies and 0/0 quotes. */
export function normalizeRows(
  rows: BcuRawRow[],
  conversions: Record<string, BcuConversion> = BCU_CONVERSIONS
): BcuQuote[] {
  const out: BcuQuote[] = [];
  for (const row of rows) {
    const conv = conversions[row.Nombre];
    if (!conv) continue;
    const buy = Number(row.TCC) || 0;
    const sell = Number(row.TCV) || 0;
    if (buy === 0 && sell === 0) continue;
    out.push({
      date: toMontevideoDate(row.Fecha),
      code: conv.code,
      type: conv.type,
      name: row.Nombre,
      buy,
      sell,
    });
  }
  return out;
}

/** assertOk + extractRows + normalizeRows. */
export function parseCotizaciones(
  response: any,
  conversions: Record<string, BcuConversion> = BCU_CONVERSIONS
): BcuQuote[] {
  assertOk(response);
  return normalizeRows(extractRows(response), conversions);
}

/**
 * Call the live service for the given codes over [desde, hasta] (inclusive) and
 * return normalized quotes. Dates are formatted as YYYY-MM-DD (xsd:date).
 * A single call covers the whole range — the service returns every business day.
 */
export async function fetchCotizaciones(
  desde: Date,
  hasta: Date,
  codes: number[] = BCU_MONEDA_CODES,
  grupo = 0
): Promise<BcuQuote[]> {
  const client = await soap.createClientAsync(COTIZACIONES_WSDL);
  const [result] = await client.ExecuteAsync({
    Entrada: {
      Moneda: { item: codes },
      FechaDesde: moment.tz(desde, "America/Montevideo").format("YYYY-MM-DD"),
      FechaHasta: moment.tz(hasta, "America/Montevideo").format("YYYY-MM-DD"),
      Grupo: grupo,
    },
  });
  return parseCotizaciones(result);
}

/** Today's cotizaciones (single-day range), for the live scraper path. */
export async function fetchCurrentCotizaciones(codes: number[] = BCU_MONEDA_CODES): Promise<BcuQuote[]> {
  const today = moment.tz("America/Montevideo").startOf("day").toDate();
  return fetchCotizaciones(today, today, codes);
}
