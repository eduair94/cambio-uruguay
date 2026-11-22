import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

describe("the Anthropic API keys have exactly one owner", () => {
  // Same rule as tests/gemini_key_ownership.test.ts, for the same reason: the keys are three
  // prepaid balances, and the rotation that stops a dead key from costing a round trip on every
  // call, the usage count per key and the "never log a whole key" rule live in one file. A second
  // client would quietly spend the same credit without any of that.
  it("only classes/anthropic.ts imports the SDK or reads ANTHROPIC_API_KEY*", () => {
    const owners: string[] = [];
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", "dist", ".git", "app", "mcp", "bots", "docs", ".claude", ".superpowers"].includes(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
          const src = fs.readFileSync(full, "utf8");
          if (/@anthropic-ai\/sdk|ANTHROPIC_API_KEY/.test(src)) owners.push(path.relative(ROOT, full).split(path.sep).join("/"));
        }
      }
    };
    walk(ROOT);
    expect(owners).toEqual(["classes/anthropic.ts"]);
  });
});
