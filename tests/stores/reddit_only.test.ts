// Task 13: `--reddit-only` runs nightly so Reddit's 24-month backfill finishes in ~8 nights instead
// of ~8 weeks (Task 12 measured ~90 Arctic Shift calls per store, 900/week, 76 stores). Every other
// signal must not be touched AT ALL that night — Google Places costs money per call — so this mode
// only ever asks Reddit; site/age/trustpilot/google/catalog arrive at `buildProfile` as `undefined`
// and are carried over untouched, exactly like a source that failed to answer.
//
// All pure — no network, no Mongo. `shouldQuerySignal`/`shouldLoadCatalog` say what a run is allowed
// to touch; `redditProgressed`/`shouldSaveStore` say whether the result is worth writing.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  needsRedditBackfill,
  redditProgressed,
  shouldLoadCatalog,
  shouldQuerySignal,
  shouldSaveStore,
  shouldStopForDeadline,
} from "../../classes/stores/profile";
import type { StoreEntry } from "../../classes/stores/types";
import type { RedditCursor } from "../../classes/stores/signals/reddit";

const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "sync_store_profiles.ts"), "utf8");

function entry(overrides: Partial<StoreEntry> = {}): StoreEntry {
  return {
    key: "tienda",
    name: "Tienda",
    domain: "tienda.com.uy",
    kind: "tienda-uy",
    rubros: ["hogar"],
    aliases: ["Tienda"],
    redditTerms: ["tienda uy"],
    ...overrides,
  };
}

describe("shouldQuerySignal", () => {
  it("full mode queries every signal that applies to the store", () => {
    for (const name of ["site", "age", "trustpilot", "google", "reddit"] as const) {
      expect(shouldQuerySignal(entry(), name, "full"), name).toBe(true);
    }
  });

  it("reddit-only mode queries Reddit only, even for a store every other signal applies to", () => {
    expect(shouldQuerySignal(entry(), "reddit", "reddit-only")).toBe(true);
    for (const name of ["site", "age", "trustpilot", "google"] as const) {
      expect(shouldQuerySignal(entry(), name, "reddit-only"), name).toBe(false);
    }
  });

  it("never queries a signal that does not apply to the store, in either mode", () => {
    const noDomain = entry({ domain: null });
    expect(shouldQuerySignal(noDomain, "site", "full")).toBe(false);
    expect(shouldQuerySignal(noDomain, "site", "reddit-only")).toBe(false);
  });

  it("does not query Reddit in reddit-only mode for a store too ambiguous to search (redditTerms: [])", () => {
    expect(shouldQuerySignal(entry({ redditTerms: [] }), "reddit", "reddit-only")).toBe(false);
  });
});

describe("shouldLoadCatalog", () => {
  it("loads the catalogue only in full mode — a reddit-only night must not touch our own database either", () => {
    expect(shouldLoadCatalog("full")).toBe(true);
    expect(shouldLoadCatalog("reddit-only")).toBe(false);
  });
});

describe("redditProgressed", () => {
  const cursor = (checkedUntilUtc: number, backfillDone = true): RedditCursor => ({
    backfillStartUtc: 0,
    backfillNextUtc: checkedUntilUtc,
    backfillDone,
    checkedUntilUtc,
  });

  it("is true when the run added at least one new mention", () => {
    expect(redditProgressed({ redditNew: 3, previousCursor: cursor(100), nextCursor: cursor(100) })).toBe(true);
  });

  it("is true when the cursor moved, even with zero new mentions", () => {
    expect(redditProgressed({ redditNew: 0, previousCursor: cursor(100), nextCursor: cursor(200) })).toBe(true);
  });

  it("is true when the backfill finished this run (same timestamp, backfillDone flips)", () => {
    expect(redditProgressed({ redditNew: 0, previousCursor: cursor(100, false), nextCursor: cursor(100, true) })).toBe(true);
  });

  it("is true the first time a store gets a cursor at all", () => {
    expect(redditProgressed({ redditNew: 0, previousCursor: null, nextCursor: cursor(100) })).toBe(true);
  });

  it("is false when nothing moved: same cursor, no new mentions", () => {
    expect(redditProgressed({ redditNew: 0, previousCursor: cursor(100), nextCursor: cursor(100) })).toBe(false);
  });

  it("is false when Reddit does not apply to the store, before and after (both cursors null)", () => {
    expect(redditProgressed({ redditNew: undefined, previousCursor: null, nextCursor: null })).toBe(false);
  });
});

describe("shouldSaveStore", () => {
  it("full mode: saves when at least one queried signal answered — unchanged Task 6 rule", () => {
    expect(
      shouldSaveStore({ mode: "full", queried: ["site", "reddit"], failed: ["site"], redditProgressed: false })
    ).toBe(true);
    expect(shouldSaveStore({ mode: "full", queried: ["site"], failed: ["site"], redditProgressed: false })).toBe(false);
  });

  it("reddit-only mode: saves only when Reddit actually progressed, regardless of queried/failed", () => {
    expect(shouldSaveStore({ mode: "reddit-only", queried: ["reddit"], failed: [], redditProgressed: true })).toBe(true);
    expect(shouldSaveStore({ mode: "reddit-only", queried: ["reddit"], failed: [], redditProgressed: false })).toBe(
      false
    );
    // full mode with nothing queried at all (e.g. a store with no domain and no Reddit terms) still
    // never saves: 0 failed < 0 queried is false, not vacuously true.
    expect(shouldSaveStore({ mode: "full", queried: [], failed: [], redditProgressed: false })).toBe(false);
  });
});

