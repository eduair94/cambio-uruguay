// If today (or `asOfOverride`) is a notable move day for `currency`, upsert its MoveExplanation.
// Tries a live Gemini-grounded news search first (real cited headlines + a narrative grounded in
// them); falls back to the original path — archived-feed headlines (USD only) + a narrative built
// purely from measured attribution via classes/ai_service.ts's plain classify() — when Gemini is
// unconfigured, fails, or finds nothing real. No-ops if the target date isn't a notable move.
// Idempotent — safe to call repeatedly (e.g. re-running sync_explain.ts later that day repairs a
// row if drivers:daily was slow or failed that morning).
//
// Writes classes/models/MoveExplanation.ts, bound to the APP's Mongo (classes/appdb.ts) — the
// SAME `moveexplanations` collection app/server/api/analysis/[currency].get.ts already reads, and
// that also holds hand-researched historical rows from POST /api/analysis/backfill. Never
// truncated, never forked.
import { aiService } from "../ai_service";
import { MoveExplanationModel } from "../models/MoveExplanation";
import { attributeMove, loadDriverSeries, findNotableMove } from "./moves";
import { loadArchivedHeadlines, searchMoveNews } from "./news";

/** Uruguay is UTC-3 year-round; shift then take the UTC date part. Verbatim port of
 *  app/utils/blog.ts#montevideoToday. */
function montevideoToday(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export async function recordTodayExplanation(
  currency: string,
  asOfOverride?: string
): Promise<{ recorded: boolean; date: string }> {
  const asOf = asOfOverride ?? montevideoToday();

  const today = await findNotableMove(currency, asOf);
  if (!today) return { recorded: false, date: asOf };

  const driverSeries = await loadDriverSeries(currency);
  const attribution = attributeMove(asOf, driverSeries).slice(0, 5);
  const drivers = attribution.map((d) => ({ key: d.key, dayMovePct: d.dayMovePct }));

  const grounded = await searchMoveNews(currency, asOf, today.pctChange, today.direction, drivers).catch(
    () => null
  );

  let narrative: string | null;
  let storedHeadlines: { title: string; source: string; link: string }[];

  if (grounded) {
    narrative = grounded.narrative;
    storedHeadlines = grounded.headlines;
  } else {
    const directionWord = today.direction === "down" ? "bajó" : "subió";
    const driverLines = attribution
      .map((d) => `${d.key} ${d.dayMovePct >= 0 ? "+" : ""}${d.dayMovePct.toFixed(2)}%`)
      .join(", ");
    const prompt =
      "Sos un analista financiero que explica movimientos cambiarios en Uruguay en 2-3 frases " +
      "claras, en español, sin inventar datos ni noticias.\n\n" +
      `El ${currency}/UYU ${directionWord} ${Math.abs(today.pctChange).toFixed(2)}% el ${asOf}. ` +
      `Ese día se movieron estos indicadores: ${driverLines || "sin datos de drivers disponibles"}. ` +
      `Explicá brevemente qué pudo influir, basándote solo en estos datos (correlación, no ` +
      `causalidad; no afirmes causas que no estén en los datos).`;
    narrative = await aiService.classify(prompt).catch(() => null);
    // buildAnalysis's / the archive's headlines carry an extra `pubDate` field that
    // MoveExplanationDoc doesn't declare — loadArchivedHeadlines already strips it.
    storedHeadlines = await loadArchivedHeadlines(currency, asOf).catch(() => []);
  }

  // `narrative`/`headlines` are the only fields a generating call can genuinely FAIL to produce
  // (vs. drivers/pctChange/direction, which are always computed locally). Re-running this job
  // later the same day is the documented repair path for a morning Gemini outage (see the header
  // comment) — but a plain unconditional $set would overwrite a good morning row with `narrative:
  // null` the moment the afternoon re-run's generating call also fails, destroying it instead of
  // repairing it. So: only include a field in $set when this run actually produced something: on
  // upsert (brand-new row) the schema's own `default: null` / `default: []` still applies, and on
  // update (existing row) the previous good value is left untouched.
  const setFields: Record<string, unknown> = {
    pctChange: today.pctChange,
    direction: today.direction,
    drivers,
  };
  if (narrative !== null) setFields.narrative = narrative;
  if (storedHeadlines.length > 0) setFields.headlines = storedHeadlines;

  await MoveExplanationModel.updateOne({ currency, date: asOf }, { $set: setFields }, { upsert: true });
  return { recorded: true, date: asOf };
}
