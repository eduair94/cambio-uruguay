import * as Sentry from "@sentry/node";
import dotenv from "dotenv";
dotenv.config();
const e = process.env;

Sentry.init({
  dsn: e.sentry_dsn,
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

const transaction = Sentry.startTransaction({
  op: "test",
  name: "My First Test Transaction",
});

const foo = () => {
    throw new Error("foo");
} 

setTimeout(() => {
  try {
    foo();
  } catch (e) {
    Sentry.captureException(e);
  } finally {
    transaction.finish();
  }
}, 99);