import "dotenv/config";
import sentryInit from "../../sentry";
const e = process.env;
console.log("Sentry Init", e.sentry_dsn);
sentryInit();

const foo = () => {
    throw new Error("foo");
} 

setTimeout(() => {
    foo();
}, 99);