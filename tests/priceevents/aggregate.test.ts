import { describe, expect, it } from "vitest";
import { buildPriceEventSnapshot } from "../../classes/priceevents/aggregate";
import type { PriceEventAnalysis, PriceEventClass } from "../../classes/priceevents/types";
import type { PriceEvent } from "../../classes/priceevents/calendar";

const TODAY = "2026-11-27";

function analysis(overrides: Partial<PriceEventAnalysis> & { classes: PriceEventClass[] }): PriceEventAnalysis {
  return {
    listingId: "ml:1",
    vertical: "equipar",
    category: "heladeras",
    productKey: "ml:1",
    sellerKey: "seller-1",
    sellerName: "Tienda Uno",
    title: "Heladera",
    url: "https://example.com/1",
    currency: "UYU",
    price: 9000,
    listPrice: null,
    priorMin: 10000,
    priorMax: 10000,
    priorMedian: 10000,
    priorPoints: 15,
    dropPct: null,
    ...overrides,
  };
}

const EVENT: PriceEvent = {
  id: "black-friday-2026",
  label: "Black Friday 2026",
  start: "2026-11-27",
  end: "2026-11-30",
  confirmed: true,
  source: null,
  note: "",
};

describe("buildPriceEventSnapshot", () => {
  it("counts analyzed (including nulls) separately from eligible (non-null only)", () => {
    const snapshot = buildPriceEventSnapshot([null, null, analysis({ classes: ["precio-de-siempre"] })], TODAY, null, null);
    expect(snapshot.analyzed).toBe(3);
    expect(snapshot.eligible).toBe(1);
  });

  it("carries the day, key, event and trackingSince straight through", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, EVENT, "2026-09-16");
    expect(snapshot.day).toBe(TODAY);
    expect(snapshot.key).toBe(`day:${TODAY}`);
    expect(snapshot.event).toEqual(EVENT);
    expect(snapshot.trackingSince).toBe("2026-09-16");
  });

  it("reports null event and null trackingSince as-is (no event active / history not started)", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, null, null);
    expect(snapshot.event).toBeNull();
    expect(snapshot.trackingSince).toBeNull();
  });

  it("aggregates byVertical: eligible/drops/inflated counted independently per vertical", () => {
    const analyses = [
      analysis({ vertical: "equipar", classes: ["baja-real"], dropPct: 12 }),
      analysis({ vertical: "equipar", classes: ["precio-de-siempre"] }),
      analysis({ vertical: "sillas", classes: ["tachado-por-encima"], listPrice: 15000 }),
      analysis({ vertical: "sillas", classes: ["baja-real", "tachado-por-encima"], dropPct: 20, listPrice: 15000 }),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.byVertical).toEqual({
      equipar: { eligible: 2, drops: 1, inflated: 0 },
      sillas: { eligible: 2, drops: 1, inflated: 2 },
    });
  });

  describe("dropsCount/inflatedCount: full-day totals, independent of the topDrops showcase cap", () => {
    it("counts every baja-real/tachado-por-encima offer, not just the ones that make the showcase", () => {
      const analyses = Array.from({ length: 250 }, (_, i) =>
        analysis({ listingId: `ml:${i}`, sellerKey: `seller-${i}`, classes: ["baja-real"], dropPct: i })
      );
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.topDrops).toHaveLength(200);
      expect(snapshot.dropsCount).toBe(250);
    });

    it("sums inflatedCount across every seller, including sellers below the 5-listing sellers-table floor", () => {
      const analyses = [
        analysis({ listingId: "1", sellerKey: "tiny", listPrice: 10000, classes: ["tachado-por-encima"] }),
        analysis({ listingId: "2", sellerKey: "tiny", listPrice: 10000, classes: ["tachado-por-encima"] }),
        ...Array.from({ length: 5 }, (_, i) =>
          analysis({ listingId: `many:${i}`, sellerKey: "many", listPrice: 10000, classes: ["tachado-por-encima"] })
        ),
      ];
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      // "tiny" never appears in `sellers` (only 2 listings, below the floor of 5), but its 2 inflated
      // offers still count towards the day's total — the scalar is not derived from the sellers table.
      expect(snapshot.sellers.map((s) => s.sellerKey)).toEqual(["many"]);
      expect(snapshot.inflatedCount).toBe(7);
    });

    it("matches the sum of byVertical drops/inflated", () => {
      const analyses = [
        analysis({ vertical: "equipar", classes: ["baja-real"], dropPct: 12 }),
        analysis({ vertical: "sillas", classes: ["baja-real", "tachado-por-encima"], dropPct: 20, listPrice: 15000 }),
        analysis({ vertical: "sillas", classes: ["tachado-por-encima"], listPrice: 15000 }),
      ];
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      const vertTotals = Object.values(snapshot.byVertical).reduce(
        (acc, v) => ({ drops: acc.drops + v.drops, inflated: acc.inflated + v.inflated }),
        { drops: 0, inflated: 0 }
      );
      expect(snapshot.dropsCount).toBe(vertTotals.drops);
      expect(snapshot.inflatedCount).toBe(vertTotals.inflated);
    });
  });

  describe("topDrops ordering: deterministic regardless of input/cursor order", () => {
    it("sorts by dropPct descending", () => {
      const analyses = [
        analysis({ sellerKey: "s1", classes: ["baja-real"], dropPct: 11 }),
        analysis({ sellerKey: "s2", classes: ["baja-real"], dropPct: 40 }),
        analysis({ sellerKey: "s3", classes: ["baja-real"], dropPct: 25 }),
      ];
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.topDrops.map((d) => d.dropPct)).toEqual([40, 25, 11]);
    });

    it("breaks a dropPct tie with the unrounded price/priorMin ratio (the bigger real drop wins)", () => {
      // Both round to dropPct 10, but b's actual ratio (0.899) is a bigger drop than a's (0.9005).
      const a = analysis({ listingId: "a", sellerKey: "s1", price: 9005, priorMin: 10000, classes: ["baja-real"], dropPct: 10 });
      const b = analysis({ listingId: "b", sellerKey: "s2", price: 8990, priorMin: 10000, classes: ["baja-real"], dropPct: 10 });
      const snapshot = buildPriceEventSnapshot([a, b], TODAY, null, null);
      expect(snapshot.topDrops.map((d) => d.listingId)).toEqual(["b", "a"]);
    });

    it("breaks a full tie (same dropPct AND same ratio) with listingId ascending", () => {
      const a = analysis({ listingId: "zeta", sellerKey: "s1", price: 9000, priorMin: 10000, classes: ["baja-real"], dropPct: 10 });
      const b = analysis({ listingId: "alfa", sellerKey: "s2", price: 9000, priorMin: 10000, classes: ["baja-real"], dropPct: 10 });
      const snapshot = buildPriceEventSnapshot([a, b], TODAY, null, null);
      expect(snapshot.topDrops.map((d) => d.listingId)).toEqual(["alfa", "zeta"]);
    });

    it("produces the identical topDrops array for the same analyses given in a different input order", () => {
      // A deliberately tie-heavy set: several pairs share the same rounded dropPct, some of those
      // also share the same exact ratio, forcing all three sort keys into play.
      const pool: PriceEventAnalysis[] = [
        analysis({ listingId: "l01", sellerKey: "s1", price: 9000, priorMin: 10000, classes: ["baja-real"], dropPct: 10 }),
        analysis({ listingId: "l02", sellerKey: "s2", price: 9000, priorMin: 10000, classes: ["baja-real"], dropPct: 10 }),
        analysis({ listingId: "l03", sellerKey: "s3", price: 9005, priorMin: 10000, classes: ["baja-real"], dropPct: 10 }),
        analysis({ listingId: "l04", sellerKey: "s4", price: 8990, priorMin: 10000, classes: ["baja-real"], dropPct: 10 }),
        analysis({ listingId: "l05", sellerKey: "s5", price: 8900, priorMin: 10000, classes: ["baja-real"], dropPct: 11 }),
        analysis({ listingId: "l06", sellerKey: "s6", price: 7500, priorMin: 10000, classes: ["baja-real"], dropPct: 25 }),
        analysis({ listingId: "l07", sellerKey: "s7", price: 6000, priorMin: 10000, classes: ["baja-real"], dropPct: 40 }),
        analysis({ listingId: "l08", sellerKey: "s8", price: 9100, priorMin: 10000, classes: ["baja-real"], dropPct: 9 }),
      ];
      const forward = buildPriceEventSnapshot(pool, TODAY, null, null);
      const shuffled = buildPriceEventSnapshot([...pool].reverse(), TODAY, null, null);
      const reordered = buildPriceEventSnapshot(
        [pool[3]!, pool[0]!, pool[7]!, pool[6]!, pool[1]!, pool[5]!, pool[2]!, pool[4]!],
        TODAY,
        null,
        null
      );
      expect(shuffled.topDrops.map((d) => d.listingId)).toEqual(forward.topDrops.map((d) => d.listingId));
      expect(reordered.topDrops.map((d) => d.listingId)).toEqual(forward.topDrops.map((d) => d.listingId));
    });
  });

  it("never lists more than 3 drops from the same seller", () => {
    const analyses = [10, 20, 30, 40, 50].map((dropPct, i) =>
      analysis({ listingId: `ml:${i}`, sellerKey: "same-seller", classes: ["baja-real"], dropPct })
    );
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.topDrops).toHaveLength(3);
    // Keeps this seller's BEST three (highest dropPct), not the first three encountered.
    expect(snapshot.topDrops.map((d) => d.dropPct)).toEqual([50, 40, 30]);
  });

  it("keeps a seller's cap independent of another seller's own drops", () => {
    const analyses = [
      ...[10, 20, 30, 40].map((dropPct, i) => analysis({ listingId: `a:${i}`, sellerKey: "seller-a", classes: ["baja-real"], dropPct })),
      analysis({ listingId: "b:0", sellerKey: "seller-b", classes: ["baja-real"], dropPct: 15 }),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    // seller-a contributes at most 3 (its top three: 40, 30, 20), seller-b contributes its own 1.
    expect(snapshot.topDrops.filter((d) => d.sellerKey === "seller-a")).toHaveLength(3);
    expect(snapshot.topDrops.filter((d) => d.sellerKey === "seller-b")).toHaveLength(1);
  });

  it("caps the topDrops showcase at 200 overall", () => {
    const analyses = Array.from({ length: 250 }, (_, i) =>
      analysis({ listingId: `ml:${i}`, sellerKey: `seller-${i}`, classes: ["baja-real"], dropPct: i })
    );
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.topDrops).toHaveLength(200);
    // The 200 kept are the biggest drops (249 down to 50), the smallest 50 are cut.
    expect(snapshot.topDrops[0]!.dropPct).toBe(249);
    expect(snapshot.topDrops[snapshot.topDrops.length - 1]!.dropPct).toBe(50);
  });

  it("excludes sellers with fewer than 5 offers carrying a visible list price", () => {
    const analyses = [
      ...[1, 2, 3, 4].map((i) => analysis({ listingId: `ml:${i}`, sellerKey: "few", listPrice: 10000, classes: ["precio-de-siempre"] })),
      ...[1, 2, 3, 4, 5].map((i) => analysis({ listingId: `ml:many-${i}`, sellerKey: "many", listPrice: 10000, classes: ["precio-de-siempre"] })),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.sellers.map((s) => s.sellerKey)).toEqual(["many"]);
  });

  it("does not count offers without a visible list price towards withListPrice", () => {
    const analyses = [
      ...Array.from({ length: 5 }, (_, i) => analysis({ listingId: `ml:${i}`, sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] })),
      ...Array.from({ length: 10 }, (_, i) => analysis({ listingId: `ml:no-lp-${i}`, sellerKey: "s1", listPrice: null, classes: ["precio-de-siempre"] })),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.sellers).toHaveLength(1);
    expect(snapshot.sellers[0]!.withListPrice).toBe(5);
  });

  it("computes share as inflated/withListPrice, a percentage rounded to 1 decimal", () => {
    const analyses = [
      analysis({ listingId: "1", sellerKey: "s1", listPrice: 10000, classes: ["tachado-por-encima"] }),
      analysis({ listingId: "2", sellerKey: "s1", listPrice: 10000, classes: ["tachado-por-encima"] }),
      analysis({ listingId: "3", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
      analysis({ listingId: "4", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
      analysis({ listingId: "5", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
      analysis({ listingId: "6", sellerKey: "s1", listPrice: 10000, classes: ["precio-de-siempre"] }),
    ];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    // 2 inflated out of 6 with a list price = 33.333...% -> 33.3
    expect(snapshot.sellers[0]!.inflated).toBe(2);
    expect(snapshot.sellers[0]!.withListPrice).toBe(6);
    expect(snapshot.sellers[0]!.share).toBe(33.3);
  });

  it("sorts sellers alphabetically by name, regardless of input order", () => {
    const seller = (key: string, name: string) =>
      Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `${key}:${i}`, sellerKey: key, sellerName: name, listPrice: 10000, classes: ["precio-de-siempre"] })
      );
    const analyses = [...seller("z", "Zeta"), ...seller("a", "Alfa"), ...seller("m", "Medio")];
    const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
    expect(snapshot.sellers.map((s) => s.sellerName)).toEqual(["Alfa", "Medio", "Zeta"]);
  });

  it("returns empty topDrops/sellers/byVertical and zero totals for an empty day, without throwing", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, null, null);
    expect(snapshot.topDrops).toEqual([]);
    expect(snapshot.sellers).toEqual([]);
    expect(snapshot.byVertical).toEqual({});
    expect(snapshot.analyzed).toBe(0);
    expect(snapshot.eligible).toBe(0);
    expect(snapshot.dropsCount).toBe(0);
    expect(snapshot.inflatedCount).toBe(0);
  });

  it("defaults bySource to {} and suspect to 0 when the caller passes no `extra`", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, null, null);
    expect(snapshot.bySource).toEqual({});
    expect(snapshot.suspect).toBe(0);
  });

  it("carries bySource and suspect straight through from `extra`", () => {
    const snapshot = buildPriceEventSnapshot([], TODAY, null, null, {
      bySource: { mercadolibre: 12, fenicio: 3 },
      suspect: 2,
    });
    expect(snapshot.bySource).toEqual({ mercadolibre: 12, fenicio: 3 });
    expect(snapshot.suspect).toBe(2);
  });

  // -------------------------------------------------------------------------------------------
  // C1 (final review): "Mercado Libre" is a marketplace, not a store — a listing with no seller id
  // AND no name gets sellerKey `ml:unknown`, and a listing with an id but no name still gets the
  // literal fallback sellerName "Mercado Libre" (see `classes/retail/sources/mercadolibre.ts`).
  // Neither should be listed as if it were one named store.
  // -------------------------------------------------------------------------------------------
  describe("C1: an unidentified MercadoLibre seller is never a 'store'", () => {
    it("excludes ml:unknown entirely from the sellers table, even past the 5-listing floor", () => {
      const analyses = Array.from({ length: 8 }, (_, i) =>
        analysis({
          listingId: `ml:${i}`,
          sellerKey: "ml:unknown",
          sellerName: "Mercado Libre",
          listPrice: 10000,
          classes: ["tachado-por-encima"],
        })
      );
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.sellers).toEqual([]);
      // The day's real total is untouched by the exclusion — only the sellers TABLE drops them.
      expect(snapshot.inflatedCount).toBe(8);
    });

    it("also excludes a numeric ml:<id> seller whose name is the bare 'Mercado Libre' fallback", () => {
      const analyses = Array.from({ length: 6 }, (_, i) =>
        analysis({
          listingId: `ml:${i}`,
          sellerKey: "ml:555",
          sellerName: "Mercado Libre",
          listPrice: 10000,
          classes: ["tachado-por-encima"],
        })
      );
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.sellers).toEqual([]);
    });

    it("still lists a NAMED MercadoLibre seller normally (only the literal fallback name is excluded)", () => {
      const analyses = Array.from({ length: 6 }, (_, i) =>
        analysis({
          listingId: `ml:${i}`,
          sellerKey: "ml:n:tienda-real",
          sellerName: "Tienda Real",
          listPrice: 10000,
          classes: ["tachado-por-encima"],
        })
      );
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.sellers.map((s) => s.sellerKey)).toEqual(["ml:n:tienda-real"]);
    });

    it("relabels ml:unknown drops in topDrops as 'Vendedor sin identificar (Mercado Libre)'", () => {
      const analyses = [
        analysis({ listingId: "ml:1", sellerKey: "ml:unknown", sellerName: "Mercado Libre", classes: ["baja-real"], dropPct: 20 }),
      ];
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.topDrops[0]!.sellerName).toBe("Vendedor sin identificar (Mercado Libre)");
      expect(snapshot.topDrops[0]!.sellerKey).toBe("ml:unknown"); // the key itself is untouched
    });

    it("gives every unidentified ML listing its own slot instead of sharing one seller's 3-row cap", () => {
      // 5 different ml:unknown LISTINGS with real drops must all make the showcase, unlike 5 drops
      // from one real seller (capped at 3, see "never lists more than 3 drops from the same seller").
      const analyses = Array.from({ length: 5 }, (_, i) =>
        analysis({
          listingId: `ml:${i}`,
          sellerKey: "ml:unknown",
          sellerName: "Mercado Libre",
          classes: ["baja-real"],
          dropPct: 10 + i,
        })
      );
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.topDrops).toHaveLength(5);
    });

    it("does not let unidentified ML listings crowd out a real seller's own 3-drop allowance", () => {
      const analyses = [
        ...Array.from({ length: 5 }, (_, i) =>
          analysis({ listingId: `ml:${i}`, sellerKey: "ml:unknown", sellerName: "Mercado Libre", classes: ["baja-real"], dropPct: 50 })
        ),
        ...[10, 20, 30, 40].map((dropPct, i) =>
          analysis({ listingId: `real:${i}`, sellerKey: "seller-a", classes: ["baja-real"], dropPct })
        ),
      ];
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.topDrops.filter((d) => d.sellerKey === "seller-a")).toHaveLength(3);
      expect(snapshot.topDrops.filter((d) => d.sellerKey === "ml:unknown")).toHaveLength(5);
    });

    // F2 (hallazgo 7): tres casos de borde que la revisión pidió cubrir explícitamente.
    describe("F2: comparación insensible a mayúsculas, y el caso ml:<id> con nombre vacío", () => {
      it("edge case 1: 'MERCADO LIBRE ' (mayúsculas y espacio) cuenta igual que el literal exacto", () => {
        const analyses = Array.from({ length: 6 }, (_, i) =>
          analysis({
            listingId: `ml:${i}`,
            sellerKey: "ml:999",
            sellerName: "MERCADO LIBRE ",
            listPrice: 10000,
            classes: ["tachado-por-encima"],
          })
        );
        const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
        expect(snapshot.sellers).toEqual([]);
      });

      it("edge case 2: ml:unknown sigue siendo no-identificado sin importar qué diga sellerName", () => {
        const analyses = Array.from({ length: 6 }, (_, i) =>
          analysis({
            listingId: `ml:${i}`,
            sellerKey: "ml:unknown",
            sellerName: "cualquier cosa",
            listPrice: 10000,
            classes: ["tachado-por-encima"],
          })
        );
        const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
        expect(snapshot.sellers).toEqual([]);
      });

      it("edge case 3: ml:<id> con nombre vacío NO es 'no identificado' — entra a sellers con un nombre sintetizado por id", () => {
        const analyses = Array.from({ length: 6 }, (_, i) =>
          analysis({
            listingId: `ml:${i}`,
            sellerKey: "ml:777",
            sellerName: "   ", // espacios -> "" tras trim
            listPrice: 10000,
            classes: ["tachado-por-encima"],
          })
        );
        const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
        expect(snapshot.sellers).toHaveLength(1);
        expect(snapshot.sellers[0]).toMatchObject({ sellerKey: "ml:777", sellerName: "Vendedor de Mercado Libre #777" });
      });

      it("edge case 3 (cap): el vendedor ml:<id> sin nombre topa por SU PROPIO sellerKey, no por listingId", () => {
        const analyses = [10, 20, 30, 40, 50].map((dropPct, i) =>
          analysis({ listingId: `ml:${i}`, sellerKey: "ml:777", sellerName: "", classes: ["baja-real"], dropPct })
        );
        const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
        // Capado como cualquier otro vendedor: sus mejores 3, no sus 5.
        expect(snapshot.topDrops).toHaveLength(3);
        expect(snapshot.topDrops.map((d) => d.dropPct)).toEqual([50, 40, 30]);
        expect(snapshot.topDrops.every((d) => d.sellerName === "Vendedor de Mercado Libre #777")).toBe(true);
      });
    });
  });

  // -------------------------------------------------------------------------------------------
  // M9 (final review): a store's own site and its MercadoLibre storefront can publish under the
  // same display name — disambiguate the ML one in the sellers table.
  // -------------------------------------------------------------------------------------------
  describe("M9: sellers sharing a display name — the ML one gets suffixed", () => {
    it("suffixes only the ml:-keyed seller when two sellers share a display name", () => {
      const own = Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `store:${i}`, sellerKey: "store:prontometal", sellerName: "Prontometal", listPrice: 10000, classes: ["precio-de-siempre"] })
      );
      const ml = Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `ml:${i}`, sellerKey: "ml:n:prontometal", sellerName: "Prontometal", listPrice: 10000, classes: ["precio-de-siempre"] })
      );
      const snapshot = buildPriceEventSnapshot([...own, ...ml], TODAY, null, null);
      const names = snapshot.sellers.map((s) => ({ sellerKey: s.sellerKey, sellerName: s.sellerName }));
      // "Prontometal" sorts before "Prontometal (Mercado Libre)" (a prefix sorts first).
      expect(names).toEqual([
        { sellerKey: "store:prontometal", sellerName: "Prontometal" },
        { sellerKey: "ml:n:prontometal", sellerName: "Prontometal (Mercado Libre)" },
      ]);
    });

    it("leaves sellerName untouched when no other seller shares its name", () => {
      const analyses = Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `ml:${i}`, sellerKey: "ml:n:unique-store", sellerName: "Unique Store", listPrice: 10000, classes: ["precio-de-siempre"] })
      );
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      expect(snapshot.sellers[0]!.sellerName).toBe("Unique Store");
    });

    // F2 (hallazgo 8): la detección de "mismo nombre" ahora pliega mayúsculas y acentos. Ojo: el
    // fold NO ignora espacios — "Prontométal" (una palabra, con acento) es el mismo nombre que
    // "PRONTOMETAL" salvo caja/acento; "Pronto Metal" (dos palabras) NO lo es, ver el test siguiente.
    it("detects a duplicate name across case AND accents ('PRONTOMETAL' vs 'Prontométal')", () => {
      const own = Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `store:${i}`, sellerKey: "store:prontometal", sellerName: "PRONTOMETAL", listPrice: 10000, classes: ["precio-de-siempre"] })
      );
      const ml = Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `ml:${i}`, sellerKey: "ml:n:prontometal", sellerName: "Prontométal", listPrice: 10000, classes: ["precio-de-siempre"] })
      );
      const snapshot = buildPriceEventSnapshot([...own, ...ml], TODAY, null, null);
      const mlRow = snapshot.sellers.find((s) => s.sellerKey === "ml:n:prontometal")!;
      expect(mlRow.sellerName).toBe("Prontométal (Mercado Libre)");
    });

    it("does NOT treat 'Pronto Metal' (different spacing) as the same name as 'Prontometal'", () => {
      const own = Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `store:${i}`, sellerKey: "store:prontometal", sellerName: "Prontometal", listPrice: 10000, classes: ["precio-de-siempre"] })
      );
      const ml = Array.from({ length: 5 }, (_, i) =>
        analysis({ listingId: `ml:${i}`, sellerKey: "ml:n:pronto-metal", sellerName: "Pronto Metal", listPrice: 10000, classes: ["precio-de-siempre"] })
      );
      const snapshot = buildPriceEventSnapshot([...own, ...ml], TODAY, null, null);
      const mlRow = snapshot.sellers.find((s) => s.sellerKey === "ml:n:pronto-metal")!;
      expect(mlRow.sellerName).toBe("Pronto Metal"); // untouched — not a real collision
    });

    // F2 (hallazgo 8): el mismo sufijo tiene que aparecer en la vitrina de bajas, no sólo en la
    // tabla de vendedores — antes el cálculo vivía sólo adentro de la sección `sellers`.
    it("applies the same ' (Mercado Libre)' suffix to a topDrops row for the colliding seller", () => {
      const analyses = [
        // 5 offers give "store:prontometal" a place in the sellers table (so the name collision has
        // two real sides), plus one baja-real from the SAME seller so it also appears in topDrops.
        ...Array.from({ length: 5 }, (_, i) =>
          analysis({ listingId: `store:${i}`, sellerKey: "store:prontometal", sellerName: "Prontometal", listPrice: 10000, classes: ["precio-de-siempre"] })
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          analysis({ listingId: `ml:price:${i}`, sellerKey: "ml:n:prontometal", sellerName: "Prontometal", listPrice: 10000, classes: ["precio-de-siempre"] })
        ),
        analysis({ listingId: "ml:drop:1", sellerKey: "ml:n:prontometal", sellerName: "Prontometal", classes: ["baja-real"], dropPct: 15 }),
      ];
      const snapshot = buildPriceEventSnapshot(analyses, TODAY, null, null);
      const dropRow = snapshot.topDrops.find((d) => d.listingId === "ml:drop:1")!;
      expect(dropRow.sellerName).toBe("Prontometal (Mercado Libre)");
    });
  });
});
