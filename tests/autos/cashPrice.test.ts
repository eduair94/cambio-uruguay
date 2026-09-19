import { describe, expect, it } from "vitest";
import { priceBasisOf, readCashPrice } from "../../classes/autos/cashPrice";
import type { CarPricePoint } from "../../classes/autos/types";

const point = (price: number, observedAt = "2026-09-10T00:00:00.000Z"): CarPricePoint => ({ price, currency: "USD", observedAt });

describe("which number is the car's price", () => {
  const hb20 = { title: "Hyundai Hb20 1.0 Comfort Mt", price: 8990, currency: "USD" as const };

  it("the stated cash price wins over a listed down payment", () => {
    expect(priceBasisOf(hb20, "US$12990 Contado\nUS$8990 y cuotas", [point(8990)])).toEqual({
      price: 12990, listedPrice: 8990, cashKnown: true, financing: false,
    });
  });

  it("…even when the advert was once listed at its cash price", () => {
    expect(priceBasisOf(hb20, "US$12990 Contado\nUS$8990 y cuotas", [point(12990), point(8990)]).price).toBe(12990);
  });

  it("a cash price the advert was listed at BEFORE a drop is an old description, not the price", () => {
    // "U$S12.900 contado U$S9.000 y cuotas" on an advert lowered from 12.900 to 12.300.
    const listing = { title: "Chevrolet Onix", price: 12300, currency: "USD" as const };
    expect(priceBasisOf(listing, "U$S12.900 contado U$S9.000 y cuotas a sola firma!", [point(12900), point(12300)])).toEqual({
      price: 12300, listedPrice: null, cashKnown: false, financing: false,
    });
  });

  it("a cash price equal to the listed one changes nothing, and settles it", () => {
    expect(priceBasisOf({ ...hb20, price: 10990 }, "U$S 10.990 CONTADO O U$S 5.500 Y FACILIDADES", [])).toEqual({
      price: 10990, listedPrice: null, cashKnown: true, financing: false,
    });
  });

  it("a listed down payment without a stated cash price leaves the price unknown", () => {
    expect(priceBasisOf({ ...hb20, price: 5000 }, "Retirá con U$S 5.000 y el saldo en cuotas", [])).toEqual({
      price: 5000, listedPrice: null, cashKnown: false, financing: true,
    });
  });

  it("reads the cash price from the title too", () => {
    expect(priceBasisOf({ title: "Onix 2019 U$S 12.990 contado", price: 6500, currency: "USD" }, "", []).price).toBe(12990);
  });

  it("no description, no change", () => {
    expect(priceBasisOf(hb20, null, [])).toEqual({ price: 8990, listedPrice: null, cashKnown: false, financing: false });
  });
});

