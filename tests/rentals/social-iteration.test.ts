// Second iteration over the social sources (2026-09-25): what the parser lost on real captions.
import { describe, expect, it } from "vitest";
import { captionAmounts, parseCaption } from "../../classes/rentals/sources/social/caption";

const parse = (text: string) => parseCaption(text.split("\n"), []);

describe("a rental advert that never says 'alquiler'", () => {
  it("counts a named rental guarantee or a lease term as the rental verb", () => {
    // inmobiliariaalquilar on TikTok, 2026-09-17 (phone removed).
    const haedo = parse("Victor Haedo y Acevedo Diaz\n3.000 aprox gc\nPrecio\nGarantias: Aseguradoras, Por otras consultar\n$29.800\nContrato 2 años, por menos consultar\nCocina\nTerraza con conexión lavarropas\nLiving Muy Grande\nPiso 1 por escalera\nMascotas: si\n#montevideo");
    expect(haedo).toMatchObject({ rejected: null, price: 29800, currency: "UYU" });
    // inmobiliariaalquilar on Instagram, the carousel and the reel.
    const malvin = parse("$27.000\nSin gastos comunes\n1 dormitorio\nPatio\nCocina muy grande\nLiving amplio\nAseguradoras\nContrato 2 años (consultar por menos)\nMascotas si chicas\nMalvín\nA 3 cuadras de la rambla");
    expect(malvin).toMatchObject({ rejected: null, price: 27000, commonExpenses: 0, neighborhood: "Malvín" });
    expect(parse("Apartamento en Pocitos, 2 dormitorios, $32.000. Garantía ANDA o CGN")).toMatchObject({ rejected: null, price: 32000 });
  });

  it("does not read the verb 'anda' or a guarantee-less advert as a rental", () => {
    expect(parse("Apartamento en Pocitos que anda bárbaro, 2 dormitorios, $32.000 #montevideo").rejected).toBe("sin verbo de alquiler");
    expect(parse("Estudio disponible para la renta en Newark NJ $1,050 por mes").rejected).toBe("sin verbo de alquiler");
    // A sale is still a sale, whatever else it names.
    expect(parse("VENTA apartamento en Pocitos U$S 120.000, contrato de 2 años con inquilino, aseguradoras").rejected).toBe("venta");
  });
});

describe("unlabelled amounts of one caption", () => {
  it("takes the rent when it is at least four times every other unlabelled amount of the same currency", () => {
    const soho = "🤩 Alquiler 2 dormitorios en Ventura Soho – Palermo\n✅ Maldonado 1821 esq. Yaro\n✅ $34.700\n✅ Gastos comunes: $5.400\n✅ Piso 10\n✅ Cocheras disponibles: $3.500 a $4.000\n✅ Garantías: aseguradoras\n✅ Contrato mínimo 2 años";
    expect(captionAmounts(soho)).toMatchObject({ price: 34700, commonExpenses: 5400, ambiguous: false });
    const blanqueada = "🔑 BAJÓ DE PRECIO · EN ALQUILER · La Blanqueada\n🛏️ 3 dormitorios\n🚗 Lugar no fijo en el edificio por menos de $2000\n📍 Rep. Dominicana y Centenario\n💵 $38.500+ $4.500 de gastos comunes\n🛡 Garantías: Anda o Contaduría";
    expect(captionAmounts(blanqueada)).toMatchObject({ price: 38500, commonExpenses: 4500, ambiguous: false });
  });

  // The label sits in the title, too far from the amounts to name one of them.
  const TITLE = "Alquiler en Pocitos, 2 dormitorios, luminoso y con balcón\n";

  it("still abstains when two amounts could both be the rent, or they are in two currencies", () => {
    expect(captionAmounts(`${TITLE}$24.000\n$25.000`).ambiguous).toBe(true);
    expect(captionAmounts(`${TITLE}$25.000\nTambién en venta U$S 95.000`).ambiguous).toBe(true);
    // A drop in price names both: which one is today's is not for us to guess.
    expect(captionAmounts(`${TITLE}Antes $30.000\nAhora $27.000`).ambiguous).toBe(true);
  });

  it("never takes a yearly total for the monthly rent", () => {
    expect(captionAmounts(`${TITLE}$28.000\n($336.000 anual)`)).toMatchObject({ price: 28000, ambiguous: false });
    expect(captionAmounts(`${TITLE}$45.000\n$540.000 al año`)).toMatchObject({ price: 45000, ambiguous: false });
  });
});
