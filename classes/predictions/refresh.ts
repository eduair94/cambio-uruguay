// Daily AI directional-lean prediction + external-forecast comparison per currency. Ported from
// app/server/utils/pricePrediction.ts (fetchAiAnalysis + recordTodayPrediction) and
// app/server/utils/externalForecasts.ts (searchExternalForecasts), with the Gemini plumbing
// replaced by classes/gemini.ts. Both legs are grounded (google_search) and fail independently —
// a currency failing one half never blocks the other; a currency Gemini can't reach that day just
// stores a null `ai` / empty `externalForecasts` for that row, same as the app did.
//
// Writes classes/models/PricePrediction.ts, which is bound to the APP's Mongo (classes/appdb.ts)
// — the SAME `pricepredictions` collection app/server/api/predictions/[currency].get.ts already
// reads. This is a ledger, never truncated: recordTodayPrediction upserts on (currency, date).
import { askGrounded, geminiConfigured, groundedHeadlines } from "../gemini";
import { PricePredictionModel } from "../models/PricePrediction";
import { computePeriodChanges, parseAiReply, type AiPredictionParsed, type PeriodChange } from "./prompt";
import { fetchRecentSeries, listActiveCurrencies } from "./series";

export { listActiveCurrencies };

/** Uruguay is UTC-3 year-round; shift then take the UTC date part. Verbatim port of
 *  app/utils/blog.ts#montevideoToday. */
function montevideoToday(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

const FORECAST_CURRENCIES = new Set(["USD", "EUR", "ARS", "BRL"]);

export interface ExternalForecast {
  source: string;
  link: string;
  direction: "up" | "down" | "flat" | null;
  summary: string;
}

/** True when Gemini's text reply signals no real citable forecast was found. */
function isNoForecastText(text: string): boolean {
  return /^\s*sin\s+pron(?:o|ó)sticos/i.test(text);
}

/** Best-effort directional read of a Spanish forecast summary. Order matters: check
 *  flat/estable before alza/baja substrings could false-match inside it. */
function detectDirection(summary: string): ExternalForecast["direction"] {
  const s = summary.toLowerCase();
  if (/estable|sin cambios|lateral/.test(s)) return "flat";
  if (/alza|suba|subir|aumento|apreciar/.test(s)) return "up";
  if (/bajar|descenso|depreciar|caída|baja/.test(s)) return "down";
  return null;
}

function buildForecastPrompt(currency: string): string {
  return (
    `Buscá pronósticos publicados en los últimos 30 días sobre el tipo de cambio ${currency}/UYU ` +
    `(o ${currency}/USD si no encontrás uno específico de UYU), de fuentes citables y con nombre ` +
    `(bancos, consultoras, analistas, encuestas oficiales como la Encuesta de Expectativas del BCU). ` +
    `Si no encontrás ninguna fuente real y citable, respondé exactamente 'SIN PRONOSTICOS'. ` +
    `Si encontrás alguna, resumí cada una en 1-2 frases en español, indicando la fuente y si el ` +
    `pronóstico es al alza, a la baja o estable.`
  );
}

/**
 * Grounded search for real, attributable, recently-published forecasts for `currency` vs UYU.
 * Only runs for USD/EUR/ARS/BRL — no one publishes forecasts for most other currencies vs UYU, so
 * other currencies always get an empty array (a valid state, not an error). Returns [] on any
 * failure, missing config, or a "nothing found" reply.
 */
async function searchExternalForecasts(currency: string): Promise<ExternalForecast[]> {
  if (!FORECAST_CURRENCIES.has(currency)) return [];
  if (!geminiConfigured()) return [];

  const reply = await askGrounded(buildForecastPrompt(currency));
  if (!reply || isNoForecastText(reply.text)) return [];

  const headlines = groundedHeadlines(reply, 5);
  if (headlines.length === 0) return [];

  return headlines.map((h) => ({
    source: h.source,
    link: h.link,
    direction: detectDirection(h.title),
    summary: h.title,
  }));
}

const CURRENCY_CONTEXT: Record<string, string> = {
  USD: "BCU y drivers globales (Fed, aranceles, geopolítica)",
  EUR: "BCE/eurozona además de los mismos drivers globales de USD",
  ARS: "BCRA/Argentina (bandas cambiarias, cepo, elecciones) además de efectos globales",
  BRL: "BCB/Brasil (Selic, fiscal) además de efectos globales",
};
const DEFAULT_CONTEXT = "drivers macroeconómicos globales (Fed, mercados emergentes, comercio internacional)";

function buildAiPrompt(currency: string, changes: PeriodChange[]): string {
  const changeLines = changes.length
    ? changes.map((c) => `${c.period}: ${c.pctChange >= 0 ? "+" : ""}${c.pctChange}%`).join(", ")
    : "sin datos suficientes de variación reciente";
  const context = CURRENCY_CONTEXT[currency] ?? DEFAULT_CONTEXT;
  return (
    `Sos un analista cambiario. El tipo de cambio ${currency}/UYU tuvo esta variación reciente: ${changeLines}. ` +
    `Considerá: ${context}. Buscá noticias y contexto reciente (últimos 7 días) relevante para este par. ` +
    `Respondé EXACTAMENTE en este formato, sin texto adicional:\n` +
    `LEAN: up|down|flat\n` +
    `CONFIANZA: alta|media|baja\n` +
    `RAZONAMIENTO: <2 a 4 frases en español, basadas solo en los datos y noticias reales que encontraste>\n` +
    `No inventes un valor futuro exacto del tipo de cambio. Aclará que el mercado es impredecible y esto no es asesoramiento financiero.`
  );
}

async function fetchAiAnalysis(currency: string, changes: PeriodChange[]): Promise<AiPredictionParsed | null> {
  if (!geminiConfigured()) return null;
  const reply = await askGrounded(buildAiPrompt(currency, changes));
  if (!reply) return null;
  return parseAiReply(reply.text);
}

/**
 * Upserts today's (or `asOfOverride`'s) PricePrediction doc for `currency`: AI directional-lean
 * analysis (all currencies) + external forecast comparison (USD/EUR/ARS/BRL only, empty array
 * otherwise). Each half fails independently — one Gemini call failing never blocks the other.
 * Idempotent.
 */
export async function recordTodayPrediction(
  currency: string,
  asOfOverride?: string
): Promise<{ recorded: boolean; date: string }> {
  const asOf = asOfOverride ?? montevideoToday();

  const series = await fetchRecentSeries(currency);
  const changes = computePeriodChanges(series);

  const [aiParsed, externalForecasts] = await Promise.all([
    fetchAiAnalysis(currency, changes).catch(() => null),
    searchExternalForecasts(currency).catch(() => []),
  ]);

  const ai = aiParsed
    ? { lean: aiParsed.lean, confidence: aiParsed.confidence, reasoning: aiParsed.reasoning, basedOn: changes }
    : null;

  await PricePredictionModel.updateOne({ currency, date: asOf }, { $set: { ai, externalForecasts } }, { upsert: true });
  return { recorded: true, date: asOf };
}
