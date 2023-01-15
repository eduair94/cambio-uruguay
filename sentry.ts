import { RewriteFrames } from "@sentry/integrations";
import * as Sentry from "@sentry/node";
import '@sentry/tracing';
import dotenv from "dotenv";
dotenv.config();
const e = process.env;

const sentryInit = () => {
  const res = Sentry.init({
    dsn: e.sentry_dsn,
    integrations: [
      new RewriteFrames({
        root: global.__rootdir__,
      }),
    ],
  });
  console.log("Sentry Started", res);
}

export default sentryInit;