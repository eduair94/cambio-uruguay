import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const WRAPPER = "scripts/run-rentals.sh";
const wrapper = fs.readFileSync(path.join(ROOT, WRAPPER), "utf8");
const deploy = fs.readFileSync(path.join(ROOT, "scripts/deploy-backend.sh"), "utf8");
const rentals = require(path.join(ROOT, "ecosystem.config.js")).apps.filter((app: any) =>
  ["currency-rentals", "currency-rentals-hourly"].includes(app.name));

describe("shared rental process lock", () => {
  it("routes both existing schedules through the same Bash wrapper", () => {
    expect(rentals).toHaveLength(2);
    for (const app of rentals) {
      expect(app.script).toBe(WRAPPER);
      expect(app.interpreter).toBe("bash");
      expect(app.autorestart).toBe(false);
      expect(app.exec_mode).toBe("fork");
    }
    expect(rentals.find((app: any) => app.name === "currency-rentals").cron_restart).toBe("52 4 * * *");
    expect(rentals.find((app: any) => app.name === "currency-rentals-hourly")).toMatchObject({
      cron_restart: "47 * * * *", args: "--fast",
    });
  });

  it("holds the same descriptor through exec and distinguishes contention from lock errors", () => {
    expect(wrapper).toContain('exec 9>"$RENTAL_LOCK"');
    expect(wrapper).toContain("flock -n -E 75 9");
    expect(wrapper).toContain('flock -w "$FULL_LOCK_WAIT_SECONDS" -E 75 9');
    expect(wrapper).toContain('FULL_LOCK_WAIT_SECONDS="${RENTALS_FULL_LOCK_WAIT_SECONDS:-3600}"');
    expect(wrapper).toContain('if [[ "$argument" == "--fast" ]]; then FAST=1; fi');
    expect(wrapper).toContain('exec node dist/sync_rentals.js "$@"');
    expect(wrapper).toContain('[[ "$status" -eq 75 ]]');
    expect(wrapper).toContain('exit "$status"');
    expect(wrapper).toContain("exit 75");
    expect(wrapper).not.toMatch(/flock\s+-u|exec\s+9>&-|\brm\b/);
    expect(wrapper.indexOf('cd "$REPO_DIR"')).toBeLessThan(wrapper.indexOf("exec node"));
  });

  it("deploys wrapper-only changes and keeps the jobs in the registration fleet", () => {
    const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/deploy.yml"), "utf8");
    const backendFilter = workflow.split("            backend:")[1]?.split("\n  backend-test:")[0];
    expect(backendFilter).toContain("- 'scripts/run-rentals.sh'");
    const registered = deploy.match(/OTHER_APPS=\(([^)]*)\)/)![1]!.split(/\s+/);
    expect(registered).toContain("currency-rentals");
    expect(registered).toContain("currency-rentals-hourly");
  });

  it("detects existing pm2 registrations that would otherwise bypass the lock", () => {
    // Execute the exact read-only comparison embedded in deploy, with synthetic pm2 metadata.
    // Nothing invokes pm2 or a rental job in this test.
    const migration = deploy.slice(deploy.indexOf('rental_recreate="'));
    const comparison = migration.split("node -e '\n")[1]!.split('\n\' "$REPO_DIR")"')[0]!;
    const current = rentals.map((app: any) => ({ name: app.name, pm2_env: {
      pm_exec_path: path.resolve(ROOT, app.script), exec_interpreter: "/usr/bin/bash",
    } }));
    const compare = (state: unknown): string => {
      const result = spawnSync(process.execPath, ["-e", comparison, ROOT], { input: JSON.stringify(state), encoding: "utf8" });
      expect(result.status, result.stderr).toBe(0);
      return result.stdout;
    };
    expect(compare(current)).toBe("");
    expect(compare(current.map((app: any) => ({ ...app, pm2_env: {
      pm_exec_path: path.resolve(ROOT, "dist/sync_rentals.js"), exec_interpreter: process.execPath,
    } })))).toBe("currency-rentals currency-rentals-hourly");
    expect(compare([{ ...current[0], pm2_env: { ...current[0].pm2_env, exec_interpreter: "node" } }, current[1]])).toBe("currency-rentals");
    expect(deploy).toContain("rental_wait_started=$SECONDS");
    expect(deploy).toContain("SECONDS - rental_wait_started >= 3600");
    expect(deploy.indexOf("for rental_app in $rental_recreate")).toBeLessThan(deploy.indexOf('for app in "${OTHER_APPS[@]}"'));
  });

  it.skipIf(process.platform !== "linux")("skips hourly overlap, times out visibly, and lets the queued full sweep run after release", async () => {
    expect(spawnSync("bash", ["-c", "command -v flock"], { encoding: "utf8" }).status).toBe(0);
    const temporary = fs.mkdtempSync(path.join(ROOT, ".sdd-rentals-lock-"));
    fs.mkdirSync(path.join(temporary, "scripts"));
    fs.mkdirSync(path.join(temporary, "dist"));
    fs.copyFileSync(path.join(ROOT, WRAPPER), path.join(temporary, WRAPPER));
    // A local stand-in proves process/descriptor behavior without importing the real sync,
    // reading credentials, issuing network requests, or touching either database.
    fs.writeFileSync(path.join(temporary, "dist/sync_rentals.js"), `
      const fs = require("fs");
      fs.writeFileSync(process.env.RENTAL_TEST_READY, JSON.stringify({ pid: process.pid, locked: fs.fstatSync(9).isFile(), args: process.argv.slice(2) }));
      if (process.env.RENTAL_TEST_HOLD === "1") setInterval(() => {}, 100);
    `);
    const ready = path.join(temporary, "ready.json");
    const secondReady = path.join(temporary, "second.json");
    const fullReady = path.join(temporary, "full.json");
    const env = { ...process.env, RENTALS_FAST: "0", RENTALS_FULL_LOCK_WAIT_SECONDS: "5", RENTALS_LOCK_FILE: path.join(temporary, "shared.lock"), RENTAL_TEST_READY: ready, RENTAL_TEST_HOLD: "1" };
    const first = spawn("bash", [path.join(temporary, WRAPPER), "--fast"], { env, stdio: "pipe" });
    const exited = new Promise<void>((resolve, reject) => { first.once("exit", () => resolve()); first.once("error", reject); });
    let queued: ReturnType<typeof spawn> | undefined;
    let queuedExit: Promise<void> | undefined;
    try {
      const deadline = Date.now() + 5000;
      while (!fs.existsSync(ready) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
      expect(fs.existsSync(ready)).toBe(true);
      expect(JSON.parse(fs.readFileSync(ready, "utf8"))).toMatchObject({ pid: first.pid, locked: true, args: ["--fast"] });
      const secondEnv = { ...env, RENTAL_TEST_READY: secondReady, RENTAL_TEST_HOLD: "0" };
      const blocked = spawnSync("bash", [path.join(temporary, WRAPPER), "--fast"], { env: secondEnv, encoding: "utf8", timeout: 3000 });
      expect(blocked.status, blocked.stderr).toBe(0);
      expect(blocked.stdout).toContain("se saltea esta ejecución");
      expect(fs.existsSync(secondReady)).toBe(false);
      const startedWaiting = Date.now();
      const timedOut = spawnSync("bash", [path.join(temporary, WRAPPER)], {
        env: { ...secondEnv, RENTALS_FULL_LOCK_WAIT_SECONDS: "1" }, encoding: "utf8", timeout: 3000,
      });
      expect(timedOut.status, timedOut.stderr).toBe(75);
      expect(timedOut.stderr).toContain("el barrido completo agotó la espera");
      expect(Date.now() - startedWaiting).toBeGreaterThanOrEqual(900);
      expect(fs.existsSync(secondReady)).toBe(false);
      queued = spawn("bash", [path.join(temporary, WRAPPER)], {
        env: { ...secondEnv, RENTAL_TEST_READY: fullReady }, stdio: "pipe",
      });
      queuedExit = new Promise<void>((resolve, reject) => { queued!.once("exit", () => resolve()); queued!.once("error", reject); });
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(queued.exitCode).toBeNull();
      expect(fs.existsSync(fullReady)).toBe(false);
      first.kill("SIGKILL");
      await exited;
      await queuedExit;
      expect(queued.exitCode).toBe(0);
      expect(JSON.parse(fs.readFileSync(fullReady, "utf8"))).toMatchObject({ pid: queued.pid, locked: true, args: [] });
      const next = spawnSync("bash", [path.join(temporary, WRAPPER), "--fast"], { env: secondEnv, encoding: "utf8", timeout: 3000 });
      expect(next.status, next.stderr).toBe(0);
      expect(JSON.parse(fs.readFileSync(secondReady, "utf8"))).toMatchObject({ locked: true, args: ["--fast"] });
    } finally {
      if (first.exitCode === null && first.signalCode === null) { first.kill("SIGKILL"); await exited; }
      if (queued && queued.exitCode === null && queued.signalCode === null) { queued.kill("SIGKILL"); await queuedExit; }
      if (path.dirname(path.resolve(temporary)) !== path.resolve(ROOT)) throw new Error("Refusing cleanup outside test workspace");
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }, 15000);
});
