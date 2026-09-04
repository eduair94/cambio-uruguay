// La guarda que faltaba: la pizarra que no se rompió, se quedó quieta.
//
// Las tres que ya existen miran otra cosa. `rate_plausibility` mira compra > venta por fila.
// `rate_audit` mira la banda contra las otras casas. `/estado` mira que la fila sea de HOY. Un
// origen que publica todos los días el mismo número pasa las tres: escribe fila fresca, con compra
// menor que venta, y a cuatro por ciento de la mediana.
//
// El caso real es baluma_cambio: 37,15 / 39,55 desde el 2026-07-09, servido por un HTTP 200 de
// 8.449 bytes bajo el título "Cotizaciones del día". El scraper anda; el que se congeló es el
// origen. Y el daño no es pasivo: el mercado se mueve y la pizarra no, así que deriva al extremo de
// la distribución, y como el sitio ordena por "más barato", la sube al titular. Cuanto más vieja,
// más destacada. Por eso `extreme` es parte del veredicto y no un adorno.
import { describe, expect, it } from "vitest";
import { findFrozenQuotes, frozenSeverity } from "../classes/rate_staleness";
import type { StalenessRow } from "../classes/rate_staleness";

const day = (d: string) => new Date(`${d}T03:00:00.000Z`);

/** Una serie diaria con el mismo precio todos los días. */
function flat(origin: string, from: string, days: number, buy: number, sell: number): StalenessRow[] {
  const start = day(from).getTime();
  return Array.from({ length: days }, (_, i) => ({
    origin,
    code: "USD",
    type: "",
    buy,
    sell,
    date: new Date(start + i * 864e5),
  }));
}

/** Una serie que se mueve un centésimo por día. */
function moving(origin: string, from: string, days: number, buy: number, sell: number): StalenessRow[] {
  return flat(origin, from, days, buy, sell).map((r, i) => ({ ...r, buy: r.buy + i * 0.01, sell: r.sell + i * 0.01 }));
}

const TODAY = day("2026-09-04");