// Fix round 1, ruling 3: a nightly reddit-only run must stop asking Arctic Shift about a store once
// its 24-month backfill is complete — that store's Reddit signal moves on from then on only through
// the weekly incremental refresh, so hitting it again every night would be pure cost for no new data.
describe("needsRedditBackfill", () => {
  const cursor = (backfillDone: boolean): RedditCursor => ({
    backfillStartUtc: 0,
    backfillNextUtc: 1,
    backfillDone,
    checkedUntilUtc: 1,
  });

  it("processes a store that never started (no cursor)", () => {
    expect(needsRedditBackfill(entry(), null)).toBe(true);
  });

  it("processes a store whose backfill is still running", () => {
    expect(needsRedditBackfill(entry(), cursor(false))).toBe(true);
  });

  it("skips a store whose backfill already finished — the weekly job keeps it fresh from here", () => {
    expect(needsRedditBackfill(entry(), cursor(true))).toBe(false);
  });

  it("skips a store too ambiguous to search at all, cursor or not", () => {
    expect(needsRedditBackfill(entry({ redditTerms: [] }), null)).toBe(false);
    expect(needsRedditBackfill(entry({ redditTerms: [] }), cursor(false))).toBe(false);
  });
});

// Fix round 1, ruling 2: a wall-clock cap independent of the call budget — retries and backoffs can
// make a night unusually slow even within STORES_REDDIT_MAX_CALLS, and the nightly run must still end
// before the Sunday weekly job (07:17 UTC) might start.
describe("shouldStopForDeadline", () => {
  const MAX_MINUTES = 150;

  it("keeps going before the deadline", () => {
    expect(shouldStopForDeadline((MAX_MINUTES - 1) * 60_000, MAX_MINUTES)).toBe(false);
  });

  it("stops once the deadline is reached or passed", () => {
    expect(shouldStopForDeadline(MAX_MINUTES * 60_000, MAX_MINUTES)).toBe(true);
    expect(shouldStopForDeadline((MAX_MINUTES + 1) * 60_000, MAX_MINUTES)).toBe(true);
  });

  it("never stops at zero elapsed time", () => {
    expect(shouldStopForDeadline(0, MAX_MINUTES)).toBe(false);
  });
});

