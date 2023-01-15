import '@sentry/tracing';
import dotenv from "dotenv";
import sentryInit from "./sentry";
dotenv.config();
const e = process.env;
console.log("Sentry Init", e.sentry_dsn);
sentryInit();

const foo = () => {
    throw new Error("foo");
} 

setTimeout(() => {
    foo();
}, 99);