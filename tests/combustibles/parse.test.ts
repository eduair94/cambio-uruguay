import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseAncapHistory } from "../../classes/combustibles/parse";

const html = fs.readFileSync(path.join(__dirname, "fixtures", "ancap-historico-2026-09-15.html"), "utf8");

describe("parseAncapHistory", () => {
  const rows = parseAncapHistory(html);

  it("lee las 53 vigencias de la primera tabla y las ordena ascendente", () => {
    expect(rows).toHaveLength(53);
    expect(rows[0].from).toBe("2021-07-01");
    expect(rows[rows.length - 1].from).toBe("2026-09-01");
  });

  it("convierte la coma decimal y respeta las columnas", () => {
    expect(rows[0]).toEqual({ from: "2021-07-01", super95: 65.81, premium97: 67.74, gasoil50s: 45.7, gasoil10s: 67.87, queroseno: 44.95, supergas: 56.16 });
    const last = rows[rows.length - 1];
    expect(last.super95).toBe(88.67);
    expect(last.premium97).toBe(91.19);
    expect(last.gasoil50s).toBe(58.68);
    expect(last.supergas).toBe(93.56);
  });

  it("ignora la tabla vieja de 9 celdas y devuelve null en celdas vacías", () => {
    expect(rows.some((r) => r.from.startsWith("1974"))).toBe(false);
    const withBlank = parseAncapHistory(
      "<table><tr><td>01/03/2024</td><td>70,00</td><td></td><td>50,00</td><td>55,00</td><td>50,00</td><td>80,00</td></tr></table>"
    );
    expect(withBlank).toEqual([{ from: "2024-03-01", super95: 70, premium97: null, gasoil50s: 50, gasoil10s: 55, queroseno: 50, supergas: 80 }]);
  });

  it("devuelve [] sin tabla", () => {
    expect(parseAncapHistory("<html></html>")).toEqual([]);
  });
});
