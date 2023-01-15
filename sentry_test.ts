import Sentry from "@sentry/node";
import dotenv from "dotenv";
dotenv.config();
const e = process.env;
console.log("Sentry DNS", e.sentry_dsn);
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

console.log("Transaction", transaction);

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