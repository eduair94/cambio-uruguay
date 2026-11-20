import { describe, expect, it } from "vitest";
import { bucketOf } from "../../classes/gsc/opportunities";
import { dayBoundsUtc, foldToTemplates, insightFamily, LOCALE_PREFIXES, sitePath, stripLocale } from "../../classes/insights/paths";

describe("sitePath", () => {
  it("saca query, fragmento y barra final", () => {
    expect(sitePath("/buscar?q=algo#x")).toBe("/buscar");
    expect(sitePath("https://cambio-uruguay.com/alquileres-uruguay/?barrio=pocitos")).toBe("/alquileres-uruguay");
    expect(sitePath("https://www.cambio-uruguay.com/")).toBe("/");
  });

  it("descarta otro host y lo que no es una ruta", () => {
    expect(sitePath("http://localhost:3000/dolar")).toBeNull();
    expect(sitePath("https://example.com/x")).toBeNull();
    expect(sitePath("(not set)")).toBeNull();
    expect(sitePath("")).toBeNull();
  });
});

describe("stripLocale", () => {
  it("cubre todos los prefijos", () => {
    for (const code of LOCALE_PREFIXES) {
      expect(stripLocale(`/${code}/guias/x`)).toEqual({ path: "/guias/x", locale: code });
      expect(stripLocale(`/${code}`)).toEqual({ path: "/", locale: code });
    }
    expect(stripLocale("/guias/x")).toEqual({ path: "/guias/x", locale: null });
    // una palabra que empieza como un código no es un prefijo
    expect(stripLocale("/english-page").locale).toBeNull();
  });
});

describe("insightFamily", () => {
  it("no cambia las familias de bucketOf", () => {
    for (const p of ["/", "/guias/a", "/dolar-hoy", "/sucursal/x", "/herramientas"]) expect(insightFamily(p)).toBe(bucketOf(p));
  });

  it("pliega rutas de varios segmentos y saca el idioma", () => {
    expect(insightFamily("/alquileres/abc")).toBe("/alquileres/*");
    expect(insightFamily("/alquileres-uruguay/montevideo/pocitos")).toBe("/alquileres-uruguay/*");
    expect(insightFamily("/fr/guias/x")).toBe("/guias/*");
    expect(insightFamily("/en/dolar-hoy")).toBe("/dolar-hoy");
  });
});

describe("foldToTemplates", () => {
  it("pliega la dinámica y deja la hermana estática con eventos propios", () => {
    const real = [
      { path: "/alquileres/abc", views: 10 },
      { path: "/alquileres/def", views: 5 },
      { path: "/alquileres/mapa", views: 7 },
      { path: "/otra", views: 3 },
    ];
    const fold = foldToTemplates(real, ["/alquileres/:item", "/alquileres/mapa", "/otra"]);
    expect(fold.assignment.get("/alquileres/abc")).toBe("/alquileres/:item");
    expect(fold.assignment.get("/alquileres/def")).toBe("/alquileres/:item");
    expect(fold.assignment.has("/alquileres/mapa")).toBe(false);
    expect(fold.templates.get("/alquileres/:item")).toEqual({ views: 15, realPaths: 2 });
  });
});

describe("dayBoundsUtc", () => {
  it("un día de Montevideo empieza a las 03:00Z", () => {
    expect(dayBoundsUtc("2026-11-20")).toEqual({ geq: "2026-11-20T03:00:00Z", lt: "2026-11-21T03:00:00Z" });
  });
});
