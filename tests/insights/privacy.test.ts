// El tablero de uso es PRIVADO: mezcla tráfico por página de ocho fuentes. Este test es lo que nota el
// día que una ruta pública empiece a leerlo, que un campo de plata o de datos personales se cuele en
// los modelos o en los documentos, o que el buzón del sitio empiece a leer el texto de la gente.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { UsageInsightDayModel } from "../../classes/models/UsageInsightDay";
import { UsageInsightSnapshotModel } from "../../classes/models/UsageInsightSnapshot";
import { FEEDBACK_PIPELINES } from "../../classes/insights/sources/feedback";
import { cappedDay, cappedSnapshot, cappedState } from "./capped";

const ROOT = path.join(__dirname, "..", "..");
const APP = path.join(ROOT, "app");
const read = (...parts: string[]) => fs.readFileSync(path.join(APP, ...parts), "utf8");

/** Cualquier cosa que huela a plata (subcadena, como revenue_privacy.test.ts). */
const MONEY = /revenue|rpm|publisherAd|adClicks|adImpressions|adsense/i;
/** Datos personales: claves ENTERAS (un conteo llamado `written` o `distinctNo` no los es). */
const PII = /^(ip|ipAddress|userId|user_id|clientId|ids|email|message|messages|userAgent|ua|sessionId)$/i;
const MENTIONS = /UsageInsight(Snapshot|Day)|usageinsightsnapshots|usageinsightdays/;

function walk(dir: string, filter: (f: string) => boolean, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir)) {
    const f = path.join(dir, n);
    if (fs.statSync(f).isDirectory()) walk(f, filter, out);
    else if (filter(f)) out.push(f);
  }
  return out;
}

function keysDeep(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) for (const x of v) keysDeep(x, out);
  else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      out.add(k);
      keysDeep(x, out);
    }
  }
  return out;
}

describe("el tablero de uso es privado", () => {
  it("colecciones propias, ninguna la del snapshot público", () => {
    expect(UsageInsightSnapshotModel.collection.name).toBe("usageinsightsnapshots");
    expect(UsageInsightDayModel.collection.name).toBe("usageinsightdays");
    expect(UsageInsightSnapshotModel.collection.name).not.toBe("siteanalyticssnapshots");
    expect(UsageInsightDayModel.collection.name).not.toBe("siteanalyticssnapshots");
  });

  it("la ruta exige admin antes de leer, no se cachea y nunca devuelve el estado", () => {
    const src = read("server", "api", "usage-insights.get.ts");
    expect(src).toMatch(/await requireAdmin\(event\)[\s\S]*findOne/);
    expect(src).toMatch(/'private, no-store'/);
    expect(src).toMatch(/key: 'site'/);
    expect(src).toMatch(/state: 0/);
  });

  it("ningún archivo del servidor del app nombra estas colecciones sin requireAdmin", () => {
    const dirs = ["api", "routes", "tasks", "utils"].map((d) => path.join(APP, "server", d));
    const files = dirs.flatMap((d) => walk(d, (f) => f.endsWith(".ts")));
    expect(files.length).toBeGreaterThan(10);
    const offenders = files
      .filter((f) => MENTIONS.test(fs.readFileSync(f, "utf8")) && !/await requireAdmin\(event\)/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(APP, f).split(path.sep).join("/"));
    expect(offenders).toEqual([]);
  });

  it("sólo la página privada pide /api/usage-insights, con noindex y middleware de auth", () => {
    const pages = path.join(APP, "pages");
    const users = walk(pages, (f) => f.endsWith(".vue") && fs.readFileSync(f, "utf8").includes("/api/usage-insights")).map((f) =>
      path.relative(pages, f).split(path.sep).join("/")
    );
    expect(users).toEqual(["estadisticas-de-uso.vue"]);
    const page = read("pages", "estadisticas-de-uso.vue");
    expect(page).toMatch(/noindex, nofollow/);
    expect(page).toMatch(/middleware: 'auth'/);
    expect(page).not.toContain("/api/site-revenue");
  });

  it("ni plata ni datos personales en los modelos ni en los documentos", () => {
    for (const model of [UsageInsightSnapshotModel, UsageInsightDayModel]) {
      for (const k of Object.keys(model.schema.obj)) {
        expect(k).not.toMatch(MONEY);
        expect(k).not.toMatch(PII);
      }
    }
    for (const doc of [cappedSnapshot(), cappedDay(400), cappedState()]) {
      for (const k of keysDeep(doc)) {
        expect(k, k).not.toMatch(MONEY);
        expect(k, k).not.toMatch(PII);
      }
    }
  });

  it("el buzón proyecta lo justo y clientId sale del $group convertido en un conteo", () => {
    const from = new Date("2026-10-24T03:00:00Z");
    const to = new Date("2026-11-21T03:00:00Z");
    const byPath = FEEDBACK_PIPELINES.byPath(from, to);
    const byDay = FEEDBACK_PIPELINES.byDay(from, to);
    expect(byPath[1]).toEqual({ $project: { _id: 0, path: 1, kind: 1, helpful: 1, createdAt: 1, clientId: 1 } });
    expect(byDay[1]).toEqual({ $project: { _id: 0, kind: 1, helpful: 1, createdAt: 1 } });
    expect(Object.keys(byPath[byPath.length - 1].$project).sort()).toEqual(["_id", "distinct", "last", "n"]);
    const g = byPath.findIndex((s) => "$group" in s);
    // `ids` sólo entra a `$size` (el conteo): ninguna etapa posterior nombra `clientId` ni devuelve `ids`.
    for (const st of byPath.slice(g + 1)) {
      expect(JSON.stringify(st)).not.toMatch(/clientId/);
      expect(Object.keys(st.$project || {})).not.toContain("ids");
    }
  });

  it("el job no pide métricas de ingreso ni eventos de anuncios", () => {
    const files = walk(path.join(ROOT, "classes", "insights"), (f) => f.endsWith(".ts"));
    const offenders = files.filter((f) => /publisherAdRevenue|totalAdRevenue|totalRevenue/.test(fs.readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    // `ad_impression`/`ad_click` sólo pueden aparecer en la lista de lo prohibido.
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      const hits = src.match(/ad_impression|ad_click/g) || [];
      if (hits.length) expect(src).toMatch(/FORBIDDEN_EVENTS = \["ad_impression", "ad_click"\]/);
    }
  });
});
