// De la tarjeta cruda a la moto: kilometraje, evidencia de tipo, moneda y baja de precio.
import { describe, expect, it } from "vitest";
import {
  attachMotoDisplacements,
  enrichMotoListing,
  motoFichaExcluded,
  motoInactive,
  motoKmQuality,
  motoPowerOf,
  motoPriceDrop,
} from "../../classes/motos/enrich";
import type { RawMotoListing } from "../../classes/motos/types";

const SEEN = "2026-09-22T11:00:00.000Z";

const raw = (over: Partial<RawMotoListing> = {}): RawMotoListing => ({
  id: "MLU1",
  source: "mercadolibre",
  brandId: "2102273",
  brand: "Yumbo",
  modelId: "8801",
  model: "GS 200",
  title: "Yumbo Gs 200 Cc 2020",
  year: 2020,
  km: 12_000,
  price: 1_500,
  currency: "USD",
  fuel: "nafta",
  neighborhood: null,
  department: "Montevideo",
  sellerType: "private",
  sellerId: "1",
  picture: null,
  pictureCount: 1,
  permalink: "https://moto.mercadolibre.com.uy/MLU-1-yumbo-_JM",
  observedAt: SEEN,
  ...over,
});

const enrich = (over: Partial<RawMotoListing> = {}, context: Record<string, unknown> = {}) =>
  enrichMotoListing(raw(over), { usdUyu: 42, firstSeen: SEEN, lastSeen: SEEN, priceHistory: [], ...context } as never);

describe("kilometraje", () => {
  it("un 1 es 'no declaré', no un kilómetro", () => {
    expect(motoKmQuality(1)).toBe("placeholder");
    expect(motoKmQuality(0)).toBe("placeholder");
  });

  it("pero 11 km en una moto de 2026 es un número real — el umbral de autos los habría borrado", () => {
    expect(motoKmQuality(11)).toBe("ok");
    expect(motoKmQuality(200)).toBe("ok");
    expect(motoKmQuality(999)).toBe("ok");
  });

  it("el dígito repetido largo sigue siendo el placeholder clásico de Mercado Libre", () => {
    expect(motoKmQuality(111_111)).toBe("placeholder");
    expect(motoKmQuality(11_111)).toBe("placeholder");
    expect(motoKmQuality(1_111)).toBe("placeholder");
    expect(motoKmQuality(111)).toBe("ok");
  });

  it("un kilometraje que no puede ser el de una moto tampoco cuenta", () => {
    expect(motoKmQuality(400_000)).toBe("placeholder");
  });

  it("sin dato es sin dato, no cero", () => {
    expect(motoKmQuality(null)).toBe("unknown");
  });
});

describe("evidencia del tipo", () => {
  it("la faceta del origen le gana al título", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc Naked" }, { declaredType: "scooter" });
    expect(listing.type).toBe("scooter");
    expect(listing.typeBasis).toBe("mercadolibre");
  });

  it("sin faceta, la palabra del título alcanza pero se declara como tal", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc Naked" });
    expect(listing.type).toBe("naked");
    expect(listing.typeBasis).toBe("title");
  });

  it("sin ninguna de las dos, no hay tipo y no hay base", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc" });
    expect(listing.type).toBeNull();
    expect(listing.typeBasis).toBeNull();
  });
});

describe("tramo de cilindrada", () => {
  it("la faceta del origen manda el tramo, y la cilindrada exacta sigue siendo la del título", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc 2020" }, { declaredBand: "126-250" });
    expect(listing.displacementBand).toBe("126-250");
    expect(listing.displacementBandBasis).toBe("mercadolibre");
    expect(listing.displacement).toBe(200);
    expect(listing.displacementBasis).toBe("title");
  });

  it("una cilindrada que no entra en el tramo declarado se descarta: un tramo nunca la inventa", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc 2020" }, { declaredBand: "hasta-125" });
    expect(listing.displacementBand).toBe("hasta-125");
    // El título y el nombre del modelo dicen 200 y el origen dice "hasta 125": no se elige.
    expect(listing.displacement).toBeNull();
  });

  it("la ficha del aviso le gana al título", () => {
    const listing = enrich(
      { title: "Yumbo Gs 200 Cc 2020" },
      { detail: { readAt: SEEN, displacement: 197, specs: {}, pictures: [], description: "", active: true, price: 1500, currency: "USD", typeText: "Calle", color: "Rojo" } }
    );
    expect(listing).toMatchObject({ displacement: 197, displacementBasis: "ficha", exactDisplacement: 197, type: "calle", typeBasis: "ficha", color: "rojo" });
  });

  it("sin dato del aviso, el nombre del modelo estima y se declara como estimación", () => {
    const listing = enrich({ title: "Yumbo Gs 2020 impecable" });
    expect(listing).toMatchObject({ displacement: 200, displacementBasis: "model-name", exactDisplacement: null });
    expect(listing.displacementBand).toBe("126-250");
    expect(listing.displacementBandBasis).toBe("model-name");
    expect(listing.productKey).toBe("yumbo|gs-200|sincc");
  });

  it("sin faceta, el tramo se deriva de la cilindrada del título", () => {
    const listing = enrich({ title: "Yumbo Gs 200 Cc 2020" });
    expect(listing.displacementBand).toBe("126-250");
    expect(listing.displacementBandBasis).toBe("title");
  });

  it("sin ninguna de las dos, no hay tramo y se declara", () => {
    const listing = enrich({ title: "Yumbo Gs 2020 impecable", model: "GS" });
    expect(listing.displacement).toBeNull();
    expect(listing.displacementBand).toBeNull();
    expect(listing.displacementBandBasis).toBeNull();
  });
});

