import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { PRODUCTOS_VIDA_WINDOW } from "../../classes/productosvida/registry";

const ROOT = path.join(__dirname, "..", "..");

interface Pm2App {
  name: string;
  script: string;
  cron_restart?: string;
  autorestart?: boolean;
  exec_mode?: string;
  log_date_format?: string;
}

const app = (): Pm2App => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const apps = require(path.join(ROOT, "ecosystem.config.js")).apps as Pm2App[];
  const found = apps.find((entry) => entry.name === "currency-productos-vida");
  if (!found) throw new Error("currency-productos-vida no está en ecosystem.config.js");
  return found;
};

describe("currency-productos-vida en pm2", () => {
  it("es un cron de una sola instancia que corre el build del job", () => {
    expect(app()).toEqual({
      name: "currency-productos-vida",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_productos_vida.js",
      cron_restart: "13 0,4,16,20 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    });
  });

  it("está en OTHER_APPS de scripts/deploy-backend.sh (si no, el VPS nunca lo arranca)", () => {
    const script = readFileSync(path.join(ROOT, "scripts", "deploy-backend.sh"), "utf8");
    const list = /OTHER_APPS=\(([^)]*)\)/.exec(script)![1]!.split(/\s+/);
    expect(list).toContain("currency-productos-vida");
  });

  // El cron y la puerta de main() salen de los mismos números: si uno cambia solo, el job o corre
  // fuera de la ventana o sale sin leer en cada corrida.
  it("el cron y la ventana de main() no pueden separarse", () => {
    const [minute, hours, ...rest] = app().cron_restart!.split(" ");
    expect(Number(minute)).toBe(PRODUCTOS_VIDA_WINDOW.fromMinute);
    expect(hours).toBe(PRODUCTOS_VIDA_WINDOW.hours.join(","));
    expect(rest).toEqual(["*", "*", "*"]);
    expect(PRODUCTOS_VIDA_WINDOW.toMinute - PRODUCTOS_VIDA_WINDOW.fromMinute).toBe(1);
  });

  it("el minuto 13 cae entre los consumidores horarios del puente de Mercado Libre, sin pisar a ninguno", () => {
    const minute = PRODUCTOS_VIDA_WINDOW.fromMinute;
    // movilidad-specs :01, movilidad-horaria :07, sillas :23, autos :29, celulares :37,
    // equipar-specs :40, motos :44, alquileres :47, equipar :53. Misma regla que
    // tests/movilidad/specs_bridge.test.ts.
    for (const other of [1, 7, 23, 29, 37, 40, 44, 47, 53]) {
      expect((minute - other + 60) % 60, `:${other}`).toBeGreaterThanOrEqual(6);
      expect((other - minute + 60) % 60, `:${other}`).toBeGreaterThanOrEqual(5);
    }
  });

  it("las horas esquivan autos-parts (02/18/22), el barrido diario de autos (07–10) y la diaria de sillas (11)", () => {
    for (const hour of PRODUCTOS_VIDA_WINDOW.hours) {
      expect([2, 18, 22, 7, 8, 9, 10, 11, 12], String(hour)).not.toContain(hour);
    }
  });

  it("el registro está en appContracts de deploy.yml, para que un cambio sólo del backend corra la paridad del app", () => {
    const workflow = readFileSync(path.join(ROOT, ".github", "workflows", "deploy.yml"), "utf8");
    const contracts = /appContracts:\n([\s\S]*?)\n\s*backendContracts:/.exec(workflow)?.[1] ?? "";
    expect(contracts).toContain("- 'classes/productosvida/registry.ts'");
  });
});
