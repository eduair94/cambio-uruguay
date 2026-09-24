import { describe, expect, it } from "vitest";
import { isPlaceholderPrice } from "../../classes/pricehistory/placeholder";

describe("isPlaceholderPrice", () => {
  // Medido el 2026-09-24 en los tres historiales: 11.111 encabezaba los cambios de alquiler
  // ("11.111 -> 29.000, +161 %"), y 1.111.111 era el Tiggo 8 que abrió la guarda de 5x.
  it("unos repetidos y la secuencia 12345 son relleno", () => {
    for (const price of [1111, 11111, 111111, 1111111, 11111111, 12345, 123456, 1234567]) expect(isPlaceholderPrice(price)).toBe(true);
  });
  it("los nueves, los dígitos repetidos de precios reales y 1234 son precios", () => {
    // $ 9.999 y US$ 9.999 son precios psicológicos reales; sillas a $ 2.222 hay (4 avisos, medido);
    // 1.234 -> 1.299 en equipar es un repreciado plausible.
    for (const price of [9999, 99999, 999999, 2222, 33333, 1234, 111, 11110, 11112, 1111.5, 0, -1111]) expect(isPlaceholderPrice(price)).toBe(false);
  });
  it("lo que no es un número finito no es relleno (lo descartan otras reglas)", () => {
    expect(isPlaceholderPrice(Number.NaN)).toBe(false);
    expect(isPlaceholderPrice("11111" as unknown as number)).toBe(false);
  });
});
