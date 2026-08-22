// Brasil — Banco Central do Brasil (PTAX).
//
// PTAX is not "another dollar quote": it is the daily fixing the BCB computes
// from the interbank market, and it is the rate Brazilian contracts, card
// settlements and tax filings are written against. That makes it the reference
// the tourism rate has to be compared to, and the only Brazilian number with
// legal standing.
//
// Two endpoints, on purpose:
//   * Olinda (the OData service) publishes compra AND venda with the exact
//     timestamp of the fixing — the fixing has a spread, and it is small enough
//     (a fraction of a cent) that any source rounding it away is not PTAX.
//   * SGS series 1 (venda) and 10813 (compra) are the same numbers as a plain
//     daily time series, back to 1984. Olinda answers "today"; SGS answers
//     "every day since", so the backfill reads SGS and the snapshot reads Olinda
//     with SGS as the fallback when the OData service is down.
//
// PTAX has no weekend value. Asking for a Sunday returns an empty list, which is
// an answer, not a failure: the window below always spans several days and the
// last row wins.
import { fetchJson } from "../net";
import { makeQuote, parseLocaleNumber } from "../quote";
import type { RegionalHistoryPoint, RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "br_bcb",
  name: "Banco Central do Brasil (PTAX)",
  country: "BR",
  url: "https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes",
  access: "api",
  publisher: "central-bank",
  covers: "El fixing PTAX (compra y venta) con el que se liquidan contratos, tarjetas e impuestos en Brasil, y su serie diaria completa desde 1984.",
};

const OLINDA_BASE =
  "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)";
const SGS_VENDA = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados";
const SGS_COMPRA = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados";

interface OlindaRow {
  cotacaoCompra?: number;
  cotacaoVenda?: number;
  dataHoraCotacao?: string;
}

interface SgsRow {
  data?: string;
  valor?: string;
}

/** `MM-DD-YYYY`, which is the format Olinda demands (US order, quoted). */
function olindaDate(date: Date): string {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}-${date.getUTCFullYear()}`;
}

function olindaUrl(days = 8): string {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const params = new URLSearchParams({
    "@dataInicial": `'${olindaDate(start)}'`,
    "@dataFinalCotacao": `'${olindaDate(end)}'`,
    $format: "json",
    $orderby: "dataHoraCotacao desc",
    $top: "5",
  });
  // URLSearchParams percent-encodes the quotes Olinda requires; it accepts that.
  return `${OLINDA_BASE}?${params.toString()}`;
}

/** `2026-08-21 13:08:53.347838` in Brasília time -> ISO. */
function ptaxStamp(raw: string | undefined): string | null {
  if (!raw) return null;
  const iso = `${raw.replace(" ", "T").slice(0, 23)}-03:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function fromOlinda(): Promise<RegionalQuote | null> {
  const payload = await fetchJson<{ value?: OlindaRow[] }>(olindaUrl());
  const rows = payload?.value;
  if (!Array.isArray(rows) || !rows.length) return null;
  // `$orderby desc` puts the newest fixing first; guard anyway.
  const latest = [...rows].sort((a, b) => String(b.dataHoraCotacao).localeCompare(String(a.dataHoraCotacao)))[0];
  return makeQuote({
    country: "BR",
    market: "ptax",
    label: "Dólar PTAX (fixing oficial)",
    kind: "official",
    base: "USD",
    quote: "BRL",
    buy: latest.cotacaoCompra,
    sell: latest.cotacaoVenda,
    updatedAt: ptaxStamp(latest.dataHoraCotacao),
    source: meta.id,
    sourceUrl: OLINDA_BASE,
  });
}