describe("moneda y precio", () => {
  it("un precio en pesos se convierte, y se marca que se convirtió", () => {
    const listing = enrich({ price: 63_000, currency: "UYU" });
    expect(listing.priceUsd).toBe(1_500);
    expect(listing.priceConverted).toBe(true);
    // Nunca DEDUCIDA: Mercado Libre declara la moneda en cada tarjeta.
    expect(listing.currencyInferred).toBe(false);
  });

  it("una baja de precio sólo se afirma si la vimos, y en la misma moneda", () => {
    const history = [
      { price: 1_800, currency: "USD" as const, observedAt: "2026-09-20T11:00:00.000Z" },
      { price: 1_500, currency: "USD" as const, observedAt: SEEN },
    ];
    expect(motoPriceDrop({ price: 1_500, currency: "USD" }, history)).toEqual({
      from: 1_800,
      currency: "USD",
      since: SEEN,
    });
  });

  it("un cambio de moneda no es una baja del 4.000 %", () => {
    const history = [
      { price: 63_000, currency: "UYU" as const, observedAt: "2026-09-20T11:00:00.000Z" },
      { price: 1_500, currency: "USD" as const, observedAt: SEEN },
    ];
    expect(motoPriceDrop({ price: 1_500, currency: "USD" }, history)).toBeNull();
  });
});

describe("combustible", () => {
  it("el título alcanza cuando la etiqueta de Mercado Libre no lo dice", () => {
    expect(enrich({ title: "Yumbo Gs Eléctrica Litio", fuel: null }).fuel).toBe("electrica");
  });

  it("y lo que no dice nada no se declara eléctrico", () => {
    expect(enrich({ title: "Yumbo Gs 200 Cc", fuel: null }).fuel).toBeNull();
  });
});

describe("la ficha propia del aviso", () => {
  const ficha = (over: Record<string, unknown> = {}) => ({
    readAt: SEEN,
    price: 1500,
    currency: "USD",
    active: true,
    specs: {},
    displacement: null,
    typeText: null,
    color: null,
    pictures: [],
    description: "",
    ...over,
  });

  it("la potencia sólo si la unidad y el número se pueden creer", () => {
    expect(motoPowerOf("77 hp", 750)).toBe("77 hp");
    expect(motoPowerOf("9,7 hp", 125)).toBe("9,7 hp");
    expect(motoPowerOf("45 cv", null)).toBe("45 cv");
    // La cilindrada en el campo de la potencia, kilovatios imposibles y vatios.
    expect(motoPowerOf("636 hp", 636)).toBeNull();
    expect(motoPowerOf("125 kW", 125)).toBeNull();
    expect(motoPowerOf("150 W", 150)).toBeNull();
    expect(motoPowerOf("", 150)).toBeNull();
  });

  it("la ficha técnica curada, con los Sí/No leídos", () => {
    const listing = enrich(
      { title: "Yumbo Gs 200 2020" },
      {
        detail: ficha({
          displacement: 200,
          specs: { Motor: "4 tiempos", Frenos: "Disco delantero", "Único dueño": "Sí", "Acepta permuta": "No", Potencia: "16 hp", "Numero de velocidades": "5" },
          pictures: ["https://http2.mlstatic.com/a-O.webp", "https://otro.host/b.webp"],
        }),
      }
    );
    expect(listing.specs).toMatchObject({ engine: "4 tiempos", brakes: "Disco delantero", uniqueOwner: true, tradeIn: false, negotiable: null, power: "16 hp", gears: 5 });
    expect(listing.pictures).toEqual(["https://http2.mlstatic.com/a-O.webp"]);
  });

  it("lo que el vendedor declara en la descripción es un riesgo con su cita", () => {
    const listing = enrich({}, { detail: ficha({ description: "Moto chocada, tiene el chasis doblado." }) });
    expect(listing.risks.map(risk => risk.category)).toContain("siniestro");
    expect(listing.risks[0]!.from).toBe("description");
  });

  it("una ficha de cuatriciclo saca al aviso, una ficha inactiva leída después también", () => {
    expect(motoFichaExcluded(ficha({ typeText: "Cuatriciclos" }) as never)).toBe(true);
    expect(motoFichaExcluded(ficha({ typeText: "Naked" }) as never)).toBe(false);
    const paused = ficha({ active: false, readAt: "2026-09-23T00:00:00.000Z" }) as never;
    expect(motoInactive({ detail: paused, lastSeen: SEEN })).toBe(true);
    // La búsqueda lo volvió a mostrar después de leer la ficha: se reactivó.
    expect(motoInactive({ detail: paused, lastSeen: "2026-09-24T00:00:00.000Z" })).toBe(false);
    // Una ficha que contestó 404/410 después de la última aparición: el aviso ya no existe.
    expect(motoInactive({ detail: null, detailGoneAt: "2026-09-23T00:00:00.000Z", lastSeen: SEEN })).toBe(true);
    expect(motoInactive({ detail: null, detailGoneAt: "2026-09-21T00:00:00.000Z", lastSeen: SEEN })).toBe(false);
  });

  it("el consenso del modelo completa a los que no dicen la cilindrada", () => {
    const rows = attachMotoDisplacements([
      enrich({ id: "a1", model: "Gs" }, { detail: ficha({ displacement: 150 }) }),
      enrich({ id: "a2", model: "Gs" }, { detail: ficha({ displacement: 150 }) }),
      enrich({ id: "a3", model: "Gs", title: "Yumbo Gs 150cc" }),
      enrich({ id: "a4", model: "Gs", title: "Yumbo Gs impecable" }),
    ]);
    expect(rows[3]).toMatchObject({ displacement: 150, displacementBasis: "model", displacementVotes: 3, displacementBand: "126-250" });
    expect(rows[3]!.productKey).toBe("yumbo|gs|sincc");
  });
});

