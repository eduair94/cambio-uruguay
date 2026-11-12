// La fusión diaria del directorio de armadores: qué se conserva cuando una fuente no corrió,
// cuándo vence una fila, cómo se unen Google y el relevamiento editorial, y la guarda que impide
// que una corrida flaca pise un buen snapshot.
import { describe, expect, it } from "vitest";
import { mergeEntries, snapshotIsThin } from "../../classes/armadores/build";
import { blankEntry } from "../../classes/armadores/entry";
import type { ArmadorEntry, ArmadorSource } from "../../classes/armadores/types";

const NOW = new Date("2026-11-11T18:05:00Z");
const DAY = "2026-11-11";

function row(id: string, source: ArmadorSource, over: Partial<ArmadorEntry> = {}): ArmadorEntry {
  const kind = source === "editorial" ? "empresa" : source === "google" ? "empresa" : "aviso";
  return { ...blankEntry({ id, source, kind, name: over.name ?? id, url: `https://x/${id}` }, over.lastSeen ?? DAY), ...over };
}

const none = { editorial: [], google: null, facebook: null, mercadolibre: null };

describe("mergeEntries", () => {
  it("conserva las filas de una fuente que no corrió (Facebook sin sesión no borra nada)", () => {
    const previous = [row("fb:1", "facebook", { lastSeen: "2026-11-10", firstSeen: "2026-11-01" })];
    const merged = mergeEntries(previous, none, NOW);
    expect(merged.map(e => [e.id, e.firstSeen, e.lastSeen])).toEqual([["fb:1", "2026-11-01", "2026-11-10"]]);
  });

  it("renueva lastSeen de lo visto hoy y conserva firstSeen", () => {
    const previous = [row("fb:1", "facebook", { lastSeen: "2026-11-05", firstSeen: "2026-11-01" })];
    const merged = mergeEntries(previous, { ...none, facebook: [row("fb:1", "facebook")] }, NOW);
    expect(merged[0]).toMatchObject({ firstSeen: "2026-11-01", lastSeen: DAY });
  });

  it("vence un aviso a los 14 días sin verse y un negocio de Google a los 30", () => {
    const previous = [
      row("fb:old", "facebook", { lastSeen: "2026-10-27" }),
      row("fb:ok", "facebook", { lastSeen: "2026-10-29" }),
      row("g:old", "google", { lastSeen: "2026-10-11" }),
      row("g:ok", "google", { lastSeen: "2026-10-13" }),
    ];
    const merged = mergeEntries(previous, { ...none, facebook: [], google: [] }, NOW);
    expect(merged.map(e => e.id).sort()).toEqual(["fb:ok", "g:ok"]);
  });

  it("une un negocio de Google con su prestador editorial por nombre y le pasa la puntuación", () => {
    const editorial = [row("ed:armado-fast", "editorial", { name: "Armado FAST" })];
    const google = [row("g:abc", "google", {
      name: "Armado FAST - Armadores de Muebles Montevideo",
      placeId: "abc",
      rating: { value: 5, count: 459, observedAt: DAY },
      base: { barrio: "Cordón", zone: "centro", department: "Montevideo", basis: "coordinates" },
    })];
    const merged = mergeEntries([], { ...none, editorial, google }, NOW);
    expect(merged.map(e => e.id)).toEqual(["ed:armado-fast"]);
    expect(merged[0]).toMatchObject({ placeId: "abc", rating: { count: 459 }, base: { barrio: "Cordón", basis: "coordinates" } });
  });

  it("une por place id aunque los nombres no se parezcan", () => {
    const editorial = [row("ed:x", "editorial", { name: "Servicio X", placeId: "p9" })];
    const google = [row("g:p9", "google", { name: "Armados Ya 2022", placeId: "p9" })];
    expect(mergeEntries([], { ...none, editorial, google }, NOW).map(e => e.id)).toEqual(["ed:x"]);
  });

  it("no une nombres genéricos («Armador de muebles») con un prestador", () => {
    const editorial = [row("ed:armador-de-muebles-el-rey", "editorial", { name: "Armador de muebles el Rey" })];
    const google = [row("g:q", "google", { name: "Armador de muebles", placeId: "q" })];
    expect(mergeEntries([], { ...none, editorial, google }, NOW).map(e => e.id).sort()).toEqual(["ed:armador-de-muebles-el-rey", "g:q"]);
  });

  it("colapsa el mismo aviso de Facebook publicado dos veces (título y precio iguales)", () => {
    const price = (amount: number) => [{ item: null, label: "Precio del aviso", amount, amountMax: null, currency: "UYU" as const, kind: "ad" as const, conditions: null, sourceUrl: "u", observedAt: DAY, origin: "ad-card" as const }];
    const facebook = [
      row("fb:1", "facebook", { name: "Armador de muebles en todo Montevideo", prices: price(450) }),
      row("fb:2", "facebook", { name: "ARMADOR DE MUEBLES EN TODO MONTEVIDEO", prices: price(450) }),
      row("fb:3", "facebook", { name: "Armador de muebles en todo Montevideo", prices: price(600) }),
    ];
    expect(mergeEntries([], { ...none, facebook }, NOW).map(e => e.id)).toEqual(["fb:1", "fb:3"]);
  });
});

describe("snapshotIsThin", () => {
  const many = (n: number, source: ArmadorSource) => Array.from({ length: n }, (_, i) => row(`${source}:${i}`, source));
  it("rechaza una corrida con menos de la mitad de las filas no editoriales", () => {
    expect(snapshotIsThin(many(9, "facebook"), many(20, "facebook"))).toMatch(/9.*20/);
    expect(snapshotIsThin(many(10, "facebook"), many(20, "facebook"))).toBeNull();
  });
  it("no juzga contra un snapshot chico ni cuenta lo editorial", () => {
    expect(snapshotIsThin(many(1, "facebook"), many(19, "facebook"))).toBeNull();
    expect(snapshotIsThin([...many(30, "editorial"), ...many(5, "google")], many(25, "google"))).toMatch(/5/);
  });
});
