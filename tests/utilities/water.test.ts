import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { oseResultCount, parseOseList } from "../../classes/utilities/water/parse";
import { ineCodesInText } from "../../classes/utilities/water/match";

const html = readFileSync(join(__dirname, "fixtures", "ose_list.html"), "utf8");

describe("OSE list parser", () => {
  it("reads every field of a real page", () => {
    const notices = parseOseList(html);
    expect(notices).toHaveLength(4);
    expect(notices[0]).toMatchObject({
      id: "afectacion-del-normal-suministro-de-agua-potable-13568", department: "Paysandú", locality: "PAYSANDU",
      publishedAt: "2026-09-18T17:59:33.000Z", from: "2026-09-22T12:00:00.000Z", to: "2026-09-22T16:00:00.000Z",
      startEstimated: false,
    });
    expect(notices[0].zoneText).toMatch(/^Proyectada 100 desde Rep\. Panamá/);
    expect(notices[1]).toMatchObject({ department: "Montevideo", zoneText: "Maroñas, Parque Guaraní" });
    expect(notices[2]).toMatchObject({ department: "Rocha", locality: "LASCANO" });
    expect(notices[2].reason).toMatch(/^Trabajos de empalme/);
  });

  it("dates an emergency notice from its publication when only the end is announced", () => {
    const emergency = parseOseList(html)[3];
    expect(emergency).toMatchObject({ startEstimated: true, from: "2024-11-22T20:22:00.000Z", to: "2024-11-22T23:00:00.000Z" });
  });

  it("reads the result count and returns nothing for a page without notices", () => {
    expect(oseResultCount(html)).toBe(11363);
    expect(parseOseList("<html>otra cosa</html>")).toEqual([]);
    expect(oseResultCount("<html></html>")).toBeNull();
  });
});

describe("OSE barrio matcher", () => {
  it("assigns explicit barrio names", () => {
    expect(ineCodesInText("Maroñas, Parque Guaraní")).toEqual(["17"]);
    expect(ineCodesInText("Barrio Sur\nentre las calles- Convención, Rambla Sur, La Cumparsita")).toEqual(["3"]);
    expect(ineCodesInText("Cerro, Tres Ombúes y La Teja desde Grecia y Av. Carlos María Ramírez al sur")).toEqual(["35", "38", "56"]);
    expect(ineCodesInText("Unión\nEntre calles Pan de Azúcar, Avellaneda")).toEqual(["23"]);
  });

  it("prefers the longer name", () => {
    expect(ineCodesInText("Malvín Norte")).toEqual(["12"]);
    expect(ineCodesInText("Flor de Maroñas")).toEqual(["18"]);
    expect(ineCodesInText("Carrasco Norte y Carrasco")).toEqual(["14", "15"]);
    expect(ineCodesInText("Villa García, Manga Rural")).toEqual(["61"]);
  });

  it("never reads streets as barrios", () => {
    expect(ineCodesInText("Cno. Carrasco y Av. Italia")).toEqual([]);
    expect(ineCodesInText("Ramos, Solano López, Rivera y José Batlle y Ordóñez")).toEqual([]);
    expect(ineCodesInText("en calles Dr. Isabelino Bosch entre Somme y Avda. Ing. Luis Ponce")).toEqual([]);
    expect(ineCodesInText("Colón | en calles Avda. Lezica, Eduardo Raíz")).toEqual([]);
    expect(ineCodesInText("Barrios Colón y Lezica, en calles Cno. Aymará, Av. César Mayo Gutiérrez")).toEqual(["60"]);
  });

  it("keeps an explicit 'barrio' mention even inside a street clause", () => {
    expect(ineCodesInText("Camino Casavalle, Garzón, La Vía (Barrio Peñarol)")).toEqual(["34"]);
    expect(ineCodesInText("Barrio Belvedere en calles Tomás Texera entre Garzón")).toEqual(["54"]);
  });

  it("does not assign a name that spans two INE barrios", () => {
    expect(ineCodesInText("Barrio Colón")).toEqual([]);
  });
});
