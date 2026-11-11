import { describe, expect, it } from "vitest";
import { AIService } from "../classes/ai_service";

// El resumen que lee la IA (blog, newsletter, bots) usa la misma regla con la que el sitio corona el
// mejor precio (classes/market_outlier.ts). El 2026-11-11 su "venta mínima" del dólar era una pizarra
// quieta desde julio a 39,55, y la IA la recomendaba.
const casas = Array.from({ length: 12 }, (_, i) => ({
  origin: `casa_${i}`,
  code: "USD",
  type: "",
  name: "Dólar",
  buy: 39 + i * 0.01,
  sell: 41 + i * 0.01,
}));
const ROWS = [
  ...casas,
  { origin: "baluma_cambio", code: "USD", type: "", name: "Dólar", buy: 37.15, sell: 39.55 },
  // Una casa de spread angosto: su venta es la más barata y real; su compra no es un precio.
  { origin: "narrow", code: "USD", type: "", name: "Dólar", buy: 40.8, sell: 40.9 },
  // Su canal digital, juzgado contra las pizarras de mostrador.
  { origin: "narrow", code: "USD", type: "EBROU", name: "Dólar", buy: 39.05, sell: 40.95 },
];

describe("AIService.buildPrompt no le pasa a la IA un precio fuera de mercado", () => {
  const prompt = (new AIService() as any).buildPrompt({ type: "best_rates", language: "es", currency: "USD" }, ROWS) as string;
  const line = (label: RegExp) => prompt.split("\n").find((l) => label.test(l)) ?? "";

  it("la venta mínima y la lista de mejores ventas no traen la pizarra congelada", () => {
    expect(prompt).not.toContain("39.55");
    expect(prompt).not.toContain("39,55");
    expect(prompt).toContain("Narrow(40.9");
  });

  it("la mejor compra no es la compra demasiado generosa, y el spread más bajo tampoco", () => {
    expect(prompt).not.toMatch(/Narrow\(40\.8\b/);
    expect(prompt).toContain("Casa 11(39.11");
    expect(line(/spread/i)).not.toMatch(/Narrow\(0\.1\b/);
  });

  it("deja el canal digital de la misma casa, que sí es un precio", () => {
    expect(prompt).toContain("Narrow(40.95");
  });
});
