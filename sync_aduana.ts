// Weekly customs sync (pm2 app `currency-aduana`, Mondays 09:30 UTC ≈ 06:30 Uruguay).
//
// Three stages, each independent: harvest new r/uruguay threads → label only what is new →
// re-check the legal facts. If Reddit is down the facts still get checked; if the AI is down the
// old quotes keep serving. No stage ever blanks good data, and the norms gate means the AI can
// flag a change of law but not publish one.
import dotenv from "dotenv";
dotenv.config();

import { aiService } from "./classes/ai_service";
import { aggregateFromCorpus, refreshLabels } from "./classes/aduana/classify";
import { geminiConfigured } from "./classes/aduana/gemini";
import { harvestAduana } from "./classes/aduana/harvest";
import { refreshNorms } from "./classes/aduana/norms";
import { loadAduanaDoc, saveAduanaDoc } from "./classes/aduana/store";
import { redditConfigured } from "./classes/reddit";

async function main(): Promise<void> {
  let doc = await loadAduanaDoc();

  // Each stage is checked for credentials BEFORE it runs, independent of what it finds — a stage
  // that ran and genuinely found nothing new (0 new threads, 0 new labels, every norm confirmed
  // unchanged) still counts as having done real work; a stage that never ran because a key is
  // missing does not. `updatedAt` — and therefore the footer's "Actualizado el ..." and the
  // `stale` alarm two weeks later — is bumped only if at least one stage actually ran. Before this
  // fix, `doc.updatedAt` was stamped unconditionally: with no GEMINI_API_KEY in the root .env (see
  // the plan's Deploy section) and Reddit's creds also missing, the job "succeeded" having done
  // nothing, the page kept claiming a fresh sync every week, and `stale` could never fire.
  const redditWasConfigured = redditConfigured();
  const aiWasConfigured = aiService.isConfigured();
  const geminiWasConfigured = geminiConfigured();

  let posts = 0;
  let comments = 0;
  let harvestRan = false;
  try {
    if (redditWasConfigured) {
      const harvested = await harvestAduana();
      posts = harvested.posts;
      comments = harvested.comments;
      harvestRan = true;
    }
  } catch (e) {
    console.error("[aduana] harvest failed, keeping the stored corpus", e);
  }

  let labeled = 0;
  let labelRan = false;
  try {
    if (aiWasConfigured) {
      labeled = (await refreshLabels()).labeled;
      const { quotes, counts } = await aggregateFromCorpus();
      doc.quotes = quotes;
      doc.counts = counts;
      labelRan = true;
    }
  } catch (e) {
    console.error("[aduana] labelling failed, keeping the previous quotes", e);
  }

  // Identity comparison, same technique refreshNorms uses internally: a fact object comes back
  // unchanged (by reference) unless the AI's re-read confirmed it, so diffing before/after by
  // identity is how many facts got a fresh `aiCheckedAt` this run — without trusting date strings.
  const factsBefore = doc.facts;
  let normsRan = false;
  try {
    if (geminiWasConfigured) {
      doc = await refreshNorms(doc);
      normsRan = true;
    }
  } catch (e) {
    console.error("[aduana] norms check failed, keeping the last-good facts", e);
  }
  const confirmed = doc.facts.filter((f, i) => f !== factsBefore[i]).length;

  const ranAnyStage = harvestRan || labelRan || normsRan;
  if (ranAnyStage) {
    doc.updatedAt = new Date().toISOString();
  } else {
    console.warn(
      "[aduana] sync did NOTHING this run — no credentials configured for any stage (Reddit, AI labelling, Gemini norms). updatedAt is NOT being bumped: a doc nobody touched must not claim to be fresh."
    );
  }
  await saveAduanaDoc(doc);

  console.log(
    `[aduana] sync summary: threads=${posts} comments=${comments} labeled=${labeled} facts=${doc.facts.length} confirmed=${confirmed} flagged=${doc.pendingReview.length}`
  );
  console.log(
    `[aduana] stages: harvest=${harvestRan ? "ran" : redditWasConfigured ? "failed" : "skipped (no Reddit credentials)"}, ` +
      `labelling=${labelRan ? "ran" : aiWasConfigured ? "failed" : "skipped (no AI credentials)"}, ` +
      `norms=${normsRan ? "ran" : geminiWasConfigured ? "failed" : "skipped (no GEMINI_API_KEY)"}`
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
