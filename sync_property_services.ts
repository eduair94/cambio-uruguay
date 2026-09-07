import dotenv from "dotenv";
dotenv.config();
import { writeFile, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { downloadServicePbf, sourceFileHash } from "./classes/propertyservices/download";
import { parseServicePbf } from "./classes/propertyservices/parse";
import { serviceSnapshotProblem } from "./classes/propertyservices/classify";
import { publishServiceSnapshot, withServiceRefreshLease } from "./classes/propertyservices/store";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  if (!dry && !appDbConfigured()) throw new Error("APP_MONGO_URI required; no default/backend database fallback");
  const fileArg = args.find(arg => arg.startsWith("--file="))?.slice(7);
  const output = args.find(arg => arg.startsWith("--output="))?.slice(9);
  if (output && !resolve(output).startsWith(resolve(process.cwd()) + sep)) throw new Error("Report must stay inside worktree");
  const execute = async () => {
    const source = fileArg
      ? { file: resolve(fileArg), sourceSha256: await sourceFileHash(resolve(fileArg)), fetchedAt: new Date().toISOString() }
      : await downloadServicePbf();
    try {
      const snapshot = await parseServicePbf(source.file, source.sourceSha256, source.fetchedAt);
      const problem = serviceSnapshotProblem(snapshot);
      if (problem) throw new Error(`Invalid candidate: ${problem}`);
      if (output) await writeFile(resolve(output), JSON.stringify(snapshot));
      console.log(JSON.stringify({ dataAsOf: snapshot.dataAsOf, total: snapshot.points.length, counts: snapshot.counts, diagnostics: snapshot.diagnostics, dryRun: dry }));
      if (!dry) console.log(JSON.stringify(await publishServiceSnapshot(snapshot)));
    } finally { if (!fileArg) await rm(source.file, { force: true }); }
  };
  // Hard process ceiling bounds download, parsing and a stalled DB, including malformed input.
  const deadline = setTimeout(() => { console.error("[property-services] total run deadline exceeded"); process.exit(1); }, 15 * 60_000);
  try { if (dry) await execute(); else await withServiceRefreshLease(execute); }
  finally { clearTimeout(deadline); if (!dry) await appConnection().close(); }
}
main().catch(error => { console.error("[property-services]", error instanceof Error ? error.message : "refresh failed"); process.exitCode = 1; });
