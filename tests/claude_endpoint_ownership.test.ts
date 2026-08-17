import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..");

/**
 * Same rule as `gemini_key_ownership.test.ts`, for the same reason — but the stakes here are
 * different in kind.
 *
 * The Claude endpoint runs on the maintainer's personal SUBSCRIPTION: 200 calls a day, shared with
 * their own interactive Claude Code. A second caller in this repo would be a second place where the
 * daily reserve, the never-retry-on-saturation rule and the caveman workaround all have to be
 * remembered — and the failure mode is not a wrong answer, it is a person losing their tool for the
 * rest of the day because a cron job spent it.
 *
 * One file reads the key: `classes/claude.ts`. Everything else goes through `classes/ai_text.ts`.
 */
describe("the Claude agent endpoint has exactly one owner", () => {
  const walk = (dir: string, hit: (file: string, src: string) => void): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      // `.claude` holds git worktrees — each a full checkout with its own classes/claude.ts, which
      // would false-red on the duplicate owner. CI checks out clean and never hits it.
      if (["node_modules", "dist", ".git", "app", "mcp", "bots", "docs", ".claude"].includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, hit);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        hit(path.relative(ROOT, full).split(path.sep).join("/"), fs.readFileSync(full, "utf8"));
      }
    }
  };

  it("only classes/claude.ts reads CLAUDE_AGENT_API_KEY", () => {
    const callers: string[] = [];
    walk(ROOT, (file, src) => {
      if (src.includes("CLAUDE_AGENT_API_KEY")) callers.push(file);
    });
    expect(callers).toEqual(["classes/claude.ts"]);
  });

  it("only classes/claude.ts posts to the agent endpoint", () => {
    const callers: string[] = [];
    walk(ROOT, (file, src) => {
      if (/\/agent\b/.test(src) && /axios|fetch\(/.test(src)) callers.push(file);
    });
    expect(callers).toEqual(["classes/claude.ts"]);
  });

  it("is not vacuous — the owner really is there", () => {
    const src = fs.readFileSync(path.join(ROOT, "classes", "claude.ts"), "utf8");
    expect(src).toContain("CLAUDE_AGENT_API_KEY");
    expect(src).toContain("/agent");
  });
});
