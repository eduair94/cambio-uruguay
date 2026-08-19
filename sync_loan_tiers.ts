// Weekly fact refresh behind /mejores-prestamos-uruguay (pm2 app `currency-loan-tiers`).
//
// Walks the lender catalogue one at a time asking the private Claude endpoint to re-read each
// lender's own pages, verifies every citation itself, and writes ONE snapshot row to the NUXT APP
// database. The page's tier order is computed from those facts, so this job is what keeps the
// ranking honest without anybody re-grading it by hand.
//
// It is deliberately hard to make this job do damage:
//   - it stands down entirely when the endpoint has no budget left for the human whose
//     subscription it is (classes/claude.ts `claudeHasBudget`);
//   - a lender it cannot verify keeps last week's facts (classes/loantiers/merge.ts carryForward);
//   - a run that verified too few lenders, or that claims most of the catalogue changed at once,
//     is refused and the previous snapshot stands.
// The page therefore degrades to "stale but correct", never to blank or wrong.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import { claudeConfigured } from "./classes/claude";
import { LOAN_TIER_LENDERS } from "./classes/loantiers/catalog";
import { carryForward, evaluateRun } from "./classes/loantiers/merge";
import { researchAllLenders } from "./classes/loantiers/research";
import { loadLoanTierSnapshot, saveLoanTierSnapshot } from "./classes/loantiers/store";
import { LOAN_TIER_SNAPSHOT_KEY } from "./classes/loantiers/types";

async function main(): Promise<void> {
  // The app's own env names this MONGO_URI. The root bridge requires APP_MONGO_URI so it cannot
  // accidentally write to cambio-uy; map it explicitly for this job, exactly as the chair-tier
  // job does.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;

  if (!appDbConfigured()) {
    console.error("[loan-tiers] falta APP_MONGO_URI/MONGO_URI — no se escribe en la base equivocada");
    process.exit(1);
  }
  // `claudeConfigured()` already warns with the variable's name. Not naming it here is not
  // cosmetic: tests/claude_endpoint_ownership.test.ts greps the tree for that literal and fails if
  // any file other than classes/claude.ts mentions it, so that the quota rules keep having exactly
  // one owner.
  if (!claudeConfigured()) {
    console.warn("[loan-tiers] el endpoint de Claude no está configurado — se conserva el snapshot anterior");
    process.exit(0);
  }

  const previous = await loadLoanTierSnapshot();
  const { patches, attempted } = await researchAllLenders(LOAN_TIER_LENDERS);
  const decision = evaluateRun(previous, patches, LOAN_TIER_LENDERS);

  if (!decision.accept) {
    console.warn(`[loan-tiers] no se publica: ${decision.reason}`);
    process.exit(0);
  }

  const merged = carryForward(previous?.patches ?? [], patches);
  await saveLoanTierSnapshot({
    key: LOAN_TIER_SNAPSHOT_KEY,
    asOf: new Date().toISOString(),
    model: "claude-agent-api",
    patches: merged,
    changes: decision.changes,
    verified: patches.length,
    total: LOAN_TIER_LENDERS.length,
  });

  console.log(
    `[loan-tiers] ${patches.length}/${attempted} prestamistas reverificados (catálogo: ${LOAN_TIER_LENDERS.length}), ` +
      `${decision.changes.length} cambios · ${merged.length} fichas con datos`
  );
  for (const change of decision.changes) console.log(`[loan-tiers]   ${change.name}: ${change.text}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("[loan-tiers] sync failed", error);
  process.exit(1);
});
