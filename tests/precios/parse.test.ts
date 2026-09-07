import { describe, expect, it } from "vitest";
import { parsePrice, parseSourceDay, parseUnit, rejectionReason } from "../../classes/precios/parse";

describe("parsePrice", () => {
  it("lee el formato del SIPC", () => {
    expect(parsePrice("$92.0")).toBe(92);
    expect(parsePrice("$1099.99")).toBe(1099.99);
  });

  it("rechaza el precio imputado, que es la trampa central de esta fuente", () => {
    // Medido 2026-09-07: compararCanasta devuelve el mismo "$509.32 (*)" en 722
    // de 722 locales para un articulo con 28 observaciones reales.
    expect(parsePrice("$509.32 (*)")).toBeNull();
  });

  it("rechaza lo que no es un precio", () => {
    expect(parsePrice("N")).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice("$0")).toBeNull();
    expect(parsePrice("$-5")).toBeNull();
  });
});

describe("parseSourceDay", () => {
  it("convierte dd/mm/yy a ISO", () => {
    expect(parseSourceDay("06/09/26")).toBe("2026-09-06");
    expect(parseSourceDay("31/12/25")).toBe("2025-12-31");
  });

  it("devuelve null cuando la fila no trae fecha", () => {
    expect(parseSourceDay("")).toBeNull();
    expect(parseSourceDay(undefined)).toBeNull();
    expect(parseSourceDay("06/13/26")).toBeNull();
  });
});

describe("parseUnit", () => {
  it("lee la unidad del catalogo", () => {
    expect(parseUnit(" 900.0 Mililitros")).toEqual({ qty: 900, unit: "ml" });
    expect(parseUnit(" 1.0 Kilogramo")).toEqual({ qty: 1, unit: "kg" });
    expect(parseUnit(" 500.0 gramos")).toEqual({ qty: 500, unit: "g" });
    expect(parseUnit(" 1.0 Unidad")).toEqual({ qty: 1, unit: "un" });
  });

  it("no adivina lo que no entiende", () => {
    expect(parseUnit("")).toEqual({ qty: null, unit: null });
    expect(parseUnit(" 8 unidades por caja de carton")).toEqual({ qty: 8, unit: "un" });
  });
});

describe("rejectionReason", () => {
  const row = {
    id: 1,
    precio: "$92.0",
    fecha: "06/09/26",
    name: "X",
    direccion: "Y",
    x: -34.8,
    y: -56.1,
    localidad: "Montevideo, MONTEVIDEO ",
  };

  it("acepta una observacion real", () => {
    expect(rejectionReason(row as any)).toBeNull();
  });

  it("rechaza precio imputado y fila sin fecha, con el motivo dicho", () => {
    expect(rejectionReason({ ...row, precio: "$509.32 (*)" } as any)).toMatch(/imputad/i);
    expect(rejectionReason({ ...row, fecha: "" } as any)).toMatch(/fecha/i);
  });
});
