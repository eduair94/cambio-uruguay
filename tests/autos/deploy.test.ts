import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("used-car job wiring", () => {
  it("runs the daily and hourly jobs through the same exclusive wrapper", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const apps = require(path.join(ROOT, "ecosystem.config.js")).apps
      .filter((app: { name: string }) => app.name === "currency-autos" || app.name === "currency-autos-hourly");
    expect(apps).toHaveLength(2);
    for (const app of apps) {
      expect(app).toMatchObject({ script: "scripts/run-autos.sh", interpreter: "bash", autorestart: false, exec_mode: "fork" });
    }
    expect(apps.find((app: { name: string }) => app.name === "currency-autos-hourly").args).toBe("--fast");
  });
  it("reads the price guide as its own single daily job, started on deploy", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const guide = require(path.join(ROOT, "ecosystem.config.js")).apps.find((app: { name: string }) => app.name === "currency-autos-guide");
    expect(guide).toMatchObject({ script: "dist/sync_autos_guide.js", autorestart: false, exec_mode: "fork", cron_restart: "13 5 * * *" });
    expect(read("scripts/deploy-backend.sh")).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos-guide\b[^)]*\)/);
  });
  it("starts both on deploy and redeploys when the wrapper changes", () => {
    const deploy = read("scripts/deploy-backend.sh");
    expect(deploy).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos\b[^)]*\)/);
    expect(deploy).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos-hourly\b[^)]*\)/);
    expect(read(".github/workflows/deploy.yml")).toContain("'scripts/run-autos.sh'");
  });
  it("locks and execs the compiled entrypoint, waiting for the full sweep but not the hourly one", () => {
    const wrapper = read("scripts/run-autos.sh");
    expect(wrapper).toContain("flock -n -E 75 9");
    expect(wrapper).toContain('flock -w "$FULL_LOCK_WAIT_SECONDS" -E 75 9');
    expect(wrapper).toContain('exec node dist/sync_autos.js "$@"');
  });
});
