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
  redditProgressed,
  shouldLoadCatalog,
  shouldQuerySignal,
  shouldSaveStore,
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
    // Even a "successful" Reddit call (no failure at all) does not earn a write on its own.
    expect(
      shouldSaveStore({ mode: "reddit-only", queried: ["reddit"], failed: [], redditProgressed: false })
    ).toBe(false);
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
});
