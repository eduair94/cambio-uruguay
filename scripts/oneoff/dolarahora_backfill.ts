import moment from "moment-timezone";
import {
  buildDolarAhoraHistoryRows,
  dolarAhoraHistoryKey,
  fetchDolarAhoraChart,
  missingDolarAhoraHistoryRows,
} from "../../classes/dolarahora_backfill";
import {
  DOLAR_AHORA_INSTITUTIONS,
  DolarAhoraInstitution,
  getDolarAhoraRateIdentity,
} from "../../classes/cambios/dolarahora";
import {
  MongooseServer,
  Schema,
  withTimeout,
} from "../../classes/database";

/**
 * Backfill missing online USD history from DolarAhora's public charts.
 * Existing rows are never changed: writes use $setOnInsert with the canonical
 * identity {origin,date,code,type}.
 *
 *   npm run dolarahora_backfill -- --dry
 *   npm run dolarahora_backfill
 *   npm run dolarahora_backfill -- --institutions scotia,santander,bbva
 *   npm run dolarahora_backfill -- --from 2026-05-01 --to 2026-06-30
 */

const flag = (name: string): boolean => process.argv.includes(name);
const opt = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const fmt = (date: Date): string =>
  moment.tz(date, "America/Montevideo").format("YYYY-MM-DD");

function selectedInstitutions(): DolarAhoraInstitution[] {
  const value = opt("--institutions");
  if (!value) return [...DOLAR_AHORA_INSTITUTIONS];

  const requested = value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const invalid = requested.filter(
    (item) =>
      !DOLAR_AHORA_INSTITUTIONS.includes(item as DolarAhoraInstitution)
  );
  if (invalid.length > 0) {
    throw new Error(`Unknown DolarAhora institutions: ${invalid.join(", ")}`);
  }
  return requested as DolarAhoraInstitution[];
}

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

async function main(): Promise<void> {
  const dry = flag("--dry");
  const institutions = selectedInstitutions();
  const from = opt("--from");
  const to = opt("--to");

  console.log(
    `Fetching DolarAhora internet history for ${institutions.join(", ")}`
  );
  const [buyHtml, sellHtml] = await Promise.all([
    fetchDolarAhoraChart("buy_internet", "3m", institutions),
    fetchDolarAhoraChart("sell_internet", "3m", institutions),
  ]);

  let sourceRows = buildDolarAhoraHistoryRows(
    buyHtml,
    sellHtml,
    institutions
  );
  if (from) {
    const lower = moment.tz(
      from,
      "YYYY-MM-DD",
      true,
      "America/Montevideo"
    );
    if (!lower.isValid()) throw new Error(`Invalid --from date: ${from}`);
    sourceRows = sourceRows.filter((row) => row.date >= lower.toDate());
  }
  if (to) {
    const upper = moment
      .tz(to, "YYYY-MM-DD", true, "America/Montevideo")
      .endOf("day");
    if (!upper.isValid()) throw new Error(`Invalid --to date: ${to}`);
    sourceRows = sourceRows.filter((row) => row.date <= upper.toDate());
  }
  if (sourceRows.length === 0) {
    throw new Error("DolarAhora returned no valid paired history rows");
  }

  await withTimeout(MongooseServer.startConnectionPromise(), 20_000);
  const db = getDb();
  const identities = institutions.map((institution) => {
    const identity = getDolarAhoraRateIdentity(institution);
    return {
      origin: identity.origin,
      code: identity.code,
      type: identity.type,
    };
  });
  const firstDate = sourceRows.reduce(
    (earliest, row) => (row.date < earliest ? row.date : earliest),
    sourceRows[0].date
  );
  const lastDate = sourceRows.reduce(
    (latest, row) => (row.date > latest ? row.date : latest),
    sourceRows[0].date
  );
  const existing = await db
    .getModel()
    .find({
      $or: identities,
      date: { $gte: firstDate, $lte: lastDate },
    })
    .select({ _id: 0, origin: 1, date: 1, code: 1, type: 1 })
    .lean()
    .exec();
  const existingKeys = new Set(
    existing.map((row) =>
      dolarAhoraHistoryKey({
        origin: row.origin,
        date: row.date,
        code: row.code,
        type: row.type,
      })
    )
  );
  const missing = missingDolarAhoraHistoryRows(sourceRows, existingKeys);

  console.log(`Source range: ${fmt(firstDate)} -> ${fmt(lastDate)}`);
  console.log(`Valid source rows: ${sourceRows.length}`);
  console.log(`Matching Mongo rows: ${existing.length}`);
  console.log(`Missing rows: ${missing.length}`);
  for (const institution of institutions) {
    const identity = getDolarAhoraRateIdentity(institution);
    const sourceCount = sourceRows.filter(
      (row) => row.institution === institution
    ).length;
    const missingCount = missing.filter(
      (row) => row.institution === institution
    ).length;
    console.log(
      `  ${identity.origin}/${identity.type || "(plain)"}: ` +
        `${sourceCount} source, ${missingCount} missing`
    );
  }

  if (dry || missing.length === 0) {
    console.log(
      dry ? "[DRY RUN] No writes performed." : "Nothing to backfill."
    );
    MongooseServer.closeConnection();
    return;
  }

  const result = await db.getModel().bulkWrite(
    missing.map(({ institution: _institution, ...row }) => ({
      updateOne: {
        filter: {
          origin: row.origin,
          date: row.date,
          code: row.code,
          type: row.type,
        },
        update: { $setOnInsert: row },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  console.log("Backfill complete:", {
    upserted: result.upsertedCount,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
  MongooseServer.closeConnection();
}

main().catch((error) => {
  console.error(error);
  MongooseServer.closeConnection();
  process.exitCode = 1;
});
