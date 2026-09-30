import * as Sentry from "@sentry/node";
import "dotenv/config";

const sentryInit = () => {
  Sentry.init({
    dsn: process.env.sentry_dsn,
    integrations: [
      // Frames as app:///classes/foo.js, relative to dist/ (this file's folder once compiled).
      Sentry.rewriteFramesIntegration({ root: __dirname }),
      // pm2 cluster workers already listen for uncaughtException, and since v8 Sentry no longer
      // exits when another listener exists, so a crashed worker would keep serving. Exit, as v7 did.
      Sentry.onUncaughtExceptionIntegration({ exitEvenIfOtherHandlersAreRegistered: true }),
    ],
    // v11 attaches the caller's IP, headers, cookies and request bodies by default; v7 sent none.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] },
    // The load-time module hooks only feed tracing and Express auto-capture, neither used here.
    enableRuntimeChannelInjection: false,
  });
  console.log("Sentry Started");
};

export default sentryInit;
