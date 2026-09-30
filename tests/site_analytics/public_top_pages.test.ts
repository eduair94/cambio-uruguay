import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { baseOf, signalsOf, trendOf } from "../../classes/site-analytics/pageRanking";
import type { FamilyRankRow, PageRankingSnapshot, PageRankRow } from "../../classes/site-analytics/pageRanking";
import {
  buildPublicTopPages,
  isPublicListable,
  PUBLIC_AI,
  PUBLIC_EXCLUDED_PATHS,
  PUBLIC_PAGES,
  PUBLIC_RISING,
  publicTopPagesIsThin,
} from "../../classes/site-analytics/publicTopPages";

const noEntrances = { total: 0, organic: 0, direct: 0, social: 0, ai: 0, other: 0 };

function row(pathName: string, weeks: number[], over: Partial<PageRankRow> = {}): PageRankRow {
  const base = baseOf(weeks);
  const partial = {
    path: pathName,
    title: `${pathName} | Cambio Uruguay`,
    family: pathName,
    tier: "contenido",
    multiplier: 8,
    weeks,
    views: weeks.reduce((a, b) => a + b, 0),
    base,
    users: 10,
    engagementSeconds: 60,
    viewsAll: 999,
    uyShare: 0.4,
    entrances: { ...noEntrances },
    engagedRate: 0.7,
    trend: trendOf(weeks),
    value: base * 8,
    ...over,
  };
  return { ...partial, rank: 0, signals: signalsOf(partial) };
}

function family(name: string, weeks: number[]): FamilyRankRow {
  const base = baseOf(weeks);
  return {
    family: name,
    tier: "directorio",
    multiplier: 0.2,
    urls: 3,
    views: weeks.reduce((a, b) => a + b, 0),
    base,
    weeks,
    engagementSeconds: 40,
    entrances: { ...noEntrances, total: 5, organic: 5 },
    trend: trendOf(weeks),
    value: base * 0.2,
    share: 0.1,
  };
}

function ranking(pages: PageRankRow[], families: FamilyRankRow[] = []): PageRankingSnapshot {
  const sorted = [...pages].sort((a, b) => b.base - a.base || a.path.localeCompare(b.path));
  sorted.forEach((p, i) => (p.rank = i + 1));
  return {
    key: "site",
    asOf: "2026-09-29T23:57:35.529Z",
    timezone: "America/Los_Angeles",
    range: { start: "2026-09-01", end: "2026-09-28", days: 28 },
    weeks: [
      { start: "2026-09-01", end: "2026-09-07" },
      { start: "2026-09-08", end: "2026-09-14" },
      { start: "2026-09-15", end: "2026-09-21" },
      { start: "2026-09-22", end: "2026-09-28" },
    ],
    totals: {
      viewsUy: 10236,
      viewsAll: 37489,
      uyShare: 0.27,
      sessionsUy: 5194,
      usersUy: 5082,
      weeklyUy: [2388, 2600, 2937, 2311],
      channels: [{ label: "Organic Search", sessions: 2867, share: 0.55 }],
      weeklyChannels: [{ label: "Organic Search", weeks: [548, 641, 784, 896] }],
      weeklyDevices: [{ label: "mobile", weeks: [529, 599, 750, 800] }],
    },
    pageCount: 1409,
    truncated: false,
    pages: sorted,
    families,
    focus: [{ kind: "caen", path: "/x", title: "X", headline: "secreto", detail: "secreto" }],
  };
}

const many = (n: number) => Array.from({ length: n }, (_, i) => row(`/p${i}`, [50 + i, 50 + i, 50 + i, 50 + i]));

describe("isPublicListable", () => {
  it("sólo páginas públicas, en español y que no son fichas sueltas", () => {
    expect(isPublicListable("/")).toBe(true);
    expect(isPublicListable("/alquileres-uruguay")).toBe(true);
    expect(isPublicListable("/guias/hacer-un-testamento-uruguay")).toBe(true); // familia plegada
    expect(isPublicListable("/historico/brou/usd")).toBe(true);
    expect(isPublicListable("/estadisticas-por-pagina")).toBe(false); // privada
    expect(isPublicListable("/cuenta")).toBe(false);
    expect(isPublicListable("/buscar")).toBe(false);
    expect(isPublicListable("/en")).toBe(false); // espejo
    expect(isPublicListable("/en/celulares-uruguay")).toBe(false);
    expect(isPublicListable("/pt/autos-usados-uruguay/precios/chevrolet-onix")).toBe(false);
    expect(isPublicListable("/alquileres/montevideo-cordon-1tts26l")).toBe(false); // ficha suelta
    expect(isPublicListable("/autos-usados-uruguay/precios/chevrolet-onix")).toBe(false);
    expect(isPublicListable("/api/rentals")).toBe(false);
  });

  it("toda ruta privada del app está excluida también acá", () => {
    // Paridad con `EXCLUDED_ROUTES` (app/utils/siteNav.ts): una página que se sale de la navegación
    // y del SEO no puede aparecer recomendada en una lista pública del mismo sitio.
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "app", "utils", "siteNav.ts"), "utf8");
    const block = /export const EXCLUDED_ROUTES[^=]*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(src)?.[1] ?? "";
    // Sin comentarios primero: traen apóstrofos ("owner's") que parecen comillas.
    const code = block.replace(/\/\/.*$/gm, "");
    const routes = [...code.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(3);
    for (const route of routes) {
      expect(PUBLIC_EXCLUDED_PATHS, route).toContain(route);
      expect(isPublicListable(route), route).toBe(false);
    }
  });
});

