// Weekly customs sync (pm2 app `currency-aduana`, Mondays 08:40 UTC ≈ 05:40 Uruguay).
//
// Three stages, each independent: harvest new r/uruguay threads → label only what is new →
// re-check the legal facts. If Reddit is down the facts still get checked; if the AI is down the
// old quotes keep serving. No stage ever blanks good data, and the norms gate means the AI can
// flag a change of law but not publish one.
import dotenv from "dotenv";
dotenv.config();

import { aggregateFromCorpus, refreshLabels } from "./classes/aduana/classify";
import { harvestAduana } from "./classes/aduana/harvest";
import { refreshNorms } from "./classes/aduana/norms";
import { loadAduanaDoc, saveAduanaDoc } from "./classes/aduana/store";

async function main(): Promise<void> {
  let doc = await loadAduanaDoc();

  let posts = 0;
  let comments = 0;
  try {
    const harvested = await harvestAduana();
    posts = harvested.posts;
    comments = harvested.comments;
  } catch (e) {
    console.error("[aduana] harvest failed, keeping the stored corpus", e);
  }

  let labeled = 0;
  try {
    labeled = (await refreshLabels()).labeled;
    const { quotes, counts } = await aggregateFromCorpus();
    doc.quotes = quotes;
    doc.counts = counts;
  } catch (e) {
    console.error("[aduana] labelling failed, keeping the previous quotes", e);
  }

  // Identity comparison, same technique refreshNorms uses internally: a fact object comes back
  // unchanged (by reference) unless the AI's re-read confirmed it, so diffing before/after by
  // identity is how many facts got a fresh `aiCheckedAt` this run — without trusting date strings.
  const factsBefore = doc.facts;
  try {
    doc = await refreshNorms(doc);
  } catch (e) {
    console.error("[aduana] norms check failed, keeping the last-good facts", e);
  }
  const confirmed = doc.facts.filter((f, i) => f !== factsBefore[i]).length;

  doc.updatedAt = new Date().toISOString();
  await saveAduanaDoc(doc);

  console.log(
    `[aduana] sync summary: threads=${posts} comments=${comments} labeled=${labeled} facts=${doc.facts.length} confirmed=${confirmed} flagged=${doc.pendingReview.length}`
  );

  // pendingReview is the human's alarm bell: never let this go unlogged when it is non-empty.
  if (doc.pendingReview.length) {
    console.warn(`[aduana] NEEDS A HUMAN — facts the AI wants to change: ${doc.pendingReview.join(", ")}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[aduana] sync failed", e);
  process.exit(1);
});
