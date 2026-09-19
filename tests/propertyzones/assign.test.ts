import { describe, expect, it } from "vitest";
import { buildZoneAssigner, type ListingLocation } from "../../classes/propertyzones/assign";
import { loadOfficialPropertyZoneGeometry } from "../../classes/propertyzones/sources";
import { uteLocalities } from "../../classes/utilities/power/zones";

const ine = loadOfficialPropertyZoneGeometry().zones;
const localities = uteLocalities();
let seq = 0;
const listing = (extra: Partial<ListingLocation>): ListingLocation => ({
  id: `p${seq++}`, department: "Montevideo", neighborhood: "", latitude: null, longitude: null, ...extra,
});
// Distinct points inside Parque Batlle, Villa Dolores (INE 10) and Pocitos (INE 8).
const batlle = (i: number) => ({ latitude: -34.896 - i * 0.0002, longitude: -56.158 - i * 0.0001 });
const pocitos = (i: number) => ({ latitude: -34.9105 - i * 0.0001, longitude: -56.15 - i * 0.0001 });

describe("buildZoneAssigner", () => {
  it("places a listing by its own coordinate first", () => {
    const row = listing({ neighborhood: "Cualquier nombre", ...pocitos(0) });
    const { assign } = buildZoneAssigner({ ine, localities, rows: [row] });
    expect(assign(row)).toEqual({ zone: "mvd:8", name: "Pocitos", department: "Montevideo", evidence: "coordinate" });
  });

  it("ignores a point shared by five properties: that is a centroid, not an address", () => {
    const rows = Array.from({ length: 5 }, () => listing({ neighborhood: "Nombre raro", ...pocitos(0) }));
    const { assign } = buildZoneAssigner({ ine, localities, rows });
    expect(assign(rows[0])).toBeNull();
  });

  it("matches official spellings of the same department, accents and case aside", () => {
    const rows = [listing({ neighborhood: "MALVIN" }), listing({ neighborhood: "Capurro Bella Vista" }),
      listing({ neighborhood: "Pque. Batlle, V. Dolores" }), listing({ department: "Canelones", neighborhood: "Malvín" })];
    const { assign } = buildZoneAssigner({ ine, localities, rows });
    expect(assign(rows[0])).toMatchObject({ zone: "mvd:11", evidence: "name" });
    expect(assign(rows[1])).toMatchObject({ zone: "mvd:40", name: "Capurro, Bella Vista" });
    expect(assign(rows[2])?.zone).toBe("mvd:10");
    expect(assign(rows[3])).toBeNull();
  });

  it("learns an alias only when the geolocated listings agree", () => {
    const agree = [
      ...Array.from({ length: 11 }, (_, i) => listing({ neighborhood: "Parque Batlle", ...batlle(i) })),
      listing({ neighborhood: "Parque Batlle", ...pocitos(3) }),
    ];
    const split = Array.from({ length: 12 }, (_, i) => listing({ neighborhood: "Zona dividida", ...(i % 2 ? batlle(20 + i) : pocitos(20 + i)) }));
    const few = Array.from({ length: 9 }, (_, i) => listing({ neighborhood: "Poquitos", ...batlle(40 + i) }));
    const { assign, aliases } = buildZoneAssigner({ ine, localities, rows: [...agree, ...split, ...few] });
    expect(aliases["montevideo|parque batlle"]).toEqual({ zone: "mvd:10", n: 12, share: 0.917 });
    expect(assign(listing({ neighborhood: "PARQUE BATLLE" }))).toMatchObject({ zone: "mvd:10", evidence: "alias" });
    expect(assign(listing({ neighborhood: "Zona dividida" }))).toBeNull();
    expect(assign(listing({ neighborhood: "Poquitos" }))).toBeNull();
  });

  it("uses UTE urban areas and names in the interior, never across departments", () => {
    const pde = listing({ department: "Maldonado", neighborhood: "Península", latitude: -34.962, longitude: -54.945 });
    const byName = listing({ department: "Maldonado", neighborhood: "Punta del Este" });
    const byLocality = listing({ department: "Maldonado", neighborhood: "Otro", locality: "Maldonado" });
    const wrongDepartment = listing({ department: "Canelones", neighborhood: "x", latitude: -34.962, longitude: -54.945 });
    const { assign } = buildZoneAssigner({ ine, localities, rows: [pde, byName, byLocality, wrongDepartment] });
    expect(assign(pde)).toMatchObject({ zone: "ute:3210", name: "Punta Del Este", department: "Maldonado", evidence: "coordinate" });
    expect(assign(byName)).toMatchObject({ zone: "ute:3210", evidence: "name" });
    expect(assign(byLocality)).toMatchObject({ zone: "ute:3205", evidence: "name" });
    expect(assign(wrongDepartment)).toBeNull();
  });

  it("falls back to the name when a Montevideo point lies outside every barrio", () => {
    const row = listing({ neighborhood: "Cordón", latitude: -34.5, longitude: -55 });
    expect(buildZoneAssigner({ ine, localities, rows: [row] }).assign(row)).toMatchObject({ zone: "mvd:4", evidence: "name" });
  });
});
