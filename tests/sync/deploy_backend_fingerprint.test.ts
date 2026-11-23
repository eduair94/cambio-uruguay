import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";

// scripts/deploy-backend.sh saltea npm install, tsc y el reload de la API cuando la huella de lo
// que compila coincide con la del dist/ vivo, y registra los ~85 jobs de pm2 con UNA foto de pm2
// (antes: dos procesos de pm2 y dos de node por app, 70 s por deploy). Ninguna de las dos cosas
// puede costar un job sin registrar o recreado de más.
const ROOT = path.resolve(__dirname, "../..");
const deploy = fs.readFileSync(path.join(ROOT, "scripts", "deploy-backend.sh"), "utf8");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const apps = require(path.join(ROOT, "ecosystem.config.js")).apps as any[];

describe("deploy-backend.sh: compila sólo lo que cambió", () => {
  it("escribe la huella en el candidato, después del chequeo de entradas y antes del swap", () => {
    const sanity = deploy.indexOf('if [ ! -f "$STAGING/index.js" ]');
    const stamp = deploy.indexOf('>"$STAGING/$BUILD_STAMP"');
    const swap = deploy.indexOf('mv "$STAGING" "$REPO_DIR/dist"');
    expect(sanity).toBeGreaterThan(-1);
    expect(stamp).toBeGreaterThan(sanity);
    expect(swap).toBeGreaterThan(stamp);
  });

  it("nunca saltea el registro de los jobs de pm2, compile o no", () => {
    const skipBlockEnd = deploy.indexOf('if [ "$SKIP_BUILD" = "1" ] && api_settled; then');
    const registration = deploy.indexOf('REGISTRATION_PLAN="$(pm2 jlist');
    expect(skipBlockEnd).toBeGreaterThan(-1);
    expect(registration).toBeGreaterThan(skipBlockEnd);
    expect(deploy.slice(registration)).toContain('pm2 start ecosystem.config.js --only "$app"');
  });

  it("clasifica cada app con una sola foto de pm2: ok, sin registrar o con deriva", () => {
    const program = deploy
      .split("REGISTRATION_PLAN=\"$(pm2 jlist 2>/dev/null | node -e '\n")[1]!
      .split("\n' \"$REPO_DIR\" \"${OTHER_APPS[@]}\"")[0]!;
    const repo = ROOT.replace(/\\/g, "/");
    const withCron = apps.filter((app) => app.cron_restart && !String(app.script).endsWith(".sh"));
    const [same, drifted, running, missing, bare] = withCron.slice(0, 5);
    const env = (app: any, overrides: Record<string, unknown> = {}) => ({
      status: "stopped",
      cron_restart: app.cron_restart,
      pm_exec_path: path.posix.join(repo, app.script),
      exec_interpreter: app.interpreter || "node",
      args: app.args || "",
      ...overrides,
    });
    const live = [
      { name: same.name, pm2_env: env(same) },
      { name: drifted.name, pm2_env: env(drifted, { cron_restart: "1 1 * * *" }) },
      { name: running.name, pm2_env: env(running, { cron_restart: "2 2 * * *", status: "online" }) },
      { name: bare.name },
    ];
    const names = [same, drifted, running, missing, bare].map((app) => app.name);
    const result = spawnSync(process.execPath, ["-e", program, repo, ...names], {
      input: JSON.stringify(live),
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    const rows = result.stdout
      .trim()
      .split("\n")
      .map((line) => line.split("\x1f"));
    const byName = new Map(rows.map((row) => [row[0], row]));
    expect(byName.get(same.name)).toEqual([same.name, "ok"]);
    expect(byName.get(missing.name)).toEqual([missing.name, "missing"]);
    expect(byName.get(drifted.name)!.slice(0, 3)).toEqual([drifted.name, "drift", "stopped"]);
    expect(byName.get(drifted.name)![3]).toContain("1 1 * * *");
    expect(byName.get(drifted.name)![4]).toContain(String(drifted.cron_restart));
    // Una app corriendo con deriva se informa con su estado: el bucle la deja para el próximo deploy.
    expect(byName.get(running.name)!.slice(0, 3)).toEqual([running.name, "drift", "online"]);
    expect(byName.get(bare.name)!.slice(0, 2)).toEqual([bare.name, "drift"]);
  });

  it("sin una foto legible de pm2 no compara: sólo arranca lo que falte", () => {
    const program = deploy
      .split("REGISTRATION_PLAN=\"$(pm2 jlist 2>/dev/null | node -e '\n")[1]!
      .split("\n' \"$REPO_DIR\" \"${OTHER_APPS[@]}\"")[0]!;
    const result = spawnSync(process.execPath, ["-e", program, ROOT.replace(/\\/g, "/"), "currency-sync"], {
      input: "not json",
      encoding: "utf8",
    });
    // El plan sale vacío y el script cae a `printf '%s\037unknown\n'`, que sólo usa `pm2 describe`.
    expect(result.stdout).toBe("");
    expect(deploy).toContain("printf '%s\\037unknown\\n' \"${OTHER_APPS[@]}\"");
  });
});
