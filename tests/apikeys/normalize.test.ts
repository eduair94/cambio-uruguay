import { describe, expect, it } from "vitest";
import { meterRoute, meterUserAgent } from "../../classes/apikeys/normalize";

describe("ruta del medidor", () => {
  it("toma los dos primeros segmentos en minúsculas", () => {
    expect(meterRoute("/exchange/La_Favorita/USD", 200)).toBe("/exchange/la_favorita");
    expect(meterRoute("/", 200)).toBe("/");
    expect(meterRoute("/regional?x=1", 200)).toBe("/regional");
  });

  it("colapsa dígitos para que una fecha no abra una fila por día", () => {
    expect(meterRoute("/evolution/2026-09-01", 200)).toBe("/evolution/0-0-0");
  });

  it("un 404 y un 429 no inflan la tabla con rutas de escáneres", () => {
    expect(meterRoute("/.env", 404)).toBe("(no-encontrada)");
    expect(meterRoute("/exchange/brou", 429)).toBe("(limitada)");
  });

  it("nunca deja pasar el separador del campo ni espacios", () => {
    expect(meterRoute("/a|b/c d", 200)).toBe("/a_b/c_d");
    expect(meterRoute("/%E0%A4%A", 200)).toBe("/%e0%a0%a");
  });

  it("recorta a 60 caracteres", () => {
    expect(meterRoute(`/${"x".repeat(200)}`, 200).length).toBe(60);
  });
});

describe("User-Agent del medidor", () => {
  it("sanea el separador y los saltos de línea y recorta a 120", () => {
    expect(meterUserAgent("Panel|v1\r\nX")).toBe("Panel v1  X");
    expect(meterUserAgent("a".repeat(300)).length).toBe(120);
  });

  it("nombra la ausencia en vez de dejar un campo vacío", () => {
    expect(meterUserAgent(undefined)).toBe("(sin user-agent)");
    expect(meterUserAgent("   ")).toBe("(sin user-agent)");
    expect(meterUserAgent(["Uno", "Dos"])).toBe("Uno");
  });
});
