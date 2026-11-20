import { describe, expect, it } from "vitest";
import {
  RENTAL_BIG_SOURCE_LISTINGS,
  RENTAL_SOURCE_HISTORY,
  rentalCollapseVerdict,
  rentalNextRecent,
  rentalRunListings,
  rentalSourceDrops,
  rentalSourceReference,
  type RentalCollapseInput,
} from "../../classes/rentals/collapse";
import type { RentalSource } from "../../classes/rentals/types";

// La guarda de corrida flaca del job diario de alquileres. Los números de abajo son los de
// producción: la corrida completa del 18/11/2026 (la última que se guardó) y las del 19 y 20, que
// la guarda vieja tiró enteras por comparar contra TODO lo almacenado.
const source = (key: RentalSource, listings: number, ok = true) => ({ key, ok, listings, note: "" });
const LAST_FULL = {
  generatedAt: "2026-11-18T05:57:31.198Z",
  mode: "full" as const,
  sources: [
    source("mercadolibre", 21606),
    source("infocasas", 14009),
    source("facebook", 5668),
    source("casasweb", 2511),
    source("elpais", 5471),
    source("tiktok", 160),
    source("instagram", 88),
    source("facebookreels", 6),
    source("alquileresuy", 111),
  ],
};
const without = (...keys: RentalSource[]) => ({
  ...LAST_FULL,
  sources: LAST_FULL.sources.map((row) => (keys.includes(row.key) ? { ...row, ok: false, listings: 0 } : row)),
});

const run = (over: Partial<RentalCollapseInput>): RentalCollapseInput => ({
  mode: "full",
  listings: 42202,
  properties: 42199,
  stored: 89590,
  lastFull: LAST_FULL,
  ratio: 0.5,
  ...over,
});

