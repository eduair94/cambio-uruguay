import { describe, expect, it } from "vitest";
import { isExcluded, normalisePath, selectTargets, tierOf } from "../../classes/rag/sources";

describe("rag/sources — normalisePath", () => {
  it("strips the origin and the trailing slash, keeps the root", () => {
    expect(normalisePath("https://cambio-uruguay.com/guias/")).toBe("/guias");
    expect(normalisePath("/guias")).toBe("/guias");
    expect(normalisePath("https://cambio-uruguay.com/")).toBe("/");
    expect(normalisePath("guias/importar")).toBe("/guias/importar");
  });
});

describe("rag/sources — exclusions", () => {
  it("drops the locale mirrors", () => {
    // The bot answers Spanish subreddits; an English page is never the right link for r/uruguay.
    expect(isExcluded("/en/importar")).toBe(true);
    expect(isExcluded("/pt/")).toBe(true);
    expect(isExcluded("/en")).toBe(true);
    expect(isExcluded("/entrar-en-clearing")).toBe(false); // not a locale, just starts with "en"
  });

  it("drops the machine-written dated archives", () => {
    expect(isExcluded("/blog/2026-08-17-dolar")).toBe(true);
    expect(isExcluded("/newsletter/2026-08-17")).toBe(true);
  });

  it("keeps the editorial pages", () => {
    expect(isExcluded("/importar-para-revender-uruguay")).toBe(false);
    expect(isExcluded("/guias/alquilar")).toBe(false);
  });
});

describe("rag/sources — tiers", () => {
  it("marks the programmatic families as stubs", () => {
    expect(tierOf("/sucursal/brou-centro")).toBe("stub");
    expect(tierOf("/casa/brou/comprar-dolares")).toBe("stub");
    expect(tierOf("/comparativas/usd-brou-vs-itau")).toBe("stub");
    expect(tierOf("/historico/bcu")).toBe("stub");
  });

  it("indexes everything else in full", () => {
    expect(tierOf("/importar-para-revender-uruguay")).toBe("full");
    expect(tierOf("/herramientas/costo-de-vida")).toBe("full");
    expect(tierOf("/glosario/arbitraje")).toBe("full");
  });
});

describe("rag/sources — selectTargets", () => {
  it("dedupes by path and prefers the newer lastmod", () => {
    const targets = selectTargets([
      { loc: "/guias", lastmod: "2026-01-01" },
      { loc: "/guias/", lastmod: "2026-08-01" },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.lastmod).toBe("2026-08-01");
  });

  it("puts the full-text pages first, so a run that dies halfway indexed what matters", () => {
    const targets = selectTargets([
      { loc: "/sucursal/a" },
      { loc: "/importar-para-revender-uruguay" },
      { loc: "/sucursal/b" },
      { loc: "/glosario/tea" },
    ]);
    expect(targets.map((t) => t.tier)).toEqual(["full", "full", "stub", "stub"]);
  });

  it("skips entries with no loc rather than indexing the origin root", () => {
    expect(selectTargets([{ loc: "" }, { loc: "/x" }])).toHaveLength(1);
  });
});
