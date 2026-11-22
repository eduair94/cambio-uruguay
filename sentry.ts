import "dotenv/config";
import { initBackendSentry } from "./classes/sentry/init";

/**
 * Sentry for the API (currency-server). The setup itself — release, Logs, scrubbing — lives in
 * classes/sentry/init.ts, shared with the pm2 jobs (sentry_job.ts).
 */
const sentryInit = () => {
  if (initBackendSentry({ runtime: "api", root: __dirname })) console.log("Sentry Started");
};

export default sentryInit;
