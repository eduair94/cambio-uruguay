// One-shot: carry the lender-TEA history out of the Nuxt app's filesystem store and into Mongo.
//
// app/.data/loans/rates.json holds `history[lenderId][]` — one entry per lender per UTC day, going
// back to the day loans:scrape first ran. That is a TIME SERIES: it cannot be regenerated, because
// nobody can tell you what Creditel's advertised TEA was on 2026-06-03 today. Everything else this
// migration drops (costs/live, figures/live, debt-relief/live) is a single snapshot the next cron
// rewrites; this is not.
//
// Run ONCE on the VPS, after `npm run build`, BEFORE the app half of Task 6 is deployed:
//   cd /root/cambio-uruguay && node dist/import_loan_history.js
// Idempotent: re-running it merges by (lenderId, date) and never overwrites an entry Mongo already
// has with a different value — the fs file is the past, the cron owns the present.
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { loadLoanRates, saveLoanRates, type HistoryEntry } from "./classes/loans/store";

const FS_PATH = path.join(__dirname, "..", "app", ".data", "loans", "rates.json");

async function main(): Promise<void> {
  if (!fs.existsSync(FS_PATH)) {
    console.warn(`[loans-import] ${FS_PATH} does not exist — nothing to carry over. This is fine on a fresh box.`);
    process.exit(0);
  }
  const raw = fs.readFileSync(FS_PATH, "utf8").trim();
  if (!raw) {
    console.warn(`[loans-import] ${FS_PATH} is empty — nothing to carry over.`);
    process.exit(0);
  }
  const fsDoc = JSON.parse(raw) as {
    rates?: Record<string, { teaPct: number; scrapedAt: string }>;
    history?: Record<string, HistoryEntry[]>;
    updatedAt?: string;
  };

  const mongoDoc = await loadLoanRates();
  let carried = 0;

  for (const [lenderId, entries] of Object.entries(fsDoc.history ?? {})) {
    const have = new Map((mongoDoc.history[lenderId] ?? []).map((e) => [e.date, e]));
    for (const entry of entries) {
      if (have.has(entry.date)) continue; // Mongo wins: the cron already owns that day
      have.set(entry.date, entry);
      carried++;
    }
    mongoDoc.history[lenderId] = [...have.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Only seed `rates` if Mongo has never been written — the cron is authoritative once it has run.
  if (!Object.keys(mongoDoc.rates).length && fsDoc.rates) {
    mongoDoc.rates = fsDoc.rates;
    mongoDoc.updatedAt = fsDoc.updatedAt ?? new Date().toISOString();
  }

  await saveLoanRates(mongoDoc);
  console.log(`[loans-import] carried ${carried} history entries across ${Object.keys(mongoDoc.history).length} lenders`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[loans-import] failed — the fs file is untouched, safe to retry", e);
  process.exit(1);
});
