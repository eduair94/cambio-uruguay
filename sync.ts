import "./sentry_job";
import * as Sentry from "@sentry/node";
import { MongooseServer } from "./classes/database";
import { sync_cambios } from "./classes/sync_cambio";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  console.time("sync");
  await sync_cambios();
  console.timeEnd("sync");
  // 0 since 2026-11-22: this exited 1 after EVERY run (since the first commit). pm2 never read
  // it, but the Sentry cron monitor `currency-sync` does — every run would have been a failure.
  process.exit(0);
};

// A run that throws is reported with its stack and ends in 1 (the cron monitor marks it failed).
// Before, it was an unhandled rejection in 'warn' mode: the open Mongo connection kept the
// process alive until pm2's next tick killed it, five minutes later, with nothing reported.
main().catch(async (error) => {
  Sentry.captureException(error);
  await Sentry.flush(2000);
  process.exit(1);
});