async function fromSgs(): Promise<RegionalQuote | null> {
  const [venda, compra] = await Promise.all([
    fetchJson<SgsRow[]>(`${SGS_VENDA}/ultimos/1?formato=json`),
    fetchJson<SgsRow[]>(`${SGS_COMPRA}/ultimos/1?formato=json`),
  ]);
  const sellRow = Array.isArray(venda) ? venda[venda.length - 1] : undefined;
  const buyRow = Array.isArray(compra) ? compra[compra.length - 1] : undefined;
  if (!sellRow && !buyRow) return null;
  const day = (sellRow?.data || buyRow?.data || "").split("/").reverse().join("-");
  return makeQuote({
    country: "BR",
    market: "ptax",
    label: "Dólar PTAX (fixing oficial)",
    kind: "official",
    base: "USD",
    quote: "BRL",
    buy: parseLocaleNumber(buyRow?.valor, "dot"),
    sell: parseLocaleNumber(sellRow?.valor, "dot"),
    updatedAt: day ? `${day}T13:00:00-03:00` : null,
    source: meta.id,
    sourceUrl: SGS_VENDA,
  });
}

export async function fetchBrBcb(): Promise<RegionalQuote[]> {
  const olinda = await fromOlinda();
  if (olinda) return [olinda];
  const sgs = await fromSgs();
  return sgs ? [sgs] : [];
}

/**
 * The SGS API refuses a window wider than ten years — and refuses it with an
 * error page, not with a shorter answer, so a single "1995 to today" request
 * comes back empty and looks exactly like a series that does not exist. The
 * backfill therefore walks the range in ten-year chunks.
 */
const SGS_MAX_YEARS = 10;

/** `YYYY-MM-DD` -> `DD/MM/YYYY`, which is the only date format SGS accepts. */
const sgsDate = (day: string): string => day.split("-").reverse().join("/");

export function sgsWindows(from: string, to: string): Array<[string, string]> {
  const windows: Array<[string, string]> = [];
  let start = from;
  while (start < to) {
    const startYear = Number(start.slice(0, 4));
    const candidate = `${startYear + SGS_MAX_YEARS}-${start.slice(5)}`;
    const end = candidate < to ? candidate : to;
    windows.push([start, end]);
    if (end === to) break;
    // Next window starts the day after, so no day is fetched twice.
    const next = new Date(`${end}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    start = next.toISOString().slice(0, 10);
  }
  return windows;
}

async function sgsRange(url: string, from: string, to: string): Promise<SgsRow[] | null> {
  return fetchJson<SgsRow[]>(`${url}?formato=json&dataInicial=${sgsDate(from)}&dataFinal=${sgsDate(to)}`, {
    timeoutMs: 30_000,
  });
}

/**
 * SGS daily series for the backfill. `from`/`to` are `YYYY-MM-DD`.
 *
 * Returns null when nothing could be read at all; a partial answer (some
 * windows failed) comes back as the days that were readable, because half of
 * PTAX is still worth storing and the next run fills the rest.
 */
export async function fetchBrPtaxHistory(from: string, to: string): Promise<RegionalHistoryPoint[] | null> {
  const windows = sgsWindows(from, to);
  const sellRows: SgsRow[] = [];
  const buyRows: SgsRow[] = [];
  let answered = 0;

  for (const [start, end] of windows) {
    const [venda, compra] = await Promise.all([sgsRange(SGS_VENDA, start, end), sgsRange(SGS_COMPRA, start, end)]);
    if (Array.isArray(venda)) {
      answered++;
      sellRows.push(...venda);
    }
    if (Array.isArray(compra)) buyRows.push(...compra);
  }
  if (!answered) return null;

  const buyByDay = new Map<string, number>();
  for (const row of buyRows) {
    const day = String(row.data || "").split("/").reverse().join("-");
    const value = parseLocaleNumber(row.valor, "dot");
    if (day && value !== null) buyByDay.set(day, value);
  }

  const points: RegionalHistoryPoint[] = [];
  const seen = new Set<string>();
  for (const row of sellRows) {
    const day = String(row.data || "").split("/").reverse().join("-");
    const sell = parseLocaleNumber(row.valor, "dot");
    if (!day || sell === null || seen.has(day)) continue;
    seen.add(day);
    const buy = buyByDay.get(day) ?? null;
    points.push({
      key: "BR:ptax:USDBRL",
      country: "BR",
      market: "ptax",
      base: "USD",
      quote: "BRL",
      day,
      buy,
      sell,
      avg: buy !== null ? (buy + sell) / 2 : sell,
      source: meta.id,
    });
  }
  return points;
}
