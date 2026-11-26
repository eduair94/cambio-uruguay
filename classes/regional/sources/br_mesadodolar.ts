// Brasil — Mesa do Dólar (mesadodolar.com.br).
//
// Until this source, every Brazilian market on the board had exactly one
// publisher: the BCB for PTAX, AwesomeAPI for the commercial and tourism rates.
// One publisher per market is the blind spot the catalog exists to avoid — the
// pipeline cannot tell "the real moved" from "the only feed broke". Mesa do
// Dólar publishes a free, keyless JSON API (60 requests a minute per IP; we use
// three every ten minutes) and offered it to us as a source on 2026-11-26.
// Their one condition is attribution: "Fuente: Mesa do Dólar", linked.
//
// Three readings, each with a different job:
//
//   * `/ptax` — the BCB fixing, read through a second path. The BCB itself
//     outranks it in the dedupe, so on a normal day this row only shows up as
//     corroboration; the day Olinda and SGS are both down, it is the PTAX.
//   * `/cotacao` — the B3 spot dollar (à vista), which is what Brazilian media
//     call "o dólar". A second reading of the commercial market. It comes as a
//     single price, 15 minutes late during the session; with the market closed
//     it is the 17:00 close, and `momento` says so. We keep that stamp rather
//     than the time we asked: a close dated "now" would look like a live price.
//   * `/digital` — USDT/BRL from Binance and Foxbit. A market of its own, not a
//     second opinion on anything: it trades around the clock, so it is the only
//     Brazilian price on the board that moves on a weekend. `financial` kind, the
//     same slot as Argentina's dólar cripto — the board row never picks it, so
//     it changes no gap and no route.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalQuote, RegionalSourceMeta } from "../types";

export const meta: RegionalSourceMeta = {
  id: "br_mesadodolar",
  name: "Mesa do Dólar",
  country: "BR",
  url: "https://mesadodolar.com.br/es/api-publica",
  access: "api",
  publisher: "market-data",
  covers:
    "Segunda lectura del fixing PTAX y del dólar comercial (el contado de B3), y el dólar cripto brasileño (USDT/BRL), el único precio de Brasil que se mueve también el fin de semana.",
};

const BASE = "https://mesadodolar.com.br/api/v1";
const PTAX_URL = `${BASE}/ptax`;
const COTACAO_URL = `${BASE}/cotacao`;
const DIGITAL_URL = `${BASE}/digital`;

/** Every endpoint wraps its answer in `dados`; an error comes as `erro` instead. */
interface Envelope<T> {
  dados?: T;
}

interface PtaxData {
  data?: string;
  compra?: number;
  venda?: number;
}

interface CotacaoData {
  preco?: number;
  momento?: string;
  variacao_pct?: number;
}

interface DigitalData {
  usdt_brl?: {
    preco?: number;
    compra?: number;
    venda?: number;
    variacao_24h_pct?: number;
    consultado_em?: string;
  };
}

const dataOf = <T>(payload: unknown): T | null => {
  const dados = (payload as Envelope<T> | null)?.dados;
  return dados && typeof dados === "object" ? dados : null;
};

/**
 * The PTAX is published around 13:00 Brasília time. The endpoint only gives the
 * day, so the stamp is that day at 13:00 — the same convention `br_bcb` uses
 * for its SGS fallback. On a holiday `data` is the last business day, and that
 * is the date we keep: the fixing did not happen today.
 */
export function parseMesaPtax(payload: unknown): RegionalQuote[] {
  const dados = dataOf<PtaxData>(payload);
  if (!dados?.data || !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) return [];
  const quote = makeQuote({
    country: "BR",
    market: "ptax",
    label: "Dólar PTAX (fixing oficial)",
    kind: "official",
    base: "USD",
    quote: "BRL",
    buy: dados.compra,
    sell: dados.venda,
    updatedAt: `${dados.data}T13:00:00-03:00`,
    source: meta.id,
    sourceUrl: PTAX_URL,
  });
  return quote ? [quote] : [];
}

export function parseMesaCotacao(payload: unknown): RegionalQuote[] {
  const dados = dataOf<CotacaoData>(payload);
  // No stamp, no row: `makeQuote` would date it "now", and with the market
  // closed this price is the 17:00 close — a close dated now reads as live.
  if (!dados?.momento) return [];
  const quote = makeQuote({
    country: "BR",
    market: "comercial",
    label: "Dólar comercial",
    kind: "wholesale",
    base: "USD",
    quote: "BRL",
    avg: dados.preco,
    variationPct: typeof dados.variacao_pct === "number" ? dados.variacao_pct : null,
    updatedAt: dados.momento,
    source: meta.id,
    sourceUrl: COTACAO_URL,
  });
  return quote ? [quote] : [];
}

export function parseMesaDigital(payload: unknown): RegionalQuote[] {
  const usdt = dataOf<DigitalData>(payload)?.usdt_brl;
  if (!usdt) return [];
  const quote = makeQuote({
    country: "BR",
    market: "cripto",
    label: "Dólar cripto (USDT)",
    kind: "financial",
    base: "USD",
    quote: "BRL",
    buy: usdt.compra,
    sell: usdt.venda,
    // With both sides the mid is derived like every other row; `preco` (the
    // last trade) only stands in when a side is missing.
    avg: usdt.compra && usdt.venda ? null : usdt.preco,
    variationPct: typeof usdt.variacao_24h_pct === "number" ? usdt.variacao_24h_pct : null,
    updatedAt: usdt.consultado_em,
    source: meta.id,
    sourceUrl: DIGITAL_URL,
  });
  return quote ? [quote] : [];
}

export async function fetchBrMesaDoDolar(): Promise<RegionalQuote[]> {
  // Same host, so `net.ts` queues the three requests with its usual gap.
  const [ptax, cotacao, digital] = await Promise.all([
    fetchJson<unknown>(PTAX_URL),
    fetchJson<unknown>(COTACAO_URL),
    fetchJson<unknown>(DIGITAL_URL),
  ]);
  return [...parseMesaPtax(ptax), ...parseMesaCotacao(cotacao), ...parseMesaDigital(digital)];
}