describe("buildPublicTopPages", () => {
  const pages = [
    row("/", [382, 415, 247, 232], { entrances: { ...noEntrances, total: 50, ai: 8 } }),
    row("/estadisticas-por-pagina", [300, 300, 300, 300]),
    row("/en", [40, 59, 63, 43]),
    row("/alquileres/ficha-1", [0, 33, 0, 0]),
    row("/guias/casarse-por-civil-uruguay", [0, 0, 8, 19], { entrances: { ...noEntrances, total: 20, ai: 1 } }),
    row("/autos-usados-uruguay", [0, 0, 154, 89], { tier: "directorio" }),
    row("/mercado-it-uruguay", [0, 0, 95, 4]), // lanzamiento que se apagó: no está "en alza"
    row("/tarjetas-de-debito-uruguay", [5, 9, 5, 33], { entrances: { ...noEntrances, total: 25, ai: 3 } }),
    row("/en/celulares-uruguay", [0, 0, 7, 15], { entrances: { ...noEntrances, total: 20, ai: 20 } }),
  ];
  const families = [
    family("/historico/*", [200, 220, 230, 210]),
    family("/en/alquileres/*", [900, 900, 900, 900]),
    family("/estadisticas-por-pagina", [300, 300, 300, 300]),
  ];
  const doc = buildPublicTopPages(ranking(pages, families));

  it("lista sólo lo publicable y renumera el puesto", () => {
    expect(doc.pages.map((p) => p.path)).toEqual([
      "/",
      "/autos-usados-uruguay",
      "/guias/casarse-por-civil-uruguay",
      "/tarjetas-de-debito-uruguay",
      "/mercado-it-uruguay",
    ]);
    expect(doc.pages.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5]);
    const home = doc.pages[0];
    expect(home).toEqual({
      path: "/",
      title: "/ | Cambio Uruguay",
      rank: 1,
      weeks: [382, 415, 247, 232],
      views: 1276,
      base: 314.5,
      users: 10,
      engagementSeconds: 60,
      trend: trendOf([382, 415, 247, 232]),
      isNew: false,
      isPeak: false,
    });
    expect(doc.pages.find((p) => p.path === "/mercado-it-uruguay")).toMatchObject({ isNew: true, isPeak: true });
  });

  it("en alza: crece o nueva, sin picos, por vistas ganadas por semana", () => {
    expect(doc.rising.map((r) => r.path)).toEqual([
      "/autos-usados-uruguay",
      "/guias/casarse-por-civil-uruguay",
      "/tarjetas-de-debito-uruguay",
    ]);
    expect(doc.rising[0]).toMatchObject({ before: null, after: 121.5 });
    expect(doc.rising[1]).toMatchObject({ before: null, after: 13.5 });
    expect(doc.rising[2]).toMatchObject({ before: 7, after: 19 });
  });

  it("recomendadas por IA: tres entradas o más, sin espejos", () => {
    expect(doc.aiCited.map((r) => [r.path, r.aiEntrances])).toEqual([
      ["/", 8],
      ["/tarjetas-de-debito-uruguay", 3],
    ]);
  });

  it("temas sin espejos ni privadas", () => {
    expect(doc.topics.map((t) => t.family)).toEqual(["/historico/*"]);
    expect(doc.topics[0]).toEqual({
      family: "/historico/*",
      urls: 3,
      views: 860,
      base: 215,
      share: 0.1,
      weeks: [200, 220, 230, 210],
      trend: trendOf([200, 220, 230, 210]),
    });
  });

  it("los totales públicos no dicen cuánto es de afuera", () => {
    expect(doc.totals).toEqual({
      viewsUy: 10236,
      sessionsUy: 5194,
      usersUy: 5082,
      pageCount: 1409,
      weeklyUy: [2388, 2600, 2937, 2311],
      channels: [{ label: "Organic Search", sessions: 2867, share: 0.55 }],
      weeklyChannels: [{ label: "Organic Search", weeks: [548, 641, 784, 896] }],
      weeklyDevices: [{ label: "mobile", weeks: [529, 599, 750, 800] }],
    });
  });

  it("ninguna clave privada sale en el documento público", () => {
    const FORBIDDEN = [
      "tier",
      "multiplier",
      "value",
      "focus",
      "uyShare",
      "viewsAll",
      "entrances",
      "engagedRate",
      "signals",
      "truncated",
    ];
    const keys = new Set<string>();
    const walk = (x: unknown) => {
      if (Array.isArray(x)) x.forEach(walk);
      else if (x && typeof x === "object") {
        for (const [k, v] of Object.entries(x)) {
          keys.add(k);
          walk(v);
        }
      }
    };
    walk(doc);
    for (const k of FORBIDDEN) expect(keys.has(k), k).toBe(false);
    expect(JSON.stringify(doc)).not.toContain("secreto");
  });

  it(`como mucho ${PUBLIC_PAGES} páginas, ${PUBLIC_RISING} en alza y ${PUBLIC_AI} de IA`, () => {
    const big = buildPublicTopPages(ranking(many(PUBLIC_PAGES + 30)));
    expect(big.pages).toHaveLength(PUBLIC_PAGES);
    expect(big.pages[0].path).toBe(`/p${PUBLIC_PAGES + 29}`);
  });

  it("flaco con menos de diez páginas publicables o sin vistas", () => {
    expect(publicTopPagesIsThin(doc)).toBe(true); // 5 páginas
    expect(publicTopPagesIsThin(buildPublicTopPages(ranking(many(12))))).toBe(false);
    const empty = ranking(many(12));
    empty.totals.viewsUy = 0;
    expect(publicTopPagesIsThin(buildPublicTopPages(empty))).toBe(true);
  });
});
