import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

// Every root pm2 job reports to Sentry (crash, non-zero exit, cron check-in) only if its
// entrypoint imports ./sentry_job FIRST. Before 2026-11-22 two of ~85 did, and a failing job was
// invisible until someone opened /estado. A new job added without the import fails here.

const ROOT = path.resolve(__dirname, "../..");
const apps: Array<{ name: string; script?: string; cwd?: string }> = require(path.join(ROOT, "ecosystem.config.js")).apps;

/** Not a root TypeScript job: the API (sentry.ts) and the app's own translation script. */
const EXEMPT = new Map([
  ["currency-server", "the API: initialized by sentry.ts, must not install the job exit hooks"],
  ["currency-autotranslate", "an .mjs script of the app package, outside the root build"],
]);

function entrypointsOf(app: { script?: string }): string[] {
  const script = String(app.script || "");
  const direct = script.match(/^dist\/(\w+)\.js$/);
  if (direct) return [direct[1]];
  if (script.endsWith(".sh")) {
    const shell = fs.readFileSync(path.join(ROOT, script), "utf8");
    return [...new Set([...shell.matchAll(/dist\/(\w+)\.js/g)].map((match) => match[1]))];
  }
  return [];
}

function firstImport(file: string): string | undefined {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((line) => /^import\b/.test(line));
}

describe("pm2 job entrypoints", () => {
  const rootApps = apps.filter((app) => !app.cwd && !EXEMPT.has(app.name));

  it("covers the root jobs (sanity: the parser still finds them)", () => {
    expect(rootApps.length).toBeGreaterThan(60);
  });

  for (const app of rootApps) {
    it(`${app.name} imports ./sentry_job first`, () => {
      const entries = entrypointsOf(app);
      expect(entries.length, `${app.name}: no dist/<entry>.js found in ${app.script}`).toBeGreaterThan(0);
      for (const entry of entries) {
        const file = path.join(ROOT, `${entry}.ts`);
        expect(fs.existsSync(file), `${entry}.ts`).toBe(true);
        expect(firstImport(file), `${entry}.ts`).toBe('import "./sentry_job";');
      }
    });
  }

  it("the API does not load the job hooks", () => {
    const api = fs.readFileSync(path.join(ROOT, "index.ts"), "utf8");
    expect(api).not.toMatch(/sentry_job/);
  });
});