describe("lo que declara el vendedor, sin falsos positivos medidos", () => {
  const ficha = (description: string) => ({
    readAt: SEEN, price: 1500, currency: "USD", active: true, specs: {}, displacement: null,
    typeText: null, color: null, pictures: [], description,
  });
  it("«SUCIVE pago, sin multas ni deudas» no es una deuda (ml-MLU1533787238, 23/11/2026)", () => {
    const listing = enrich({}, { detail: ficha("• Documentación: Totalmente al día (SUCIVE pago, sin multas ni deudas, SOA vigente).") });
    expect(listing.risks.map(risk => risk.category)).not.toContain("deuda");
  });
  it("la deuda del auto que se acepta en permuta no es de la moto (ml-MLU1526787882)", () => {
    const listing = enrich({}, { detail: ficha("Puedo permutar auto al día o con deuda pagable.\nPuedo poner diferencia") });
    expect(listing.risks.map(risk => risk.category)).not.toContain("deuda");
  });
  it("una deuda con monto o «tiene deuda de patente» sigue contando", () => {
    expect(enrich({}, { detail: ficha("CHAPA Y LIBRETA ORIGINAL A LA FECHA 24/10/26 DEBE $1700 PESOS") }).risks.map(risk => risk.category)).toContain("deuda");
    expect(enrich({}, { detail: ficha("Tiene deuda de patente . El precio es menos..") }).risks.map(risk => risk.category)).toContain("deuda");
  });
  it("la potencia se mide también contra la cilindrada estimada: «125 kW» en una GTR 125 no pasa", () => {
    const listing = enrich({ model: "GTR 125", title: "Color Rojo" }, { detail: { ...ficha(""), specs: { Potencia: "125 kW" } } });
    expect(listing.displacementBasis).toBe("model-name");
    expect(listing.specs?.power).toBeNull();
  });
});

describe("los avisos de Mercado Libre sin modelo", () => {
  const ficha = (specs: Record<string, string>) => ({
    readAt: SEEN, price: 1500, currency: "USD", active: true, specs, displacement: null,
    typeText: null, color: null, pictures: [], description: "",
  });
  const sinModelo = { model: "Sin modelo", modelId: "sin-modelo-2102273", title: "Moto impecable 2020" };

  it("toman el modelo de la fila «Modelo» de su ficha", () => {
    const listing = enrich(sinModelo, { detail: ficha({ Modelo: "GTR 125" }) });
    expect(listing).toMatchObject({ model: "GTR 125", modelId: "ficha-gtr-125", marketSlug: "yumbo-gtr-125" });
  });

  it("sin ficha siguen sin modelo, y nunca arman consenso de cilindrada", () => {
    const rows = attachMotoDisplacements([
      enrich({ ...sinModelo, id: "s1" }, { detail: { ...ficha({}), displacement: 125 } }),
      enrich({ ...sinModelo, id: "s2" }, { detail: { ...ficha({}), displacement: 125 } }),
      enrich({ ...sinModelo, id: "s3" }, { detail: { ...ficha({}), displacement: 125 } }),
      enrich({ ...sinModelo, id: "s4" }),
    ]);
    expect(rows[3]!.marketSlug).toBe("yumbo-sin-modelo");
    // Tres "Sin modelo" con 125 no le dan 125 a un cuarto: no son la misma moto.
    expect(rows[3]!.displacement).toBeNull();
  });
});