describe("rentalCollapseVerdict", () => {
  it("la última corrida completa guardada trajo 49.630 avisos", () => {
    expect(rentalRunListings(LAST_FULL)).toBe(49630);
  });

  it("no tira una corrida completa normal: 20/11/2026, 42.202 avisos contra 49.630 de la última guardada", () => {
    const verdict = rentalCollapseVerdict(run({}));
    expect(verdict).toMatchObject({ refuse: false, basis: "last-full-run", found: 42202, expected: 49630, threshold: 0.5 });
  });

  it("la guarda vieja la tiraba: 42.199 propiedades son menos de la mitad de las 89.590 guardadas", () => {
    // Lo guardado junta 21 días de avisos que los portales parciales ya no muestran: una corrida
    // completa sana lee la mitad de eso, y la comparación caía de un lado u otro según el día.
    expect(42199 < 89590 * 0.5).toBe(true);
    expect(rentalCollapseVerdict(run({})).refuse).toBe(false);
  });

  it("tampoco tira las otras cuatro corridas que se perdieron en noviembre", () => {
    // 11, 12, 14 y 19 de noviembre, con lo guardado de cada día. El log de las tres primeras sólo
    // conservó las propiedades; los avisos son dos más, como en los días que imprimió las dos cifras.
    const lost: [number, number][] = [
      [43830, 87999],
      [44181, 89054],
      [42163, 87585],
      [44088, 88505],
    ];
    for (const [properties, stored] of lost) {
      expect(properties < stored * 0.5).toBe(true);
      expect(rentalCollapseVerdict(run({ listings: properties + 2, properties, stored })).refuse).toBe(false);
    }
  });

  it("sí tira una caída de verdad: sin Mercado Libre ni InfoCasas queda el 28 % de la corrida anterior", () => {
    const verdict = rentalCollapseVerdict(run({ listings: 14015, properties: 14013 }));
    expect(verdict).toMatchObject({ refuse: true, basis: "last-full-run", found: 14015, expected: 49630, threshold: 0.5 });
  });

  it("el borde es estricto: la mitad exacta pasa, un aviso menos no", () => {
    expect(rentalCollapseVerdict(run({ listings: 24815, properties: 24813 })).refuse).toBe(false);
    expect(rentalCollapseVerdict(run({ listings: 24814, properties: 24812 })).refuse).toBe(true);
  });

  it("perder UNA fuente grande pasa la guarda (y por eso se avisa aparte)", () => {
    // Sin Mercado Libre: 56 % de la corrida anterior y 31 % de lo almacenado. Las otras fuentes se
    // guardan frescas; lo que no puede es pasar callado (rentalSourceDrops).
    const verdict = rentalCollapseVerdict(run({ listings: 28024, properties: 28022 }));
    expect(verdict).toMatchObject({ refuse: false, basis: "last-full-run" });
  });

  it("una caída en escalones choca con el piso contra lo almacenado", () => {
    // Día 1 sin Mercado Libre: se guarda y pasa a ser la vara. Día 2 también sin InfoCasas:
    // 14.015 es el 50,01 % de 28.024 — pasaría por tres avisos — pero es el 15,6 % de lo guardado.
    const afterDayOne = without("mercadolibre");
    expect(rentalRunListings(afterDayOne)).toBe(28024);
    const dayTwo = rentalCollapseVerdict(run({ lastFull: afterDayOne, listings: 14015, properties: 14013, stored: 89600 }));
    expect(14015 >= 28024 * 0.5).toBe(true);
    expect(dayTwo).toMatchObject({ refuse: true, basis: "stored-floor", found: 14013, expected: 89600, threshold: 0.25 });
  });

  it("el piso no toca ninguna corrida sana: la más flaca de noviembre era el 47 % de lo guardado", () => {
    expect(rentalCollapseVerdict(run({ listings: 42165, properties: 42163, stored: 87585 })).refuse).toBe(false);
    // Y justo en el borde del piso (un cuarto de lo guardado), con una vara chica que no la frene.
    const small = without("mercadolibre", "infocasas", "facebook", "elpais");
    expect(rentalRunListings(small)).toBe(2876);
    expect(rentalCollapseVerdict(run({ lastFull: small, listings: 22400, properties: 22398, stored: 89590 }))).toMatchObject({ refuse: false, basis: "last-full-run" });
    expect(rentalCollapseVerdict(run({ lastFull: small, listings: 22399, properties: 22397, stored: 89590 }))).toMatchObject({ refuse: true, basis: "stored-floor" });
  });

  it("la tanda horaria nunca se juzga: es parcial a propósito", () => {
    expect(rentalCollapseVerdict(run({ mode: "fast", listings: 2982, properties: 2982 }))).toMatchObject({ refuse: false, basis: "none" });
  });

  it("sin corrida completa guardada cae a la regla anterior, contra lo almacenado", () => {
    expect(rentalCollapseVerdict(run({ lastFull: null }))).toMatchObject({ refuse: true, basis: "stored", found: 42199, expected: 89590, threshold: 0.5 });
    expect(rentalCollapseVerdict(run({ lastFull: null, properties: 48279, listings: 48281 }))).toMatchObject({ refuse: false, basis: "stored" });
  });

  it("un resumen que no es de una corrida completa, o casi vacío, no sirve de vara", () => {
    expect(rentalCollapseVerdict(run({ lastFull: { ...LAST_FULL, mode: "fast" } })).basis).toBe("stored");
    expect(rentalCollapseVerdict(run({ lastFull: { ...LAST_FULL, sources: [source("mercadolibre", 150)] } })).basis).toBe("stored");
  });

  it("un directorio recién nacido no tiene con qué comparar y se guarda", () => {
    expect(rentalCollapseVerdict(run({ lastFull: null, stored: 120, properties: 10, listings: 10 }))).toMatchObject({ refuse: false, basis: "none" });
  });

  it("una fuente sin número no rompe la suma", () => {
    const holed = { ...LAST_FULL, sources: [...LAST_FULL.sources, { key: "tiktok" as const, ok: false, listings: undefined as unknown as number, note: "" }] };
    expect(rentalCollapseVerdict(run({ lastFull: holed })).expected).toBe(49630);
  });

  it("RENTALS_COLLAPSE_RATIO=0 apaga las dos varas: la salida para una baja permanente y sabida", () => {
    expect(rentalCollapseVerdict(run({ ratio: 0, listings: 10, properties: 10 })).refuse).toBe(false);
    expect(rentalCollapseVerdict(run({ ratio: 0, lastFull: null, listings: 10, properties: 10 })).refuse).toBe(false);
  });
});

