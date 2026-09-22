import { describe, expect, it } from "vitest";
import { changeFromSeries, rankChanges } from "../../classes/pricehistory/scan";
import type { PriceChange, PriceHistorySeries } from "../../classes/pricehistory/types";

const series = (over: Partial<PriceHistorySeries> = {}): PriceHistorySeries => ({
  vertical: "equipar",
  id: "ml:MLU1",
  title: "Heladera",
  url: "https://x/y",
  sellerName: "Tienda",
  sellerKey: "tienda",
  currency: "UYU",
  points: [
    { d: "2026-09-15", p: 30000 },
    { d: "2026-09-19", p: 27000 },
  ],
  firstSeen: "2026-09-15",
  lastSeen: "2026-09-22",
  changePct: -10,
  lastChange: { from: 30000, to: 27000, at: "2026-09-19" },
  currencySwitched: false,
  source: "pricewatch",
  ...over,
});

const change = (over: Partial<PriceChange> = {}): PriceChange => ({
  vertical: "equipar",
  id: "ml:MLU1",
  title: "Heladera",
  url: "https://x/y",
  external: true,
  sellerName: "Tienda",
  sellerKey: "tienda",
  from: 30000,
  to: 27000,
  currency: "UYU",
  at: "2026-09-19",
  pct: -10,
  direction: "baja",
  ...over,
});

describe("changeFromSeries", () => {
  it("toma el último cambio dentro de la ventana", () => {
    const row = changeFromSeries(series(), "2026-09-22", 7);
    expect(row).toMatchObject({ from: 30000, to: 27000, pct: -10, direction: "baja", at: "2026-09-19" });
  });

  it("un cambio de hace 20 días queda afuera", () => {
    const old = series({ lastChange: { from: 30000, to: 27000, at: "2026-09-02" } });
    expect(changeFromSeries(old, "2026-09-22", 7)).toBeNull();
  });

  it("una serie sin cambio no es una fila", () => {
    expect(changeFromSeries(series({ lastChange: null }), "2026-09-22", 7)).toBeNull();
  });

  it("una suba se publica como suba", () => {
    const up = series({ lastChange: { from: 20000, to: 25000, at: "2026-09-21" } });
    expect(changeFromSeries(up, "2026-09-22", 7)).toMatchObject({ direction: "suba", pct: 25 });
  });

  it("una serie sin título o sin url no se puede publicar", () => {
    expect(changeFromSeries(series({ title: null }), "2026-09-22", 7)).toBeNull();
    expect(changeFromSeries(series({ url: null }), "2026-09-22", 7)).toBeNull();
  });

  it("un cambio con fecha futura no entra", () => {
    const future = series({ lastChange: { from: 30000, to: 27000, at: "2026-09-25" } });
    expect(changeFromSeries(future, "2026-09-22", 7)).toBeNull();
  });
});

describe("rankChanges", () => {
  it("ordena por magnitud y topea por vendedor", () => {
    // El nombre público es lo que cuenta para el tope, así que dos vendedores distintos tienen que
    // tener nombres distintos en el fixture, no sólo claves distintas.
    const rows = [
      change({ id: "a", sellerKey: "auto", sellerName: "Automotora", pct: -5 }),
      change({ id: "b", sellerKey: "auto", sellerName: "Automotora", pct: -30 }),
      change({ id: "c", sellerKey: "auto", sellerName: "Automotora", pct: -20 }),
      change({ id: "d", sellerKey: "auto", sellerName: "Automotora", pct: -12 }),
      change({ id: "e", sellerKey: "otra", sellerName: "Otra automotora", pct: -8 }),
    ];
    const ranked = rankChanges(rows, { perSeller: 3, perVertical: 25 });
    expect(ranked.map(row => row.id)).toEqual(["b", "c", "d", "e"]);
  });

  it("topea por vertical", () => {
    const rows = Array.from({ length: 30 }, (_, index) =>
      change({ id: `id-${index}`, sellerKey: `vendedor-${index}`, sellerName: `Vendedor ${index}`, pct: -(index + 1) })
    );
    expect(rankChanges(rows, { perSeller: 3, perVertical: 5 })).toHaveLength(5);
  });

  it("cada vertical tiene su propio tope", () => {
    const rows = [
      ...Array.from({ length: 4 }, (_, index) =>
        change({ vertical: "equipar", id: `e${index}`, sellerKey: `v${index}`, sellerName: `Vendedor ${index}` })
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        change({ vertical: "autos", id: `a${index}`, sellerKey: `w${index}`, sellerName: `Automotora ${index}` })
      ),
    ];
    const ranked = rankChanges(rows, { perSeller: 3, perVertical: 2 });
    expect(ranked.filter(row => row.vertical === "equipar")).toHaveLength(2);
    expect(ranked.filter(row => row.vertical === "autos")).toHaveLength(2);
  });

  it("sin sellerKey, el nombre del anunciante cuenta como identidad", () => {
    // Los logs de alquiler y venta no guardan `sellerKey`: sin esta regla, una inmobiliaria que
    // retocó el mismo precio en cinco avisos ocupaba cinco filas seguidas.
    const rows = Array.from({ length: 5 }, (_, index) =>
      change({ vertical: "alquiler", id: `ap-${index}`, sellerKey: null, sellerName: "Inmobiliaria X", pct: -(index + 1) })
    );
    expect(rankChanges(rows, { perSeller: 3, perVertical: 25 })).toHaveLength(3);
  });

  it("dos claves con el mismo nombre público comparten un solo cupo", () => {
    // DIMM en celulares tiene su propia tienda (`dimm`) y su cuenta de Mercado Libre (`ml:n:dimm`):
    // con el tope por clave publicaba seis filas seguidas con el mismo nombre (medido 2026-09-22).
    const rows = [
      ...Array.from({ length: 3 }, (_, index) =>
        change({ vertical: "celulares", id: `tienda-${index}`, sellerKey: "dimm", sellerName: "DIMM", pct: -(index + 10) })
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        change({ vertical: "celulares", id: `ml-${index}`, sellerKey: "ml:n:dimm", sellerName: "DIMM", pct: -(index + 20) })
      ),
    ];
    expect(rankChanges(rows, { perSeller: 3, perVertical: 25 })).toHaveLength(3);
  });

  it("un aviso sin vendedor no consume el cupo de otro", () => {
    const rows = Array.from({ length: 5 }, (_, index) =>
      change({ id: `sin-${index}`, sellerKey: null, sellerName: null, pct: -(index + 1) })
    );
    expect(rankChanges(rows, { perSeller: 3, perVertical: 25 })).toHaveLength(5);
  });

  it("el orden no depende del orden de entrada", () => {
    const rows = [
      change({ id: "a", sellerKey: "x", sellerName: "Uno", pct: -10 }),
      change({ id: "b", sellerKey: "y", sellerName: "Dos", pct: -10 }),
    ];
    expect(rankChanges([...rows].reverse(), { perSeller: 3, perVertical: 25 }).map(row => row.id)).toEqual(["a", "b"]);
  });
});
