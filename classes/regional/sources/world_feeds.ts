// Las referencias internacionales, en plural y a propósito.
//
// El 21 de agosto de 2026 el feed que era la única referencia del tablero
// publicó el boliviano 39 % abajo, el peso uruguayo 12 % abajo, el chileno 11 %
// abajo y el guaraní 8 % arriba — mientras seguía acertando el peso argentino y
// el real. Ninguna banda de valores lo detecta: 818 pesos chilenos por dólar es
// perfectamente posible en abstracto. Lo único que lo detecta es preguntarle a
// otro.
//
// Así que ahora son cuatro feeds independientes cotizando exactamente el mismo
// mercado (`XX:internacional:USDXXX`), y el validador hace el resto: con tres o
// más fuentes sobre un mismo mercado, la que se aleja de la mediana queda
// afuera. Medido el 22 de agosto de 2026 contra las fuentes nacionales, los
// otros tres coincidían dentro del 1 % en las seis monedas.
//
// Ninguno de estos es un precio al que se opere: son promedios de mercado
// mayorista, publicados una vez por día. Sirven para dos cosas —que un país sin
// fuentes propias vivas siga teniendo una línea, y que las fuentes nacionales
// tengan contra qué contrastarse— y para ninguna más.
import { fetchJson } from "../net";
import { makeQuote } from "../quote";
import type { RegionalCountry, RegionalQuote, RegionalSourceMeta } from "../types";

/** Moneda -> país cuya fila del tablero le corresponde. */
const COUNTRY_OF: Record<string, RegionalCountry> = {
  ARS: "AR",
  BRL: "BR",
  CLP: "CL",
  PYG: "PY",
  BOB: "BO",
  UYU: "UY",
};

/** Convierte un mapa `{moneda: unidades por dólar}` en filas del tablero. */
function fromRateMap(
  rates: Record<string, unknown>,
  meta: RegionalSourceMeta,
  sourceUrl: string,
  updatedAt: string | null,
  read: (value: unknown) => number | null
): RegionalQuote[] {
  const quotes: RegionalQuote[] = [];
  for (const [code, country] of Object.entries(COUNTRY_OF)) {
    const value = read(rates[code] ?? rates[code.toLowerCase()]);
    if (value === null) continue;
    const quote = makeQuote({
      country,
      market: "internacional",
      label: "Referencia internacional (mid-market)",
      kind: "reference",
      base: "USD",
      quote: code,
      avg: value,
      updatedAt,
      source: meta.id,
      sourceUrl,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}

const numberOrNull = (value: unknown): number | null => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// --- Currency API (fawazahmed0, servido por jsDelivr) ------------------------

export const currencyApiMeta: RegionalSourceMeta = {
  id: "world_currencyapi",
  name: "Currency API (jsDelivr)",
  country: "UY",
  global: true,
  url: "https://github.com/fawazahmed0/exchange-api",
  access: "api",
  publisher: "market-data",
  covers: "Referencia diaria del dólar contra las seis monedas de la región. Una de las cuatro que se contrastan entre sí.",
};

const CURRENCY_API_URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

interface CurrencyApiResponse {
  date?: string;
  usd?: Record<string, number>;
}

export function parseCurrencyApi(payload: CurrencyApiResponse | null): RegionalQuote[] {
  if (!payload?.usd) return [];
  return fromRateMap(
    payload.usd,
    currencyApiMeta,
    CURRENCY_API_URL,
    payload.date ? `${payload.date}T00:00:00Z` : null,
    numberOrNull
  );
}

export async function fetchWorldCurrencyApi(): Promise<RegionalQuote[]> {
  return parseCurrencyApi(await fetchJson<CurrencyApiResponse>(CURRENCY_API_URL));
}

// --- FloatRates --------------------------------------------------------------

export const floatRatesMeta: RegionalSourceMeta = {
  id: "world_floatrates",
  name: "FloatRates",
  country: "UY",
  global: true,
  url: "https://www.floatrates.com/",
  access: "api",
  publisher: "market-data",
  covers: "Segunda referencia diaria independiente, con su propia fecha de publicación por moneda.",
};

const FLOATRATES_URL = "https://www.floatrates.com/daily/usd.json";

interface FloatRatesRow {
  code?: string;
  rate?: number | string;
  date?: string;
}

export function parseFloatRates(payload: Record<string, FloatRatesRow> | null): RegionalQuote[] {
  if (!payload) return [];
  const quotes: RegionalQuote[] = [];
  for (const [code, country] of Object.entries(COUNTRY_OF)) {
    const row = payload[code.toLowerCase()];
    const value = numberOrNull(row?.rate);
    if (value === null) continue;
    const quote = makeQuote({
      country,
      market: "internacional",
      label: "Referencia internacional (mid-market)",
      kind: "reference",
      base: "USD",
      quote: code,
      avg: value,
      updatedAt: row?.date ?? null,
      source: floatRatesMeta.id,
      sourceUrl: FLOATRATES_URL,
    });
    if (quote) quotes.push(quote);
  }
  return quotes;
}

export async function fetchWorldFloatRates(): Promise<RegionalQuote[]> {
  return parseFloatRates(await fetchJson<Record<string, FloatRatesRow>>(FLOATRATES_URL));
}

// --- Coinbase ----------------------------------------------------------------

export const coinbaseMeta: RegionalSourceMeta = {
  id: "world_coinbase",
  name: "Coinbase",
  country: "UY",
  global: true,
  url: "https://docs.cdp.coinbase.com/",
  access: "api",
  publisher: "market-data",
  covers: "Tercera referencia independiente: el tipo de cambio que Coinbase publica para monedas fiat, sin clave ni registro.",
};

const COINBASE_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";

interface CoinbaseResponse {
  data?: { currency?: string; rates?: Record<string, string> };
}

export function parseCoinbase(payload: CoinbaseResponse | null): RegionalQuote[] {
  const rates = payload?.data?.rates;
  if (!rates) return [];
  // Coinbase no publica la fecha de la tasa: la lectura es la estampa.
  return fromRateMap(rates, coinbaseMeta, COINBASE_URL, null, numberOrNull);
}

export async function fetchWorldCoinbase(): Promise<RegionalQuote[]> {
  return parseCoinbase(await fetchJson<CoinbaseResponse>(COINBASE_URL));
}
