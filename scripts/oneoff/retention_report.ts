// Run from the backend checkout with its existing read-only GA4 credentials.
import fs from "fs";
import path from "path";
import { ga4ConfigProblem } from "../../classes/site-analytics/ga4";
import { fetchRetentionReport } from "../../classes/site-analytics/retention";

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("npm run retention_report -- [--end-date=YYYY-MM-DD] [--min-sessions=30]\nTwo complete 28-day windows; private JSON in docs/seo/data. No database writes.");
    return;
  }
  const options: { endDate?: string; minSessions?: number } = {};
  for (const arg of args) {
    if (arg.startsWith("--end-date=")) options.endDate = arg.slice("--end-date=".length);
    else if (arg.startsWith("--min-sessions=")) options.minSessions = Number(arg.slice("--min-sessions=".length));
    else throw new Error("retention: unknown argument; use --help");
  }
  const problem = ga4ConfigProblem();
  if (problem) throw new Error(problem);
  const report = await fetchRetentionReport(options);
  const dir = path.resolve(__dirname, "../../docs/seo/data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `retention-${report.windows.current.endDate}-${Date.now()}.json`);
  // No report content, landing paths, credentials or attribution data in stdout.
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ file, timeZone: report.timeZone, windows: report.windows, reports: Object.keys(report.reports).length }));
}

main().catch((error) => {
  // Axios errors may embed authenticated request config. Never print the error object.
  const message = error?.isAxiosError
    ? `GA4 request failed (HTTP ${error.response?.status || "unavailable"}); check read access and connectivity`
    : error.message;
  console.error(message);
  process.exitCode = 1;
});