describe("sync_store_profiles.ts wiring", () => {
  it("accepts --reddit-only", () => {
    expect(SRC).toContain("--reddit-only");
  });

  it("gates every outside fetch through shouldQuerySignal, not storeSignalApplies alone", () => {
    expect(SRC).toMatch(/shouldQuerySignal\(/);
  });

  it("gates the catalogue read through shouldLoadCatalog — loadCatalogPresence must not run on a reddit-only night", () => {
    expect(SRC).toMatch(/shouldLoadCatalog\(/);
    // The import line ("loadCatalogPresence,") has no opening paren, so this only matches the call.
    const call = SRC.indexOf("loadCatalogPresence(");
    expect(call).toBeGreaterThan(-1);
    const nearby = SRC.slice(Math.max(0, call - 300), call);
    expect(nearby, "loadCatalogPresence( must sit close behind an `if` that checks shouldLoadCatalog(").toMatch(
      /shouldLoadCatalog\(/
    );
  });

  it("decides whether to save through shouldSaveStore, not a bare fresh flag", () => {
    expect(SRC).toMatch(/shouldSaveStore\(/);
  });

  it("computes early-stop input from the same decision that gates saving (Reddit progress counts in reddit-only mode)", () => {
    // `runs.filter((r) => r.fresh)` feeds BOTH the save decision and shouldStopEarly's
    // `withFreshSignal`. Since `fresh` is `shouldSaveStore(...)`'s result, making the early-stop
    // counter reuse `run.fresh` (rather than a second, signal-only count) is what makes the cut
    // count Reddit progress instead of external signals in reddit-only mode.
    expect(SRC).toMatch(/withFreshSignal\s*=\s*runs\.filter\(\(r(un)?\)\s*=>\s*r(un)?\.fresh\)\.length/);
  });

  it("still guards every save behind --dry-run, in reddit-only mode too", () => {
    // Reuse of tests/stores/dry_run.test.ts's structural check: saveStoreProfiles must only ever
    // appear inside an `if (!dryRun) { ... }` block. Nothing about --reddit-only introduces a second
    // write path, so a reddit-only laptop run against production stays exactly as safe.
    const opener = /if\s*\(\s*!dryRun\s*\)\s*\{/g;
    const blocks: Array<[number, number]> = [];
    for (const match of SRC.matchAll(opener)) {
      const open = match.index! + match[0].length - 1;
      let depth = 0;
      for (let i = open; i < SRC.length; i++) {
        if (SRC[i] === "{") depth++;
        else if (SRC[i] === "}") {
          depth--;
          if (depth === 0) {
            blocks.push([open, i]);
            break;
          }
        }
      }
    }
    const calls = [...SRC.matchAll(/saveStoreProfiles\(/g)].map((m) => m.index!);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(blocks.some(([open, close]) => call > open && call < close)).toBe(true);
    }
  });

  it("reads STORES_REDDIT_MAX_MINUTES and gates the loop through shouldStopForDeadline", () => {
    expect(SRC).toMatch(/STORES_REDDIT_MAX_MINUTES/);
    expect(SRC).toMatch(/shouldStopForDeadline\(/);
  });

  it("filters stores in reddit-only mode through needsRedditBackfill before the main loop", () => {
    expect(SRC).toMatch(/needsRedditBackfill\(/);
  });
});

// Fix round 1, ruling 1: both pm2 apps write the same APP DB documents, loading them once at start
// and `$set`ting whole documents back — running at the same time lets whichever finishes first
// silently erase the other's Reddit progress. A shared flock (modelled on scripts/run-rentals.sh)
// makes that structurally impossible: the nightly reddit-only run never blocks the weekly full run
// for long (it just skips itself), and the weekly full run waits out a nightly run in progress
// instead of racing it.
describe("scripts/run-store-profiles.sh", () => {
  const WRAPPER = fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "run-store-profiles.sh"), "utf8");
  const apps = require(path.join(__dirname, "..", "..", "ecosystem.config.js")).apps.filter((app: { name: string }) =>
    ["currency-store-profiles", "currency-store-reddit"].includes(app.name)
  );

  it("routes both store-profile schedules through the same Bash wrapper", () => {
    expect(apps).toHaveLength(2);
    for (const app of apps) {
      expect(app.script).toBe("scripts/run-store-profiles.sh");
      expect(app.interpreter).toBe("bash");
      expect(app.autorestart).toBe(false);
      expect(app.exec_mode).toBe("fork");
    }
    expect(apps.find((app: any) => app.name === "currency-store-profiles").cron_restart).toBe("17 7 * * 0");
    expect(apps.find((app: any) => app.name === "currency-store-reddit")).toMatchObject({
      cron_restart: "41 3 * * *",
      args: "--reddit-only",
    });
  });

  it("holds the same descriptor through exec and distinguishes contention from lock errors", () => {
    expect(WRAPPER).toContain('exec 9>"$STORES_LOCK"');
    expect(WRAPPER).toContain("flock -n -E 75 9");
    expect(WRAPPER).toContain('flock -w "$FULL_LOCK_WAIT_SECONDS" -E 75 9');
    expect(WRAPPER).toContain('FULL_LOCK_WAIT_SECONDS="${STORES_FULL_LOCK_WAIT_SECONDS:-7200}"');
    expect(WRAPPER).toContain('STORES_LOCK="${STORES_LOCK_FILE:-/tmp/cambio-uruguay-store-profiles.lock}"');
    expect(WRAPPER).toContain('if [[ "$argument" == "--reddit-only" ]]');
    expect(WRAPPER).toContain('exec node dist/sync_store_profiles.js "$@"');
    expect(WRAPPER).toContain("otra sincronización está en curso; se saltea la corrida de Reddit.");
    expect(WRAPPER).toContain('[[ "$status" -eq 75 ]]');
    expect(WRAPPER).toContain("exit 75");
    expect(WRAPPER).toContain('exit "$status"');
    expect(WRAPPER).not.toMatch(/flock\s+-u|exec\s+9>&-|\brm\b/);
    expect(WRAPPER.indexOf('cd "$REPO_DIR"')).toBeLessThan(WRAPPER.indexOf("exec node"));
  });

  it("is valid Bash with LF line endings", () => {
    expect(WRAPPER).not.toContain("\r");
    const { spawnSync } = require("child_process");
    const result = spawnSync("bash", ["-n", path.join(__dirname, "..", "..", "scripts", "run-store-profiles.sh")], {
      encoding: "utf8",
    });
    expect(result.stderr, result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("keeps both jobs in the OTHER_APPS registration fleet", () => {
    const deploy = fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "deploy-backend.sh"), "utf8");
    const registered = deploy.match(/OTHER_APPS=\(([^)]*)\)/)![1]!.split(/\s+/);
    expect(registered).toContain("currency-store-profiles");
    expect(registered).toContain("currency-store-reddit");
  });

  it("deploys wrapper-only changes — a commit touching only the shell script must still trigger a backend deploy", () => {
    // Same trap as app/**: `deploy.yml`'s `backend` path filter lists individual wrapper scripts by
    // name (scripts/run-rentals.sh, scripts/run-property-opportunities.sh) rather than `scripts/**`,
    // so a new wrapper that forgets this line deploys nothing when it changes on its own.
    const workflow = fs.readFileSync(path.join(__dirname, "..", "..", ".github", "workflows", "deploy.yml"), "utf8");
    const backendFilter = workflow.split("            backend:")[1]?.split("\n  backend-test:")[0];
    expect(backendFilter).toContain("- 'scripts/run-store-profiles.sh'");
  });
});