// Every phrase below is copied from a live Mercado Libre advert (sample of 2026-09-19: 2,015 of the
// 10,515 active adverts with a description mention "contado").
describe("the cash price an advert states", () => {
  it("reads the cash price when the listed number is the down payment (MLU700552753)", () => {
    const text = "US$12990 Contado\nUS$8990 y cuotas\nHyundai New hb20\n1.0 nafta\nAño 2023";
    expect(readCashPrice(text, 8990, "USD")).toEqual({ cash: 12990, listedIsDownPayment: true, ambiguous: false });
  });

  it.each([
    ["Precio: 24.900usd contado", 24900, 24900],
    ["Precio: 17.990U$S contado", 17990, 17990],
    ["Valor cuota por pago en fecha: $ 6.917 Precio contado: USD 23.900 Aceptamos permutas.", 23900, 23900],
    ["PRECIO CONTADO U$S 28.900 RETIRA CON U$S 17.400 CONTACTO: 096 910 2", 28900, 28900],
    ["Precio contado U$S 6.900 Por precio con permuta CONSULTE!", 6900, 6900],
    ["ABS PRECIO CONTADO U$$ 11500 100 % FINANCIADO EN $ ( BANCO)", 11500, 11500],
    ["Al dia Contado 6.990 Dólares Retira con 4.000 Dolares y Facilidades", 6990, 6990],
    ["Kilómetros: 158.000 Contado USD 14.500 FINANCIACION Bancaria (hasta 100%)", 14500, 14500],
    ["PEUGEOT 208 ALLURE OPORTUNIDAD U$S 10.990 CONTADO O U$S 5.500 Y FACILIDADES", 10990, 10990],
    ["Auto en impecable estado, SUPER ECONÓMICO Precio contado: USD$12.990 FINANCIACIÓN DE LA CASA", 12990, 12990],
    ["Ideal para quienes buscan versatilidad. 16.500 contado 13.000 y cuotas a sola firma!!", 16500, 16500],
    ["USD 8.490 contado o posible permuta mayor o menor valor! CONSULTE!", 8490, 8490],
  ])("%s", (text, listed, cash) => {
    expect(readCashPrice(text, listed, "USD").cash).toBe(cash);
  });

  it("finds the cash price that is ABOVE the listed one (the false bargains)", () => {
    expect(readCashPrice("Patente: 6.700 Seguro: 17.600 PRECIO CONTADO U$S 5.900 RETIRA CON U$S 3.540 saldo hasta 36 coutas", 4900, "USD").cash).toBe(5900);
    expect(readCashPrice("Montevideo Maldonado 7773 COD Precio contado U$S 19.300 Por precio con permuta consulte", 16800, "USD").cash).toBe(19300);
    expect(readCashPrice("Código: 8094 Precio contado: USD 34.500 Precio con permuta: Consulte.", 32500, "USD").cash).toBe(34500);
  });

  it.each([
    // The yearly car tax, paid "contado" or in six instalments, in pesos.
    "El valor estimado de la Patente Anual Contado es de $ 38.019 o 6 Cuotas de $ 7.128. GARANTÍA",
    "PATENTE ANUAL CONTADO: $ 62.760 PATENTE EN CUOTAS: $ 11.768 HORARIO Lunes",
    "Patente anual: $ 7.016 pago contado o 6 cuotas de $ 1.316 Seguro contra terceros $ 13.00",
    "cuotas de $ 10.000 cada una o $57.900 anual con bonificación por pago contado.",
    // Percentages and the accountant.
    "Financiación 50% Contado - 50% hasta en 60 cuotas En dólares o en U.I. ($)",
    "Entregando el 50% contado del vehículo, te financiamos el saldo hasta en 36 cuotas",
    "Certificado de ingresos por contador público - Última factura de UTE",
    // Words, no amount.
    "aceptando permutas y financiación, donde tú siempre cobras contado. AMPLIO STOCK DE 0 KM",
    "CONSULTE POR CONTADO VENTA • PERMUTA • FINANCIACIÓN",
  ])("ignores what is not the car's price: %s", text => {
    expect(readCashPrice(text, 12000, "USD").cash).toBeNull();
  });

  it("never takes a peso amount as the cash price of a car listed in dollars", () => {
    expect(readCashPrice("Precio contado $ 450.000", 12000, "USD").cash).toBeNull();
  });

  it("reads a peso cash price for a car listed in pesos", () => {
    expect(readCashPrice("Precio contado $ 520.000, entrega $ 300.000 y cuotas", 300000, "UYU")).toEqual({
      cash: 520000, listedIsDownPayment: true, ambiguous: false,
    });
  });

  it("ignores an amount that cannot be this car's price", () => {
    // 90 % below or 5x above the listed price is another number, not this car's cash price.
    expect(readCashPrice("Precio contado USD 1.500", 15000, "USD").cash).toBeNull();
    expect(readCashPrice("Precio contado USD 95.000", 15000, "USD").cash).toBeNull();
  });

  it("the same cash price written twice is one price", () => {
    expect(readCashPrice("Precio contado U$S 9.990. Contado USD 9990", 6000, "USD")).toEqual({
      cash: 9990, listedIsDownPayment: false, ambiguous: false,
    });
  });

  it("two different cash prices are ambiguous, and neither is used", () => {
    expect(readCashPrice("Precio contado U$S 9.990 ... precio contado U$S 11.500", 6000, "USD")).toEqual({
      cash: null, listedIsDownPayment: false, ambiguous: true,
    });
  });

  it("flags the listed number as a down payment even when no cash price is stated", () => {
    expect(readCashPrice("Retirá con U$S 5.000 y el saldo en cuotas", 5000, "USD")).toEqual({
      cash: null, listedIsDownPayment: true, ambiguous: false,
    });
    expect(readCashPrice("U$S 7.500 y facilidades a sola firma", 7500, "USD").listedIsDownPayment).toBe(true);
    expect(readCashPrice("Entrega de U$S 15.000 y saldo hasta en 36 cuotas", 15000, "USD").listedIsDownPayment).toBe(true);
  });

  it("a first instalment listed as the price is a down payment too", () => {
    expect(readCashPrice("Precio contado U$S 14.900. Primera cuota de U$S 2.500 y 35 cuotas en pesos", 2500, "USD")).toEqual({
      cash: 14900, listedIsDownPayment: true, ambiguous: false,
    });
    // The yearly car tax also has a "primera cuota", in pesos: never the price of a car listed in dollars.
    expect(readCashPrice("pago total dentro del plazo de la primera cuota: $ 36.891", 12000, "USD").listedIsDownPayment).toBe(false);
  });

  it("a down payment that is NOT the listed number says nothing about the listed price", () => {
    expect(readCashPrice("Entrega de U$S 5.000 y saldo en cuotas", 12990, "USD").listedIsDownPayment).toBe(false);
  });

  it("an empty or plain description reads nothing", () => {
    expect(readCashPrice("", 10000, "USD")).toEqual({ cash: null, listedIsDownPayment: false, ambiguous: false });
    expect(readCashPrice("Único dueño, service al día, 2019.", 10000, "USD").cash).toBeNull();
  });
});
