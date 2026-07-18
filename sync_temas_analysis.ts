// Quarterly AI analysis of consulted money topics for the app's /mapa-de-temas (pm2 app
// `currency-temas-analysis`). Fires DAILY but self-gates to 90 days on the stored `asOf`, so the
// cadence is 90 days without relying on a drift-prone every-90-days cron. Never blanks the stored
// analysis on a failure — a failed run just keeps the previous good analysis (or the app baseline).
import dotenv from "dotenv";
dotenv.config();

import { geminiConfigured } from "./classes/gemini";
import { appDbConfigured } from "./classes/appdb";
import { readAppTopics } from "./classes/temas-analysis/appTopics";
import { refreshTemasAnalysis } from "./classes/temas-analysis/refresh";
import { loadTemasAnalysis, saveTemasAnalysis } from "./classes/temas-analysis/store";
import { MongooseServer, withTimeout } from "./classes/database";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  // classes/temas-analysis/store.ts reads/writes through the default mongoose connection, which
  // nothing else in this process opens — without this, every Mongo call buffers and times out.
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[temas-analysis] cannot reach MongoDB — refusing to run silently:", e?.message || e);
    process.exit(1);
  }

  // 90-day gate: the cron fires daily, but we only regenerate once a quarter.
  const stored = await loadTemasAnalysis();
  if (stored?.asOf && Date.now() - Date.parse(stored.asOf) < NINETY_DAYS_MS) {
    console.log("[temas-analysis] stored analysis is < 90 days old, skipping");
    process.exit(0);
  }

  if (!geminiConfigured()) {
    console.warn("[temas-analysis] no GEMINI_API_KEY — keeping the stored analysis");
    process.exit(0);
  }
  if (!appDbConfigured()) {
    console.warn("[temas-analysis] APP_MONGO_URI not set — cannot read the topic ranking, skipping");
    process.exit(0);
  }

  let topics;
  try {
    topics = await readAppTopics();
  } catch (e) {
    console.error("[temas-analysis] failed to read app topics — keeping the stored analysis", e);
    process.exit(0);
  }
  if (!topics.length) {
    console.warn("[temas-analysis] no published topics found — keeping the stored analysis");
    process.exit(0);
  }

  try {
    const analysis = await refreshTemasAnalysis(topics);
    if (!analysis.overview.length) {
      console.warn("[temas-analysis] nothing usable came back — keeping the previous analysis");
      process.exit(0);
    }
    await saveTemasAnalysis(analysis);
    console.log(
      `[temas-analysis] updated: ${analysis.overview.length} paragraphs, ${analysis.topics.length} topic insights`
    );
  } catch (e) {
    console.error("[temas-analysis] refresh failed — keeping the previous analysis", e);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[temas-analysis] sync failed", e);
  process.exit(1);
});
