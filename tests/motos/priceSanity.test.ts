// La guarda de precio: lo que no puede ser el precio de ESA moto se retira, no se corrige.
//
// El test que de verdad importa es el segundo: que una moto BARATA DE VERDAD sobreviva. Copiar los
// pisos de autos (US$ 200 absolutos, cohortes de 5/8/20 avisos) habría borrado justo el tramo que
// este directorio existe para publicar — los ciclomotores usados de US$ 400 a US$ 700.
import { describe, expect, it } from "vitest";
import {
  MOTO_PRICE_ABSOLUTE_FLOOR_USD,
  dropImplausibleMotoPrices,
  motoPriceDropSummary,
  type MotoPriceSubject,
} from "../../classes/motos/priceSanity";

const moto = (over: Partial<MotoPriceSubject> & { key: string; priceUsd: number }): MotoPriceSubject => ({
  year: 2020,
  brandSlug: "yumbo",
  marketSlug: "yumbo-gs-200",
  ...over,
});

/** Un grupo de pares creíbles, para que exista la cohorte contra la que se mide. */
const cohort = (count: number, priceUsd: number, prefix = "par"): MotoPriceSubject[] =>
  Array.from({ length: count }, (_value, index) => moto({ key: `${prefix}-${index}`, priceUsd }));

describe("precio imposible", () => {
  it("retira el aviso que está muy por debajo de su propio modelo y año", () => {
    const listings = [...cohort(6, 2_000), moto({ key: "raro", priceUsd: 150 })];
    const result = dropImplausibleMotoPrices(listings);
    expect(result.dropped.map(row => row.key)).toEqual(["raro"]);
    expect(result.dropped[0]!.basis).toBe("model_year");
    expect(result.kept).toHaveLength(6);
  });

  it("una moto barata DE VERDAD sobrevive: el piso de autos la habría borrado", () => {
    // Seis ciclomotores usados a US$ 450: es un precio corriente en Uruguay y está por encima del
    // piso propio (US$ 120) aunque esté muy por debajo del de autos (US$ 200 … y de los US$ 1.000
    // que usa el lector Fenicio de autos).
    const listings = cohort(6, 450);
    expect(dropImplausibleMotoPrices(listings).dropped).toEqual([]);
    expect(MOTO_PRICE_ABSOLUTE_FLOOR_USD).toBeLessThan(200);
  });

  it("sin ninguna cohorte, sólo el piso absoluto decide", () => {
    const solo = moto({ key: "solo", priceUsd: 400, marketSlug: "harley-sportster", brandSlug: "harley" });
    expect(dropImplausibleMotoPrices([solo]).dropped).toEqual([]);

    const accesorio = moto({ key: "accesorio", priceUsd: 45, marketSlug: "harley-sportster", brandSlug: "harley" });
    const result = dropImplausibleMotoPrices([accesorio]);
    expect(result.dropped.map(row => row.basis)).toEqual(["floor"]);
    expect(result.kept).toEqual([]);
  });

  it("la primera cohorte que existe es la que manda, y afloja al hacerse más gruesa", () => {
    // Sin pares del mismo modelo, pero con seis de la marca en el año: el escalón brand_year (8 %)
    // es el que decide, y una Harley a US$ 500 entre pares de US$ 12.000 no sobrevive.
    const pares = Array.from({ length: 6 }, (_value, index) =>
      moto({ key: `hd-${index}`, priceUsd: 12_000, brandSlug: "harley", marketSlug: `harley-modelo-${index}` })
    );
    const barata = moto({ key: "barata", priceUsd: 500, brandSlug: "harley", marketSlug: "harley-otra" });
    const result = dropImplausibleMotoPrices([...pares, barata]);
    expect(result.dropped.map(row => row.key)).toEqual(["barata"]);
    expect(result.dropped[0]!.basis).toBe("brand_year");
  });

  it("un precio que no es positivo nunca es un precio", () => {
    const result = dropImplausibleMotoPrices([moto({ key: "cero", priceUsd: 0 })]);
    expect(result.dropped.map(row => row.basis)).toEqual(["floor"]);
  });

  it("el resumen cuenta por motivo, que es lo que va al log del job", () => {
    const listings = [...cohort(6, 2_000), moto({ key: "raro", priceUsd: 100 })];
    const result = dropImplausibleMotoPrices(listings);
    expect(motoPriceDropSummary(result.dropped)).toEqual({ model_year: 1 });
  });

  it("no corrige ningún precio: lo que devuelve son los avisos intactos", () => {
    const listings = [...cohort(6, 2_000), moto({ key: "raro", priceUsd: 150 })];
    const result = dropImplausibleMotoPrices(listings);
    for (const kept of result.kept) expect(kept.priceUsd).toBe(2_000);
  });
});