describe("findFrozenQuotes", () => {
  it("encuentra la pizarra que no se mueve y dice desde cuándo", () => {
    const rows = [...moving("brou", "2026-08-01", 35, 39.05, 41.45), ...flat("baluma_cambio", "2026-08-01", 35, 37.15, 39.55)];
    const frozen = findFrozenQuotes(rows, { today: TODAY, minDays: 7 });

    expect(frozen.map(f => f.origin)).toEqual(["baluma_cambio"]);
    expect(frozen[0].daysFrozen).toBe(34);
    // Toda la ventana está quieta: no sabemos cuándo empezó, sólo que es AL MENOS esto.
    expect(frozen[0].capped).toBe(true);
  });

  it("cuenta desde el último cambio real, no desde el principio de la ventana", () => {
    const rows = [
      ...moving("cambio_x", "2026-08-01", 10, 41.0, 41.2), // se movió hasta el 10/08
      ...flat("cambio_x", "2026-08-11", 25, 41.5, 41.7), // saltó el 11/08 y ahí se quedó
    ];
    const [frozen] = findFrozenQuotes(rows, { today: TODAY, minDays: 7 });

    expect(frozen.daysFrozen).toBe(24);
    expect(frozen.capped).toBe(false);
    expect(frozen.lastChangedAt).toEqual(day("2026-08-11"));
  });

  it("no denuncia a la que se movió ayer", () => {
    const rows = [...flat("cambio_y", "2026-08-01", 34, 41.4, 41.6), ...flat("cambio_y", "2026-09-04", 1, 41.45, 41.65)];
    expect(findFrozenQuotes(rows, { today: TODAY, minDays: 7 })).toEqual([]);
  });

  it("mide en días de calendario y no en cantidad de puntos, porque hay días que faltan", () => {
    // Ocho días de ventana con sólo tres muestras: si contara puntos diría 2 y no 7.
    const rows: StalenessRow[] = [
      { origin: "cambio_z", code: "USD", type: "", buy: 40, sell: 41, date: day("2026-08-28") },
      { origin: "cambio_z", code: "USD", type: "", buy: 40, sell: 41, date: day("2026-08-31") },
      { origin: "cambio_z", code: "USD", type: "", buy: 40, sell: 41, date: day("2026-09-04") },
    ];
    const [frozen] = findFrozenQuotes(rows, { today: TODAY, minDays: 7 });
    expect(frozen.daysFrozen).toBe(7);
  });

  it("se calla con una sola muestra: eso no es una pizarra quieta, es una serie corta", () => {
    const rows: StalenessRow[] = [{ origin: "nueva", code: "USD", type: "", buy: 40, sell: 41, date: TODAY }];
    expect(findFrozenQuotes(rows, { today: TODAY, minDays: 7 })).toEqual([]);
  });

  it("separa cotización por moneda y por tipo: el eBROU puede moverse mientras el mostrador duerme", () => {
    const rows: StalenessRow[] = [
      ...flat("brou", "2026-08-01", 35, 39.05, 41.45),
      ...moving("brou", "2026-08-01", 35, 39.55, 40.95).map(r => ({ ...r, type: "EBROU" })),
    ];
    const frozen = findFrozenQuotes(rows, { today: TODAY, minDays: 7 });
    expect(frozen).toHaveLength(1);
    expect(frozen[0].type).toBe("");
  });

  it("marca `extreme` cuando la pizarra quieta es la punta de su grupo — que es el daño real", () => {
    const rows = [
      ...moving("brou", "2026-08-01", 35, 39.05, 41.45),
      ...moving("itau", "2026-08-01", 35, 39.2, 41.5),
      ...flat("baluma_cambio", "2026-08-01", 35, 37.15, 39.55), // la venta más barata del grupo
    ];
    const [frozen] = findFrozenQuotes(rows, { today: TODAY, minDays: 7 });
    expect(frozen.origin).toBe("baluma_cambio");
    expect(frozen.extreme).toBe("min-sell");
  });

  it("una pizarra quieta en el medio del pelotón no es extremo: molesta menos y se reporta distinto", () => {
    const rows = [
      ...moving("barata", "2026-08-01", 35, 38, 40.0),
      ...flat("delmedio", "2026-08-01", 35, 39.5, 41.4),
      ...moving("cara", "2026-08-01", 35, 40, 42.5),
    ];
    const [frozen] = findFrozenQuotes(rows, { today: TODAY, minDays: 7 });
    expect(frozen.origin).toBe("delmedio");
    expect(frozen.extreme).toBeNull();
  });

  it("no lanza con una lista vacía: esta guarda nunca puede romper el scrape", () => {
    expect(findFrozenQuotes([], { today: TODAY, minDays: 7 })).toEqual([]);
  });

  it("ignora filas sin precio en vez de contarlas como un cambio", () => {
    const rows: StalenessRow[] = [
      ...flat("parcial", "2026-08-01", 20, 40, 41),
      { origin: "parcial", code: "USD", type: "", buy: null as any, sell: null as any, date: day("2026-08-21") },
      ...flat("parcial", "2026-08-22", 14, 40, 41),
    ];
    const [frozen] = findFrozenQuotes(rows, { today: TODAY, minDays: 7 });
    expect(frozen.daysFrozen).toBe(34);
  });
});

describe("frozenSeverity", () => {
  it("escala con los días, y el extremo pesa porque es el que se publica como titular", () => {
    expect(frozenSeverity({ daysFrozen: 8, extreme: null })).toBe("aviso");
    expect(frozenSeverity({ daysFrozen: 40, extreme: null })).toBe("grave");
    // Ocho días alcanzan para ser grave si además está encabezando el ranking.
    expect(frozenSeverity({ daysFrozen: 8, extreme: "min-sell" })).toBe("grave");
  });

  it("por debajo del umbral no hay veredicto", () => {
    expect(frozenSeverity({ daysFrozen: 3, extreme: "min-sell" })).toBeNull();
  });
});
