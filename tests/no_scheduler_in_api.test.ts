import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// currency-server (index.ts) runs pm2 CLUSTER mode with 2 instances (see
// ecosystem.config.js) so scripts/deploy-backend.sh can roll instances one
// at a time on deploy without ever taking the API down. The tradeoff: any
// recurring scheduler added to this process later runs once PER INSTANCE —
// silently duplicating whatever it does (double Mongo writes, double
// Telegram/Discord posts, double spend of a rate-limited API quota) — unless
// it is explicitly guarded by classes/cluster.ts's isPrimaryInstance(), or
// (preferred) lives in its own single-instance pm2 cron app instead (see
// sync_aduana.ts + the currency-aduana entry in ecosystem.config.js).
//
// Nothing schedules anything in the API today (verified: its only timers are
// request-scoped AbortController timeouts, which fire once per request and
// are harmless per-instance). This test is a tripwire so the NEXT scheduler
// added here doesn't quietly become a duplication bug.
const REPO_ROOT = path.resolve(__dirname, "..");
const ENTRY = path.join(REPO_ROOT, "index.ts");

// Patterns that indicate a RECURRING job (runs more than once without a new
// external trigger). Deliberately does NOT include "setTimeout(" — one-shot,
// request-scoped abort timers (index.ts, classes/ai_service.ts) fire once
// per request and are harmless duplicated across instances; banning them
// here would just make this test noisy without catching a real bug.
const BANNED_PATTERNS = ["setInterval(", "node-cron", "cron.schedule(", ".schedule("];

const GUARD_CALL = "isPrimaryInstance(";
const GUARD_IF_RE = /if\s*\(\s*isPrimaryInstance\s*\(\s*\)\s*\)/;

/** Resolve a relative import specifier ("./foo", "../bar/baz") to a real .ts file on disk. */
function resolveImport(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Every local (relative-import) .ts module index.ts pulls in, transitively — i.e. the
 * API process's actual runtime surface. npm-package imports (no leading "./" or "../")
 * are skipped by construction: only relative specifiers match IMPORT_RE.
 */
function collectServerPathFiles(entry: string): string[] {
  const seen = new Set<string>();
  const queue = [entry];
  const IMPORT_RE = /(?:from\s+|require\(\s*|import\(\s*)["'](\.\.?\/[^"']+)["']/g;

  while (queue.length) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);

    const content = fs.readFileSync(file, "utf8");
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(content))) {
      const resolved = resolveImport(file, match[1]);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return [...seen];
}

/** Blank out /* block comments *\/ (JSDoc included) so banned words inside docs never false-positive. */
function stripBlockComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/**
 * Best-effort strip of `// line comments` and quoted-string contents. Template literals
 * are deliberately left intact (not blanked) — this codebase's classes/*.ts and index.ts
 * don't use bare `{`/`}` characters inside template-literal text (verified), so leaving
 * them alone keeps `${...}` expression braces balanced for the depth scan below.
 */
function stripLineNoise(line: string): string {
  let out = line.replace(/\/\/.*/, "");
  out = out.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  out = out.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  return out;
}

interface Violation {
  file: string;
  line: number;
  pattern: string;
  text: string;
}

/**
 * Scan one file's source for banned scheduler patterns that are NOT nested inside an
 * `if (isPrimaryInstance()) { … }` block (braced or single-line). Brace-depth tracking
 * is intentionally simple — raw `{`/`}` counting after stripping comments and quoted
 * strings — sufficient for this codebase's style, not a general-purpose parser.
 */
function findViolations(file: string, rawContent: string): Violation[] {
  const violations: Violation[] = [];
  const content = stripBlockComments(rawContent);
  const lines = content.split("\n");

  // guardStack[i] === true means the brace opened at that depth belongs to an
  // `if (isPrimaryInstance())` block — every pattern found while ANY entry in the
  // stack is true is guarded, however deeply it's nested inside that block.
  const guardStack: boolean[] = [];
  const insideGuard = () => guardStack.some(Boolean);

  lines.forEach((rawLine, idx) => {
    const line = stripLineNoise(rawLine);
    const opensGuard = GUARD_IF_RE.test(line);
    // Single-line form with no braces, e.g. `if (isPrimaryInstance()) setInterval(...);`
    const guardedOnThisLine = opensGuard && line.includes(GUARD_CALL);

    for (const ch of line) {
      if (ch === "{") {
        guardStack.push(opensGuard);
      } else if (ch === "}") {
        guardStack.pop();
      }
    }

    for (const pattern of BANNED_PATTERNS) {
      if (!line.includes(pattern)) continue;
      if (insideGuard() || guardedOnThisLine) continue;
      violations.push({ file, line: idx + 1, pattern, text: rawLine.trim() });
    }
  });

  return violations;
}

describe("no duplicated scheduled work under pm2 cluster mode", () => {
  it("finds no recurring scheduler in the API's server-path modules unless guarded by isPrimaryInstance()", () => {
    const files = collectServerPathFiles(ENTRY);
    // Sanity check on the traversal itself: if this drops to ~1 (just index.ts), the
    // import-graph walk broke silently and the rest of this test would rubber-stamp
    // anything — fail loudly instead of passing for the wrong reason.
    expect(files.length).toBeGreaterThan(10);

    const violations = files.flatMap((file) => findViolations(file, fs.readFileSync(file, "utf8")));

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${path.relative(REPO_ROOT, v.file)}:${v.line} — "${v.pattern}" in: ${v.text}`)
        .join("\n");
      throw new Error(
        `Found ${violations.length} unguarded recurring-scheduler call(s) reachable from index.ts:\n${report}\n\n` +
          `currency-server runs pm2 cluster mode with 2 instances (ecosystem.config.js). An unguarded ` +
          `setInterval/cron here runs once PER INSTANCE, silently duplicating whatever it does (double ` +
          `Mongo writes, double Telegram/Discord posts, double spend of a rate-limited API quota). Fix it ` +
          `one of two ways:\n` +
          `  1. PREFERRED: put the job in its OWN pm2 cron app instead (see sync_aduana.ts + the ` +
          `currency-aduana entry in ecosystem.config.js — cron_restart, single fork instance), not inside ` +
          `the API process.\n` +
          `  2. If it truly must run in-process, wrap it in isPrimaryInstance() from classes/cluster.ts:\n` +
          `     import { isPrimaryInstance } from "./classes/cluster";\n` +
          `     if (isPrimaryInstance()) { setInterval(...); }`
      );
    }

    expect(violations).toEqual([]);
  });
});
