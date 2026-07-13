// Bank/fintech news briefing (pm2 app `currency-banks-news`, daily 10:37 UTC ≈ 07:37 Uruguay).
//
// Three languages, each independent: a failed language keeps its previous stored briefing rather
// than blanking it. 10:37 is not a multiple of 5 (currency-sync is */5) and sits clear of the Reddit
// jobs (nitro reddit:sentiment at 10:10, currency-aduana Mondays 09:30).
import dotenv from "dotenv";
dotenv.config();

import { buildBanksBriefing, type Lang } from "./classes/banks/news";
import { geminiConfigured } from "./classes/gemini";
import { saveBriefing } from "./classes/banks/store";

const LANGS: Lang[] = ["es", "en", "pt"];

async function main(): Promise<void> {
  if (!geminiConfigured()) {
    console.warn("[banks-news] no GEMINI_API_KEY — nothing to do, keeping the stored briefings");
    process.exit(0);
  }
  for (const lang of LANGS) {
    try {
      const briefing = await buildBanksBriefing(lang);
      if (!briefing.items.length) {
        console.warn(`[banks-news] ${lang}: nothing found, keeping the previous briefing`);
        continue;
      }
      await saveBriefing(lang, briefing);
      console.log(`[banks-news] ${lang}: ${briefing.items.length} entities, analysis=${!!briefing.analysis}`);
    } catch (e) {
      console.error(`[banks-news] ${lang} failed, keeping the previous briefing`, e);
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[banks-news] sync failed", e);
  process.exit(1);
});
