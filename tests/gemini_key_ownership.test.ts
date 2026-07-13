import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

describe("the Gemini key has exactly one owner", () => {
  // One client, one key read. Eight modules each rolling their own $fetch to
  // generativelanguage.googleapis.com is how the app ended up with an unresolved-redirect grounding
  // bug in four places at once. In the backend there is one file, and it is classes/gemini.ts.
  it("only classes/gemini.ts talks to the Gemini endpoint", () => {
    const callers: string[] = [];
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (["node_modules", "dist", ".git", "app", "mcp", "bots", "docs"].includes(e.name)) continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts")) {
          if (/generativelanguage\.googleapis\.com/.test(fs.readFileSync(full, "utf8"))) {
            // Normalize to forward slashes: path.relative uses the OS separator, and this repo is
            // developed on both Windows and Linux CI — the assertion below must not be platform-specific.
            callers.push(path.relative(ROOT, full).split(path.sep).join("/"));
          }
        }
      }
    };
    walk(ROOT);
    expect(callers).toEqual(["classes/gemini.ts"]);
  });
});
