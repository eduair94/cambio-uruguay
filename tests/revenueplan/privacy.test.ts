// El plan de ingreso cruza las dos cosas que este repo ya decidió no publicar: las consultas de
// Search Console y cuánto factura cada familia de página. Este test es lo único que va a notar el
// día que alguien lo enganche a una ruta pública "para una tarjetita en la home".
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { RevenuePlanSnapshotModel } from "../../classes/models/RevenuePlanSnapshot";
import { SiteAnalyticsSnapshotModel } from "../../classes/models/SiteAnalyticsSnapshot";

const APP = path.join(__dirname, "..", "..", "app");
const read = (...parts: string[]) => fs.readFileSync(path.join(APP, ...parts), "utf8");

describe("el plan de ingreso no toca la superficie pública", () => {
  it("vive en su propia colección", () => {
    expect(RevenuePlanSnapshotModel.collection.name).toBe("revenueplansnapshots");
    expect(SiteAnalyticsSnapshotModel.collection.name).not.toBe("revenueplansnapshots");
  });

  it("su ruta exige admin ANTES de leer nada y no se cachea", () => {
    const source = read("server", "api", "revenue-plan.get.ts");
    expect(source).toMatch(/requireAdmin\(event\)/);
    expect(source).toMatch(/'private, no-store'/);
    // Un requireAdmin sin await deja pasar todo: la promesa se descarta y el handler sigue.
    expect(source).toMatch(/await requireAdmin\(event\)[\s\S]*findOne/);
  });

  it("ninguna ruta pública sabe que el modelo existe", () => {
    const api = path.join(APP, "server", "api");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!name.endsWith(".ts")) continue;
        const source = fs.readFileSync(full, "utf8");
        if (!/RevenuePlanSnapshot|revenueplansnapshots/.test(source)) continue;
        if (!/await requireAdmin\(event\)/.test(source)) {
          offenders.push(path.relative(api, full).split(path.sep).join("/"));
        }
      }
    };
    walk(api);
    expect(offenders).toEqual([]);
  });

  it("sólo la página privada lo renderiza", () => {
    const pages = path.join(APP, "pages");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (name.endsWith(".vue") && fs.readFileSync(full, "utf8").includes("/api/revenue-plan")) {
          offenders.push(path.relative(pages, full).split(path.sep).join("/"));
        }
      }
    };
    walk(pages);
    expect(offenders).toEqual(["estadisticas-de-busqueda.vue"]);
  });

  it("la página privada sigue fuera del índice", () => {
    const source = read("pages", "estadisticas-de-busqueda.vue");
    expect(source).toMatch(/noindex, nofollow/);
    expect(source).toMatch(/middleware: 'auth'/);
  });
});
