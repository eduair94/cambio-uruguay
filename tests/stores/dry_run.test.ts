// Task 6: `sync_store_profiles.ts --dry-run` is how anyone checks the store job from a laptop — and
// the laptop's `.env` points at the PRODUCTION Mongo. So the dry path must be structurally unable to
// write: the writer module is never statically imported (only loaded inside the non-dry branch),
// and every call to `saveStoreProfiles` sits inside an `if (!dryRun) { ... }` block. Read as text on
// purpose: running the job would need network and a database, and the point is that nobody has to.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "sync_store_profiles.ts"), "utf8");

/** [open, close] offsets of every `if (!dryRun) { ... }` block, matched by brace counting. */
function notDryRunBlocks(src: string): Array<[number, number]> {
  const blocks: Array<[number, number]> = [];
  const opener = /if\s*\(\s*!dryRun\s*\)\s*\{/g;
  for (const match of src.matchAll(opener)) {
    const open = match.index! + match[0].length - 1;
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) {
          blocks.push([open, i]);
          break;
        }
      }
    }
  }
  return blocks;
}

describe("sync_store_profiles.ts dry run", () => {
  it("accepts --dry-run and --only=", () => {
    expect(SRC).toContain("--dry-run");
    expect(SRC).toContain("--only=");
  });

  it("calls saveStoreProfiles at least once, and only inside if (!dryRun) { ... }", () => {
    const calls = [...SRC.matchAll(/saveStoreProfiles\(/g)].map((m) => m.index!);
    expect(calls.length).toBeGreaterThan(0);
    const blocks = notDryRunBlocks(SRC);
    expect(blocks.length).toBeGreaterThan(0);
    for (const call of calls) {
      const guarded = blocks.some(([open, close]) => call > open && call < close);
      expect(guarded, `saveStoreProfiles( at offset ${call} is outside an if (!dryRun) block`).toBe(true);
    }
  });

  it("never statically imports the writer module", () => {
    expect(SRC).not.toMatch(/^import[^;]*from\s+["']\.\/classes\/stores\/store["']/m);
  });

  it("refuses to write without the app database configured", () => {
    // The guard itself, not just the name: `appDbConfigured()` also appears in the catalogue branch.
    expect(SRC).toMatch(/if\s*\(\s*!dryRun\s*&&\s*!appDbConfigured\(\)\s*\)\s*\{[^}]*process\.exit\(1\);?\s*\}/);
  });
});
