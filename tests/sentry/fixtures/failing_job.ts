// A job as the pm2 entrypoints are written: sentry_job first, errors caught, exit code chosen.
import "../../../sentry_job";

const mode = process.argv[2];
console.log("starting with proxy http://user:hunter@10.0.0.1:3128");
if (mode === "crash") {
  setTimeout(() => {
    throw new Error("boom with token=abc123");
  }, 50);
} else {
  setTimeout(() => {
    console.error("guard: thin run, not writing; contact 099 123 456");
    process.exit(mode === "ok" ? 0 : 1);
  }, 300);
}
