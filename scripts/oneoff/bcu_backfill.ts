import moment from "moment-timezone";
import { buildUpsertOps, chunkDateRange, detectGaps, type DateGap } from "../../classes/bcu_backfill";
import { fetchCotizaciones, type BcuQuote } from "../../classes/bcu_soap";
import { MongooseServer, Schema } from "../../classes/database";

/**
 * Backfill missing BCU history in the `cambio-uy` collection from the BCU SOAP
 * cotizaciones service. Idempotent (upsert by {origin,date,code,type}).
 *
 *   npm run bcu_backfill -- --dry                 # detect gaps, print plan, no writes
 *   npm run bcu_backfill                          # fill auto-detected gaps
 *   npm run bcu_backfill -- --from 2026-03-13 --to 2026-06-15   # explicit range
 *   npm run bcu_backfill -- --min-gap 4           # gap threshold in days (default 4)
 */

const ORIGIN = "bcu";

const flag = (name: string): boolean => process.argv.includes(name);
const opt = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const fmt = (d: Date): string => moment.tz(d, "America/Montevideo").format("YYYY-MM-DD");
const mvd = (ymd: string): Date => moment.tz(ymd, "America/Montevideo").startOf("day").toDate();

function getDb(): MongooseServer {
  return MongooseServer.getInstance(
    "cambio-uy",
    new Schema({
      bcu: { type: String },
      origin: { type: String },
      code: { type: String },
      type: { type: String },
      name: { type: String },
      buy: { type: Number },
      sell: { type: Number },
      date: { type: Date },
    })
  );
}

async function main() {
  const dry = flag("--dry");
  const minGap = Number(opt("--min-gap") ?? 4);
  const fromArg = opt("--from");
  const toArg = opt("--to");

  await MongooseServer.startConnectionPromise();
  const db = getDb();

  const today = moment.tz("America/Montevideo").startOf("day").toDate();

  let spans: DateGap[];
  if (fromArg && toArg) {
    spans = [{ from: mvd(fromArg), to: mvd(toArg) }];
  } else {
    const dates: Date[] = await db.getModel().distinct("date", { origin: ORIGIN });
    console.log(`Existing BCU data points: ${dates.length}`);
    spans = detectGaps(dates, today, minGap);
  }

  if (spans.length === 0) {
    console.log("No gaps detected. Nothing to backfill.");
    process.exit(0);
  }

  console.log(`\nSpans to fill (${spans.length}):`);
  for (const s of spans) console.log(`  ${fmt(s.from)} → ${fmt(s.to)}`);

  // The SOAP service caps the date range per request, so split each span into windows.
  const MAX_RANGE_DAYS = 30;
  const allQuotes: BcuQuote[] = [];
  for (const s of spans) {
    for (const c of chunkDateRange(s.from, s.to, MAX_RANGE_DAYS)) {
      const q = await fetchCotizaciones(c.from, c.to);
      console.log(`  fetched ${q.length} quotes for ${fmt(c.from)} → ${fmt(c.to)}`);
      allQuotes.push(...q);
    }
  }

  const ops = buildUpsertOps(allQuotes, ORIGIN);

  const byCur = new Map<string, number>();
  for (const op of ops) {
    const k = op.filter.type ? `${op.filter.code}/${op.filter.type}` : op.filter.code;
    byCur.set(k, (byCur.get(k) ?? 0) + 1);
  }
  console.log(`\nPlanned upserts: ${ops.length}`);
  for (const [k, n] of [...byCur].sort()) console.log(`  ${k}: ${n}`);
  console.log(
    "Sample:",
    ops.slice(0, 3).map((o) => ({ date: fmt(o.filter.date), code: o.filter.code, type: o.filter.type, ...o.update }))
  );

  if (dry) {
    console.log("\n[DRY RUN] No writes performed.");
    process.exit(0);
  }

  const res = await db.bulkUpsert(ops);
  console.log("\nbulkWrite result:", {
    upserted: (res as any).upsertedCount,
    modified: (res as any).modifiedCount,
    matched: (res as any).matchedCount,
  });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