describe("rentalSourceDrops", () => {
  // La corrida del 20/11/2026: Facebook cortado a dos búsquedas y El País con lecturas incompletas.
  const today = [
    { key: "mercadolibre", listings: 21593 },
    { key: "infocasas", listings: 13965 },
    { key: "facebook", listings: 1884 },
    { key: "casasweb", listings: 2484 },
    { key: "elpais", listings: 1899 },
    { key: "tiktok", listings: 173 },
  ];
  const withListings = (key: string, listings: number) => today.map((row) => (row.key === key ? { ...row, listings } : row));
  /** El resumen que deja guardado una corrida completa: lo de hoy, y el `recent` de cada fuente. */
  const saved = (previous: typeof LAST_FULL, runs: { key: string; listings: number }[]) => ({
    ...previous,
    sources: previous.sources.map((row) => {
      const listings = runs.find((item) => item.key === row.key)?.listings ?? 0;
      return { ...row, listings, recent: rentalNextRecent(row, listings) };
    }),
  });

  it("nombra las fuentes que trajeron menos de la mitad de su vara, y dice cuáles son grandes", () => {
    expect(rentalSourceDrops(today, LAST_FULL)).toEqual([
      { key: "facebook", now: 1884, before: 5668, big: false },
      { key: "elpais", now: 1899, before: 5471, big: false },
    ]);
  });

  it("grande es por tamaño, no por parte de la corrida: Mercado Libre e InfoCasas", () => {
    expect(RENTAL_BIG_SOURCE_LISTINGS).toBe(10_000);
    const ml = rentalSourceDrops(withListings("mercadolibre", 0), LAST_FULL).filter((drop) => drop.big);
    expect(ml).toEqual([{ key: "mercadolibre", now: 0, before: 21606, big: true }]);
    const ic = rentalSourceDrops(withListings("infocasas", 6000), LAST_FULL).filter((drop) => drop.big);
    expect(ic).toEqual([{ key: "infocasas", now: 6000, before: 14009, big: true }]);
    // Un día gordo de Facebook no le saca a InfoCasas la condición de grande (el 17/11/2026 era el
    // 25,7 % de una corrida de 54.488: con el umbral por parte, 1.600 avisos más la dejaban afuera).
    const fat = { ...LAST_FULL, sources: LAST_FULL.sources.map((row) => (row.key === "facebook" ? { ...row, listings: 12500 } : row)) };
    expect(rentalRunListings(fat)).toBe(56462);
    expect(14009 / 56462 < 0.25).toBe(true);
    expect(rentalSourceDrops(withListings("infocasas", 0), fat).find((drop) => drop.key === "infocasas")?.big).toBe(true);
  });

  it("la vara es la mediana de las últimas corridas, no la de ayer: un desangre del 40 % diario se nombra al segundo día", () => {
    // 21.606 → 12.964 → 7.778: cada día trae el 60 % del anterior, nunca menos de la mitad.
    let summary = saved(LAST_FULL, LAST_FULL.sources);
    expect(rentalSourceDrops(withListings("mercadolibre", 12964), summary).filter((drop) => drop.big)).toEqual([]);
    summary = saved(summary, withListings("mercadolibre", 12964));
    expect(summary.sources[0]!.recent).toEqual([21606, 21606, 12964]);
    expect(7778 >= 12964 * 0.5).toBe(true);
    expect(rentalSourceDrops(withListings("mercadolibre", 7778), summary).filter((drop) => drop.big)).toEqual([
      { key: "mercadolibre", now: 7778, before: 21606, big: true },
    ]);
  });

  it("una fuente muerta se sigue nombrando cada día hasta que la mediana la alcanza", () => {
    // Una semana de corridas sanas guardadas, y después Mercado Libre en cero.
    let summary = saved(LAST_FULL, LAST_FULL.sources);
    for (let day = 0; day < RENTAL_SOURCE_HISTORY; day++) summary = saved(summary, LAST_FULL.sources);
    const dead = withListings("mercadolibre", 0);
    const named: boolean[] = [];
    for (let day = 0; day < 5; day++) {
      named.push(rentalSourceDrops(dead, summary).some((drop) => drop.key === "mercadolibre" && drop.big));
      summary = saved(summary, dead);
    }
    // Cuatro días seguidos; al quinto hay cuatro ceros entre las siete y la mediana ya es cero.
    expect(named).toEqual([true, true, true, true, false]);
  });

  it("una fuente chica no cuenta, y una que hoy ni corrió cuenta como cero", () => {
    // instagram (88), facebookreels (6) y alquileresuy (111) no aparecen aunque hoy falten.
    const drops = rentalSourceDrops([{ key: "mercadolibre", listings: 21593 }], LAST_FULL);
    expect(drops.map((drop) => drop.key)).toEqual(["infocasas", "facebook", "casasweb", "elpais"]);
    expect(drops.every((drop) => drop.now === 0)).toBe(true);
  });

  it("sin corrida completa guardada no hay contra qué comparar", () => {
    expect(rentalSourceDrops(today, null)).toEqual([]);
    expect(rentalSourceDrops(today, { ...LAST_FULL, mode: "fast" })).toEqual([]);
  });
});

describe("la vara de cada fuente", () => {
  it("es la mediana de sus últimas corridas guardadas", () => {
    expect(rentalSourceReference({ listings: 9, recent: [21606, 21485, 21499, 21606, 12000] })).toBe(21499);
    expect(rentalSourceReference({ listings: 9, recent: [21606, 0] })).toBe(10803);
  });

  it("un resumen de antes de `recent` vale por su única corrida", () => {
    expect(rentalSourceReference({ listings: 21606 })).toBe(21606);
    expect(rentalSourceReference({ listings: 21606, recent: [] })).toBe(21606);
    expect(rentalSourceReference(null)).toBe(0);
    expect(rentalSourceReference({ listings: Number.NaN })).toBe(0);
  });

  it("cada corrida completa guardada agrega lo suyo y conserva las últimas siete", () => {
    expect(rentalNextRecent({ listings: 21606 }, 21593)).toEqual([21606, 21593]);
    expect(rentalNextRecent(null, 21593)).toEqual([21593]);
    expect(rentalNextRecent({ listings: 0, recent: [1, 2, 3, 4, 5, 6, 7] }, 8)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(rentalNextRecent({ listings: 5, recent: ["x", -3, 4] as unknown as number[] }, 6)).toEqual([4, 6]);
    expect(RENTAL_SOURCE_HISTORY).toBe(7);
  });
});
