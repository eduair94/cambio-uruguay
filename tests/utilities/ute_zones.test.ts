import { describe, expect, it } from "vitest";
import { publicZoneForEcse, uteBarrioToIne, uteLocalities } from "../../classes/utilities/power/zones";

const DEPARTMENTS = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
  "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó",
  "Treinta y Tres"];

describe("UTE zones pinned against INE", () => {
  it("covers every INE barrio exactly through the 63 UTE barrios", () => {
    const codes = Object.values(uteBarrioToIne);
    expect(codes).toHaveLength(63);
    expect(new Set(codes)).toEqual(new Set(Array.from({ length: 62 }, (_, i) => String(i + 1))));
    expect(uteBarrioToIne.PU).toBe("1");
    expect(uteBarrioToIne.CJ).toBe("1");
    expect(uteBarrioToIne.PB).toBe("10");
  });

  it("gives every interior locality a department and its own UTE outline", () => {
    const localities = uteLocalities();
    expect(localities.length).toBeGreaterThanOrEqual(80);
    for (const locality of localities) {
      expect(DEPARTMENTS).toContain(locality.department);
      expect(locality.department).not.toBe("Montevideo");
      expect(locality.geometry?.type).toMatch(/Polygon/);
    }
    expect(localities.find(item => item.id === "3210")).toMatchObject({ name: "Punta Del Este", department: "Maldonado" });
    expect(localities.find(item => item.id === "4304")?.department).toBe("Colonia");
  });

  it("names public zones for barrios and localities, never for departments", () => {
    expect(publicZoneForEcse("b:PO")).toBe("mvd:8");
    expect(publicZoneForEcse("b:PU")).toBe("mvd:1");
    expect(publicZoneForEcse("l:3210")).toBe("ute:3210");
    expect(publicZoneForEcse("d:1")).toBeNull();
    expect(publicZoneForEcse("b:XX")).toBeNull();
  });
});
