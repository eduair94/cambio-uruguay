// Every `sync_*.ts` / `import_*.ts` file in the repo root is its own pm2 process.
// classes/database.ts's default mongoose connection is process-local and is opened ONLY by
// MongooseServer.startConnectionPromise() (classes/database.ts) — importing a store bound to it
// (anything that calls `MongooseServer.getInstance(...)`, directly or transitively) buys a job
// nothing unless something in that same process dials the connection first. Without it, every
// Mongo call in the job buffers and times out after 10s — and because almost every one of these
// jobs already wraps its work in a top-level try/catch that logs and exits 0 ("keeping the
// previous data"), the failure is invisible: pm2 reports success forever.
//
// This test statically walks each entrypoint's relative-import graph. If anything in that graph
// touches the default connection, the entrypoint file itself must contain a call to
// MongooseServer.startConnectionPromise() — the only thing that ever opens it.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");

/** Root-level scheduled-job / one-shot-migration entrypoints this tripwire protects. */
function entrypoints(): string[] {
  return fs.readdirSync(ROOT).filter((f) => /^(sync_|import_)[a-z0-9_]*\.ts$/.test(f));
}

const IMPORT_RE = /\bfrom\s+["'](\.[^"']+)["']/g;

function resolveRelativeImport(fromFile: string, spec: string): string | null {
  const target = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [`${target}.ts`, path.join(target, "index.ts")]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Every local .ts file reachable from `entry` via relative imports, entry included. */
function transitiveLocalFiles(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file) || !fs.existsSync(file)) continue;
    seen.add(file);
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(IMPORT_RE)) {
      const resolved = resolveRelativeImport(file, m[1]!);
      if (resolved && !seen.has(resolved)) stack.push(resolved);
    }
  }
  return seen;
}

/** True when this dependency graph resolves a Model through the DEFAULT mongoose connection
 *  (`MongooseServer.getInstance`) — as opposed to the app-Mongo bridge (classes/appdb.ts), which
 *  is a separate connection this tripwire does not police. */
function usesDefaultMongoConnection(files: Set<string>): boolean {
  for (const f of files) {
    if (fs.readFileSync(f, "utf8").includes("MongooseServer.getInstance(")) return true;
  }
  return false;
}

const HELP = (file: string) =>
  `${file} imports a MongooseServer-backed store (directly or transitively) but never calls ` +
  `MongooseServer.startConnectionPromise() — every Mongo op this job performs will buffer and ` +
  `time out after 10s in production, usually silently (most of these jobs catch-and-exit(0) on ` +
  `failure). Add, as the FIRST statement of main(), before any store call:\n\n` +
  `  import { MongooseServer, withTimeout } from "./classes/database";\n` +
  `  ...\n` +
  `  try {\n` +
  `    await withTimeout(MongooseServer.startConnectionPromise(), 15000);\n` +
  `  } catch (e: any) {\n` +
  `    console.error("[label] cannot reach MongoDB — refusing to run silently:", e?.message || e);\n` +
  `    process.exit(1);\n` +
  `  }\n\n` +
  `The withTimeout wrapper is required: startConnectionPromise() never rejects and never times ` +
  `out on its own (connectWithRetry swallows its error and the promise just awaits the "open" ` +
  `event forever), so an unreachable Mongo must not be allowed to hang the job forever — it must ` +
  `exit non-zero, loudly. See validate_cambios.ts's main() for the same idiom.`;

describe("scheduled-job Mongo connection tripwire", () => {
  const files = entrypoints();

  it("is not vacuous — finds a substantial number of entrypoints, and at least one touches Mongo", () => {
    expect(files.length).toBeGreaterThan(5);
    const anyTouchesMongo = files.some((f) => usesDefaultMongoConnection(transitiveLocalFiles(path.join(ROOT, f))));
    expect(anyTouchesMongo).toBe(true);
  });

  for (const file of files) {
    it(`${file}: calls startConnectionPromise() before touching Mongo, if it touches Mongo at all`, () => {
      const full = path.join(ROOT, file);
      const graph = transitiveLocalFiles(full);
      if (!usesDefaultMongoConnection(graph)) return; // never reads/writes through the default connection

      const ownSrc = fs.readFileSync(full, "utf8");
      expect(ownSrc.includes("MongooseServer.startConnectionPromise("), HELP(file)).toBe(true);
    });
  }
});
