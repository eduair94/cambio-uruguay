/**
 * READ-ONLY sample to hand-label the gastos comunes read from advert descriptions before they are
 * published (`RENTALS_GC_FROM_TEXT`, classes/rentals/textFacts.ts).
 *
 *   npm run rentals_gc_text_sample -- [--n=150] [--source=infocasas|elpais|casasweb|mercadolibre] [--all]
 *
 * Prints JSON to stdout: N stored adverts seen in the last 10 days that have NO gastos comunes and DO
 * have a published description, each with what the reader would publish (or why it abstains) and the
 * text around every gastos comunes label, plus an empty `correct` for the person labelling it. Without
 * `--all` only the readings it would publish are listed: that is the precision sample, and the flag
 * goes on only at >= 95 % correct over >= 100 adverts. `--all` adds the abstentions, to see what it
 * misses. Redirect stdout to a file to label it.
 *
 * NEVER WRITES. The local .env points at the PRODUCTION database: this script only uses `findOne`
 * and `aggregate` without `$out`/`$merge` (tests/rentals/gcTextSample.test.ts holds it to that).
 */
import dotenv from "dotenv";
import "dotenv/config";
import fs from "fs";
dotenv.config({ path: "app/.env", quiet: true });
import { appConnection } from "../../classes/appdb";
import { readCommonExpensesFromText } from "../../classes/rentals/textFacts";
import { RENTAL_META_KEY, type RentalCurrency } from "../../classes/rentals/types";

const SOURCES = ["infocasas", "elpais", "casasweb", "mercadolibre"];
const LABEL = /gastos\s+comunes|gastos\s+c\.|\bg\.?\s?c\b\.?|expensas/gi;

const option = (name: string): string | undefined =>
  process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

/** The text around each gastos comunes label, so the figure can be checked without the whole advert. */
function windows(text: string, max = 4, radius = 90): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(LABEL)) {
    const at = match.index ?? 0;
    found.push(text.slice(Math.max(0, at - radius), at + match[0].length + radius).replace(/\s+/g, " ").trim());
    if (found.length === max) break;
  }
  return found;
}

interface SampleRow {
  key: string;
  department?: string;
  neighborhood?: string;
  listingId: string;
  source: string;
  url?: string;
  price: number;
  currency: RentalCurrency;
  description: string;
}

async function main(): Promise<void> {
  const appEnv = fs.existsSync("app/.env") ? dotenv.parse(fs.readFileSync("app/.env")) : {};
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || appEnv.APP_MONGO_URI || appEnv.MONGO_URI;
  if (!process.env.APP_MONGO_URI) throw new Error("App database is not configured");
  const n = Math.min(1_000, Math.max(1, Math.floor(Number(option("n") || 150)) || 150));
  const source = option("source");
  if (source && !SOURCES.includes(source)) throw new Error(`--source must be one of ${SOURCES.join(", ")}`);
  const all = process.argv.includes("--all");
  const cutoff = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
  const connection = appConnection();
  await connection.asPromise();
  try {
    const meta = await connection.collection("rentalmetas").findOne({ key: RENTAL_META_KEY }, { projection: { _id: 0, usdUyu: 1 } });
    const usdUyu = Number(meta?.usdUyu) || 0;
    const offer = {
      source: source ?? { $in: SOURCES },
      commonExpenses: null,
      lastSeen: { $gte: cutoff },
      "details.description": { $type: "string", $ne: "" },
    };
    // Most descriptions say nothing about gastos comunes: draw several times the sample and keep the
    // readings. `$sample` can repeat a document, so rows are unique by advert.
    const drawn = await connection.collection("rentallistings").aggregate<SampleRow>([
      { $match: { offers: { $elemMatch: offer } } },
      { $unwind: "$offers" },
      { $match: Object.fromEntries(Object.entries(offer).map(([field, value]) => [`offers.${field}`, value])) },
      { $sample: { size: Math.min(6_000, all ? n : n * 6) } },
      { $project: {
        _id: 0, key: 1, department: 1, neighborhood: 1, listingId: "$offers.listingId", source: "$offers.source",
        url: "$offers.url", price: "$offers.price", currency: "$offers.currency", description: "$offers.details.description",
      } },
    ], { maxTimeMS: 120_000 }).toArray();
    const seen = new Set<string>();
    const reasons: Record<string, number> = {};
    const readings = [];
    for (const row of drawn) {
      if (seen.has(row.listingId) || readings.length >= n) continue;
      seen.add(row.listingId);
      const verdict = readCommonExpensesFromText(row.description, { price: Number(row.price), currency: row.currency }, usdUyu);
      reasons[verdict.reason] = (reasons[verdict.reason] ?? 0) + 1;
      if (!all && !verdict.reading) continue;
      readings.push({
        listingId: row.listingId, source: row.source, url: row.url,
        ficha: `https://cambio-uruguay.com/alquileres/${row.key}`,
        zone: [row.neighborhood, row.department].filter(Boolean).join(", "),
        rent: { amount: row.price, currency: row.currency },
        verdict: verdict.reason,
        commonExpenses: verdict.reading ? { amount: verdict.reading.commonExpenses, currency: verdict.reading.commonExpensesCurrency } : null,
        windows: windows(row.description),
        // Filled by the person labelling: true when the figure is what the advert says, false when not.
        correct: null,
      });
    }
    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(), cutoff, source: source ?? SOURCES, usdUyu,
      drawn: seen.size, reasons, listed: readings.length, readings,
    }, null, 2));
    console.error(`[gc-text-sample] ${seen.size} adverts read, ${readings.length} listed; ${JSON.stringify(reasons)}`);
  } finally {
    await connection.close();
  }
}

main().catch(error => {
  console.error("[gc-text-sample] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
