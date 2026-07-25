// Weekly r/CharruaDevs chair-review harvest + Gemini sentiment classification.
// Reddit and Gemini run only here in the backend. The Nuxt app reads the materialized snapshot
// from its own MongoDB and never calls either provider during a page request.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import { geminiConfigured } from "./classes/gemini";
import { redditConfigured } from "./classes/reddit";
import { buildChairTierSnapshot } from "./classes/chairs/analyze";
import { harvestChairDiscussions, readChairCorpus } from "./classes/chairs/harvest";
import { loadChairTierSnapshot, saveChairTierSnapshot } from "./classes/chairs/store";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  // The app's existing env names this value MONGO_URI. The root bridge deliberately requires
  // APP_MONGO_URI so it cannot accidentally write to cambio-uy; map it explicitly for this job.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;

  if (!appDbConfigured()) {
    console.error("[chair-tiers] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }
  if (!redditConfigured()) {
    console.warn("[chair-tiers] Reddit credentials are missing — keeping the stored snapshot");
    process.exit(0);
  }
  if (!geminiConfigured()) {
    console.warn(
      "[chair-tiers] Gemini credentials are missing — using the local conservative classifier"
    );
  }

  const harvest = await harvestChairDiscussions("all");
  const previous = await loadChairTierSnapshot();
  const force = process.argv.includes("--force") || process.env.FORCE_CHAIR_TIERS === "1";
  if (
    !force &&
    previous?.asOf &&
    harvest.commentsStored === 0 &&
    Date.now() - Date.parse(previous.asOf) < THIRTY_DAYS_MS
  ) {
    console.log("[chair-tiers] no new comments and snapshot is < 30 days old, skipping analysis");
    process.exit(0);
  }

  const corpus = await readChairCorpus();
  const snapshot = await buildChairTierSnapshot(corpus.comments, corpus.threads);
  if (!snapshot) {
    console.warn("[chair-tiers] no usable classified mentions — keeping the stored snapshot");
    process.exit(0);
  }
  await saveChairTierSnapshot(snapshot);
  console.log(
    `[chair-tiers] updated ${snapshot.tiers.length} ranked + ${snapshot.watchlist.length} observed chairs from ${snapshot.corpus.comments} comments`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("[chair-tiers] sync failed", error);
  process.exit(1);
});
