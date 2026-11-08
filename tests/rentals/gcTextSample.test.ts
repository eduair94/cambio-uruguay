import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The hand-labelling sample for RENTALS_GC_FROM_TEXT is run from a machine whose .env points at the
// PRODUCTION database. It may only read: no write method, no aggregation stage that writes.
describe("the gastos comunes sample script", () => {
  const root = join(__dirname, "..", "..");
  // Comments describe what it never does; only the code is held to it.
  const code = readFileSync(join(root, "scripts", "oneoff", "rentals_gc_text_sample.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("never writes the database it reads", () => {
    expect(code).toMatch(/\.aggregate</);
    expect(code).not.toMatch(
      /\b(?:insert(?:One|Many)?|update(?:One|Many)?|replaceOne|delete(?:One|Many)?|bulkWrite|findOneAnd\w+|findAndModify|drop\w*|createIndex(?:es)?|save|rename)\s*\(/
    );
    expect(code).not.toMatch(/\$out\b|\$merge\b/);
    // Through the raw driver collection only: a mongoose model is what casts and writes.
    expect(code).not.toMatch(/classes\/models\//);
  });

  it("is the npm script the docs name", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.scripts.rentals_gc_text_sample).toBe("ts-node scripts/oneoff/rentals_gc_text_sample.ts");
  });
});
