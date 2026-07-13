// Pure prediction-analysis helpers, ported verbatim from app/server/utils/pricePrediction.ts's
// non-networked functions: the fixed LEAN/CONFIANZA/RAZONAMIENTO reply parser, the 7d/30d/90d
// period-change calculator, and the tradeable-currency filter.
export interface SeriesPoint {
  date: string;
  value: number;
}

export interface PeriodChange {
  period: "7d" | "30d" | "90d";
  pctChange: number;
}

/**
 * Approximate N-day-ago lookup by array index (one point ≈ one day, matching how every other
 * historico series in this app is already treated). Not a calendar-exact lookup.
 */
export function computePeriodChanges(series: SeriesPoint[]): PeriodChange[] {
  if (series.length < 2) return [];
  const latest = series[series.length - 1]!.value;
  const windows: { period: PeriodChange["period"]; days: number }[] = [
    { period: "7d", days: 7 },
    { period: "30d", days: 30 },
    { period: "90d", days: 90 },
  ];
  const out: PeriodChange[] = [];
  for (const { period, days } of windows) {
    const idx = Math.max(0, series.length - 1 - days);
    const anchor = series[idx];
    if (!anchor || anchor.value === 0) continue;
    const pctChange = Number((((latest - anchor.value) / anchor.value) * 100).toFixed(2));
    out.push({ period, pctChange });
  }
  return out;
}

export interface AiPredictionParsed {
  lean: "up" | "down" | "flat";
  confidence: "low" | "medium" | "high";
  reasoning: string;
}

const CONFIDENCE_MAP: Record<string, AiPredictionParsed["confidence"]> = {
  alta: "high",
  media: "medium",
  baja: "low",
};

/** Parses the fixed LEAN/CONFIANZA/RAZONAMIENTO reply format from the AI prompt. */
export function parseAiReply(text: string): AiPredictionParsed | null {
  const leanMatch = /LEAN:\s*(up|down|flat)/i.exec(text);
  const confMatch = /CONFIANZA:\s*(alta|media|baja)/i.exec(text);
  const reasonMatch = /RAZONAMIENTO:\s*([\s\S]+)/i.exec(text);
  if (!leanMatch || !confMatch || !reasonMatch) return null;
  const reasoning = reasonMatch[1]!.trim();
  if (!reasoning) return null;
  return {
    lean: leanMatch[1]!.toLowerCase() as AiPredictionParsed["lean"],
    confidence: CONFIDENCE_MAP[confMatch[1]!.toLowerCase()]!,
    reasoning,
  };
}

// UI (Unidad Indexada) and UR (Unidad Reajustable) ride the same live feed as tradeable
// currencies but are inflation/legal-adjustment units, not currencies with a real buy/sell market
// vs UYU. An AI directional lean for them is meaningless and wastes a daily Gemini call.
const NON_TRADEABLE_CODES = new Set(["UI", "UR"]);

/** Whether `code` represents a real tradeable currency (or metal) vs UYU. */
export function isPredictableCurrencyCode(code: string): boolean {
  return !NON_TRADEABLE_CODES.has(code);
}
