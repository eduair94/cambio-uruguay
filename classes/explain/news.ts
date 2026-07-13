// Grounded news search for a notable currency move (port of app/server/utils/geminiNews.ts onto
// classes/gemini.ts), plus a read-only lookup of the archived headline feed for the fallback path.
//
// The archived feed (classes/models/PriceNews.ts, app Mongo) is USD-only — nitro's drivers:daily
// still writes it (archiveTodayNews('USD'), not Gemini, so that stage did not move). For EUR/ARS
// there is simply no archived-headline fallback, same as today.
import { askGrounded, groundedHeadlines, type GroundedHeadline } from "../gemini";
import { PriceNewsModel } from "../models/PriceNews";

export interface MoveNewsResult {
  headlines: GroundedHeadline[];
  narrative: string | null;
}

const DRIVER_CONTEXT: Record<string, string> = {
  USD: "para USD, BCU y drivers globales (Fed, aranceles, geopolítica)",
  EUR: "para EUR, BCE/eurozona además de los mismos drivers globales de USD (el EUR/UYU se ancla en BROU, no en BCU)",
  ARS: "para ARS, BCRA/Argentina (bandas cambiarias, cepo, elecciones) además de efectos globales",
};

/** True when Gemini's text reply signals it found nothing real (case-insensitive prefix match).
 *  Verbatim port of app/utils/geminiGrounding.ts#isNoNewsText. */
function isNoNewsText(text: string): boolean {
  return /^\s*sin noticias/i.test(text);
}

function buildPrompt(
  currency: string,
  date: string,
  pctChange: number,
  direction: "up" | "down" | "flat",
  drivers: { key: string; dayMovePct: number }[]
): string {
  const verb = direction === "down" ? "bajó" : "subió";
  const driverLines = drivers.length
    ? drivers.map((d) => `${d.key} ${d.dayMovePct >= 0 ? "+" : ""}${d.dayMovePct.toFixed(2)}%`).join(", ")
    : "sin datos de drivers disponibles";
  const context = DRIVER_CONTEXT[currency] ?? DRIVER_CONTEXT.USD;
  return (
    `El ${currency}/UYU ${verb} ${Math.abs(pctChange).toFixed(2)}% el ${date}. ` +
    `Ese día se movieron estos indicadores: ${driverLines}. ` +
    `Buscá noticias reales, fechadas ese día o +/-1 día, que puedan explicar este movimiento. ` +
    `Considerá: ${context}. ` +
    `Si no encontrás nada realmente relevante, respondé exactamente 'SIN NOTICIAS'. ` +
    `Si encontrás algo, escribí una explicación breve (2-3 frases, en español), ` +
    `basada solo en lo que encontraste — no inventes causas ni datos.`
  );
}

/**
 * Grounded search for real, dated news explaining a notable move. Returns null on any failure,
 * missing config, or a "nothing found" reply — the caller falls back to the archived-headline +
 * plain-AI narrative path.
 */
export async function searchMoveNews(
  currency: string,
  date: string,
  pctChange: number,
  direction: "up" | "down" | "flat",
  drivers: { key: string; dayMovePct: number }[]
): Promise<MoveNewsResult | null> {
  const reply = await askGrounded(buildPrompt(currency, date, pctChange, direction, drivers));
  if (!reply || isNoNewsText(reply.text)) return null;

  const headlines = groundedHeadlines(reply, 5);
  if (headlines.length === 0) return null;

  return { headlines, narrative: reply.text };
}

/** Today's archived headlines for `currency` (USD only has any), read-only. */
export async function loadArchivedHeadlines(
  currency: string,
  date: string
): Promise<{ title: string; source: string; link: string }[]> {
  const doc = await PriceNewsModel.findOne({ currency, date }).lean();
  const headlines = (doc as unknown as { headlines?: Array<{ title: string; source: string; link: string }> } | null)
    ?.headlines;
  return headlines ?? [];
}
