// One Mongo document (`loan_rates_data`) holding every lender's latest TEA plus its full daily
// history, mirroring classes/aduana/store.ts's single-document shape. Golden rule ported from the
// app's loanRatesStore.ts: **only a fresh successful scrape overwrites a TEA** — a failed or
// implausible result leaves the previous good value (and its history) untouched, so the public
// page degrades to "stale but correct" rather than blanking. `history` keeps one entry per lender
// per UTC calendar day (a same-day re-run overwrites that day's entry, never duplicates it).
import { MongooseServer, Schema } from "../database";
import type { LenderRateResult } from "./refresh";

const KEY = "loan_rates_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("loan_rates_data", schema);

export interface StoredRate {
  teaPct: number;
  scrapedAt: string;
}

export interface HistoryEntry {
  date: string;
  teaPct: number;
  source?: string;
  method: "regex" | "gemini";
}

export interface LoanRatesDoc {
  rates: Record<string, StoredRate>;
  history: Record<string, HistoryEntry[]>;
  updatedAt: string;
}

export function emptyLoanRatesDoc(): LoanRatesDoc {
  return { rates: {}, history: {}, updatedAt: "" };
}

export async function loadLoanRates(): Promise<LoanRatesDoc> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  const doc = rows[0]?.doc as Partial<LoanRatesDoc> | undefined;
  return { rates: doc?.rates ?? {}, history: doc?.history ?? {}, updatedAt: doc?.updatedAt ?? "" };
}

export async function saveLoanRates(doc: LoanRatesDoc): Promise<void> {
  // `updateOne` upserts and strips the filter's keys from the update before sending it —
  // Mongoose then implicitly wraps the remaining fields in `$set` (see classes/database.ts).
  // `updateOneRaw` does not exist — do not call it.
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

/** Apply one refresh cycle's results: only a successful, plausible scrape updates rates/history. */
export async function applyLoanScrapeResults(results: LenderRateResult[]): Promise<number> {
  const doc = await loadLoanRates();
  const iso = new Date().toISOString();
  const day = iso.slice(0, 10);
  let updated = 0;
  for (const r of results) {
    if (r.ok && r.teaPct != null) {
      doc.rates[r.id] = { teaPct: r.teaPct, scrapedAt: iso };
      const priorHistory = (doc.history[r.id] ?? []).filter((h) => h.date !== day);
      doc.history[r.id] = [...priorHistory, { date: day, teaPct: r.teaPct, source: r.sourceUrl, method: r.method }];
      updated++;
    }
  }
  doc.updatedAt = iso;
  await saveLoanRates(doc);
  return updated;
}
