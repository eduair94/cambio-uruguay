// La plata no se publica.
//
// `/estadisticas-del-sitio` es una página pública y su endpoint devuelve el documento de analytics
// entero. Si algún día alguien agrega un campo de ingreso a ESE documento, el sitio empieza a
// publicar cuánto factura sin que nadie escriba una línea de HTML. Por eso el ingreso vive en otra
// colección, detrás de otra ruta, con `requireAdmin` — y por eso existe este test, que es lo único
// que va a notar el día que las dos cosas se junten.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { SiteAnalyticsSnapshotModel } from "../../classes/models/SiteAnalyticsSnapshot";
import { SiteRevenueSnapshotModel } from "../../classes/models/SiteRevenueSnapshot";
import { revenueIsEmpty } from "../../classes/site-analytics/revenue";
import type { RevenueSnapshot } from "../../classes/site-analytics/revenue";

const APP = path.join(__dirname, "..", "..", "app");
const read = (...parts: string[]) => fs.readFileSync(path.join(APP, ...parts), "utf8");

/** Cualquier cosa que huela a plata. */
const MONEY = /revenue|rpm|publisherAd|adClicks|adImpressions|adsense/i;

describe("el ingreso no toca la superficie pública", () => {
  it("el snapshot público no declara ni un campo de plata", () => {
    for (const field of Object.keys(SiteAnalyticsSnapshotModel.schema.obj)) {
      expect(field).not.toMatch(MONEY);
    }
  });

  it("las dos colecciones son distintas", () => {
    expect(SiteAnalyticsSnapshotModel.collection.name).toBe("siteanalyticssnapshots");
    expect(SiteRevenueSnapshotModel.collection.name).toBe("siterevenuesnapshots");
  });

  it("la ruta pública no sabe que el modelo de ingresos existe", () => {
    const source = read("server", "api", "site-analytics.get.ts");
    expect(source).not.toMatch(/SiteRevenue/);
    expect(source).not.toMatch(MONEY);
  });

  it("la ruta de ingresos exige admin y no se cachea", () => {
    const source = read("server", "api", "site-revenue.get.ts");
    expect(source).toMatch(/requireAdmin\(event\)/);
    expect(source).toMatch(/'private, no-store'/);
    // El await tiene que estar ANTES de leer nada: un requireAdmin sin await deja pasar todo.
    expect(source).toMatch(/await requireAdmin\(event\)[\s\S]*findOne/);
  });

  it("la lista de admins falla cerrada", () => {
    const source = read("server", "utils", "requireAdmin.ts");
    expect(source).toMatch(/statusCode: 503/);
    expect(source).toMatch(/useRuntimeConfig\(\)\.adminEmails/);
  });

  it("ninguna página renderiza el snapshot de ingresos salvo la privada", () => {
    const pages = path.join(APP, "pages");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (name.endsWith(".vue") && fs.readFileSync(full, "utf8").includes("/api/site-revenue")) {
          offenders.push(path.relative(pages, full).split(path.sep).join("/"));
        }
      }
    };
    walk(pages);
    expect(offenders).toEqual(["estadisticas-de-busqueda.vue"]);
  });
});

describe("revenueIsEmpty", () => {
  const snap = (adRevenue: number, adImpressions: number): RevenueSnapshot =>
    ({
      totals: { adRevenue, adImpressions, adClicks: 0, screenPageViews: 100, sessions: 50, rpm: 0 },
    } as RevenueSnapshot);

  it("un día sin una sola impresión de anuncio es 'todavía no', no un día sin plata", () => {
    // El enlace AdSense↔GA4 tarda hasta 24 h en devolver datos y mientras tanto contesta ceros.
    expect(revenueIsEmpty(snap(0, 0))).toBe(true);
  });

  it("con impresiones pero sin ingreso NO está vacío — eso es un día malo de verdad", () => {
    expect(revenueIsEmpty(snap(0, 1200))).toBe(false);
  });

  it("con plata no está vacío", () => {
    expect(revenueIsEmpty(snap(1.23, 900))).toBe(false);
  });
});
