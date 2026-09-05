// A cron job that pm2 never starts is invisible: nothing errors, nothing logs,
// the collection it writes simply stops moving and somebody notices weeks later
// that a page is stale.
//
// `scripts/deploy-backend.sh` only ever `pm2 start`s the apps listed in its
// `OTHER_APPS` array — everything else it leaves alone, because the API itself
// is reloaded separately. So an app added to `ecosystem.config.js` and forgotten
// there is registered nowhere on the VPS. The root AGENTS.md warns about it in
// prose; this is the same warning where it can fail a build.
//
// Scope covers root sync entrypoints and their shared rental lock wrapper:
//   * `currency-server` is the API, reloaded by its own step in the deploy;
//   * the `mcp/` and `bots/` apps build from their own packages with their own
//     cwd and are not this script's business.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");

interface Pm2App {
  name: string;
  script: string;
}

function pm2Apps(): Pm2App[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const config = require(path.join(ROOT, "ecosystem.config.js"));
  return (config.apps as Pm2App[]).map((app) => ({ name: app.name, script: app.script }));
}

function otherApps(): string[] {
  const script = fs.readFileSync(path.join(ROOT, "scripts", "deploy-backend.sh"), "utf8");
  const match = script.match(/OTHER_APPS=\(([^)]*)\)/);
  if (!match) throw new Error("OTHER_APPS array not found in scripts/deploy-backend.sh");
  return match[1].split(/\s+/).filter(Boolean);
}

describe("pm2 fleet registration", () => {
  const apps = pm2Apps();
  const registered = new Set(otherApps());

  it("finds a real fleet in both files (vacuity guard)", () => {
    expect(apps.length).toBeGreaterThan(20);
    expect(registered.size).toBeGreaterThan(20);
  });

  it("registers every scheduled sync job in the deploy script", () => {
    const missing = apps
      .filter((app) => /^dist\/sync_[a-z0-9_]+\.js$/.test(app.script) || app.script === "scripts/run-rentals.sh")
      .filter((app) => !registered.has(app.name))
      .map((app) => app.name);
    expect(missing, `add these to OTHER_APPS in scripts/deploy-backend.sh: ${missing.join(", ")}`).toEqual([]);
  });

  it("never names an app the ecosystem config does not define", () => {
    const names = new Set(apps.map((app) => app.name));
    const orphans = [...registered].filter((name) => !names.has(name));
    expect(orphans, `these are in OTHER_APPS but not in ecosystem.config.js: ${orphans.join(", ")}`).toEqual([]);
  });

  it("keeps the API out of the start list — it is reloaded, not started", () => {
    expect(registered.has("currency-server")).toBe(false);
  });

  it("keeps the cron-drift check in the deploy script", () => {
    // pm2 guarda la expresión cron con la que se arrancó el proceso: editar
    // `cron_restart` y desplegar NO cambia cuándo corre el job en el VPS. El
    // archivo dice una cosa y la máquina hace otra, y nada lo reporta. El script
    // compara el cron vivo contra el del archivo y recrea sólo lo que difiere;
    // si alguien saca esa comparación, esto falla.
    const script = fs.readFileSync(path.join(ROOT, "scripts", "deploy-backend.sh"), "utf8");
    expect(script).toContain("cron_restart");
    expect(script).toMatch(/cron cambió/);
  });

  it("never lets a cron app autorestart", () => {
    // A cron app that autorestarts turns "runs at 05:09" into "runs forever":
    // pm2 restarts it the moment it exits, so the schedule stops meaning
    // anything and the job hammers its upstreams in a loop.
    // `currency-sheet` is deliberately not in scope — it is a long-running
    // process with no cron, which is why the filter is "has a cron", not
    // "is a sync script".
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const full = require(path.join(ROOT, "ecosystem.config.js")).apps as any[];
    for (const app of full.filter((entry) => entry.cron_restart)) {
      expect(app.autorestart, `${app.name} has a cron_restart, so it must set autorestart:false`).toBe(false);
    }
    expect(full.filter((entry) => entry.cron_restart).length).toBeGreaterThan(20);
  });
});
