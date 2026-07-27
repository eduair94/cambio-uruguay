/**
 * Historical/manual Reddit harvest for the customs corpus.
 *
 * The scheduled `sync_aduana.ts` intentionally searches only the last year. This one-off command
 * defaults to Reddit's full searchable history so a fresh database can be backfilled before the
 * weekly incremental job takes over.
 *
 * Usage:
 *   npm run harvest_aduana_reddit
 *   npm run harvest_aduana_reddit -- --year
 *   npm run harvest_aduana_reddit -- --supplemental
 */
import dotenv from "dotenv";

dotenv.config();

import { ADUANA_AUDIT_QUERIES, harvestAduana } from "../../classes/aduana/harvest";
import { MongooseServer, withTimeout } from "../../classes/database";

async function main(): Promise<void> {
  const window = process.argv.includes("--year") ? "year" : "all";
  const supplemental = process.argv.includes("--supplemental");
  const queries = supplemental ? ADUANA_AUDIT_QUERIES : undefined;
  await withTimeout(MongooseServer.startConnectionPromise(), 15_000);

  const startedAt = Date.now();
  console.log(
    `[aduana-reddit] harvest started (window=${window}, query-set=${
      supplemental ? "supplemental-audit" : "scheduled"
    })`
  );

  const result = await harvestAduana({ window, queries });
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);

  console.log(
    `[aduana-reddit] harvest complete: threads=${result.posts} new-comments=${result.comments} elapsed=${elapsedSeconds}s`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[aduana-reddit] harvest failed", error);
    process.exit(1);
  });
