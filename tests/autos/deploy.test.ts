import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

describe("used-car job wiring", () => {
  it("runs the daily and hourly jobs through the same exclusive wrapper", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const apps = require(path.join(ROOT, "ecosystem.config.js")).apps.filter((app: { name: string }) => app.name.startsWith("currency-autos"));
    expect(apps.map((app: { name: string }) => app.name).sort()).toEqual(["currency-autos", "currency-autos-hourly"]);
    for (const app of apps) {
      expect(app).toMatchObject({ script: "scripts/run-autos.sh", interpreter: "bash", autorestart: false, exec_mode: "fork" });
    }
    expect(apps.find((app: { name: string }) => app.name === "currency-autos-hourly").args).toBe("--fast");
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
