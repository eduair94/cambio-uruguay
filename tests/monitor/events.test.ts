import { describe, expect, it } from "vitest";
import { evaluate } from "../../classes/monitor/events";
import { emptyState, type LedgerChange, type MonitorConfig, type Quote } from "../../classes/monitor/types";

// Martes 29/9/2026, 11:05 en Montevideo (UTC-3) = 14:05 UTC.
const NOW = new Date("2026-09-29T14:05:00Z");
const min = (m: number) => new Date(NOW.getTime() - m * 60_000);

const config = (over: Partial<MonitorConfig> = {}): MonitorConfig => ({
  uid: "u1",
  email: "ana@casa.uy",
  ownOrigin: "propia",
  competitors: ["gales", "varlix", "aeromar"],
  currencies: ["USD"],
  alerts: { moves: true, position: true, quiet: true, daily: true },
  channels: { telegram: true, email: "daily" },
  active: true,
  trialStartedAt: min(60 * 24),
  ...over,
});

const quote = (origin: string, buy: number, sell: number, type = ""): Quote => ({ origin, code: "USD", type, buy, sell });
const quotesOf = (...list: Quote[]) => new Map([["USD", list]]);
const change = (origin: string, at: Date, prev: [number, number], next: [number, number], type = ""): LedgerChange => ({
  origin,
  code: "USD",
  type,
  previousBuy: prev[0],
  previousSell: prev[1],
  buy: next[0],
  sell: next[1],
  observedAt: at,
});

const stateAt = (cursor: Date) => ({ ...emptyState("u1", cursor) });

describe("movimientos de la competencia", () => {
  it("avisa el movimiento de un competidor colapsando varios cambios de la misma casa", () => {
    const { events } = evaluate({
      config: config(),
      state: stateAt(min(5)),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.3, 42.5)),
      changes: [change("gales", min(4), [40.1, 42.7], [40.2, 42.6]), change("gales", min(2), [40.2, 42.6], [40.3, 42.5])],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([
      { kind: "move", origin: "gales", code: "USD", fromBuy: 40.1, toBuy: 40.3, fromSell: 42.7, toSell: 42.5, at: min(2) },
    ]);
  });

  it("no avisa un cambio que la foto no publica (lo rechazó la guarda de plausibilidad)", () => {
    const { events } = evaluate({
      config: config(),
      state: stateAt(min(5)),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.1, 42.7)),
      changes: [change("gales", min(2), [40.1, 42.7], [401, 42.7])],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("no avisa lo que ya estaba antes del cursor, ni la casa propia, ni un tipo que no es el de la foto", () => {
    const { events } = evaluate({
      config: config(),
      state: stateAt(min(3)),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.2, 42.6), quote("gales", 40.2, 42.6), quote("varlix", 40.0, 42.9)),
      changes: [
        change("gales", min(4), [40.1, 42.6], [40.2, 42.6]),
        change("propia", min(2), [40.1, 42.6], [40.2, 42.6]),
        change("varlix", min(1), [40.1, 42.8], [40.0, 42.9], "EBROU"),
      ],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("no vuelca movimientos de más de 30 minutos aunque el cursor sea viejo (monitor reactivado)", () => {
    const { events } = evaluate({
      config: config(),
      state: stateAt(min(60 * 24 * 20)),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.2, 42.6)),
      changes: [change("gales", min(45), [40.1, 42.6], [40.2, 42.6])],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("un cambio que fue y volvió dentro de la ventana no se avisa", () => {
    const { events } = evaluate({
      config: config(),
      state: stateAt(min(10)),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.1, 42.6)),
      changes: [change("gales", min(8), [40.1, 42.6], [40.2, 42.6]), change("gales", min(3), [40.2, 42.6], [40.1, 42.6])],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
  });
});

describe("posición propia", () => {
  const first = quotesOf(quote("propia", 40.3, 42.5), quote("gales", 40.2, 42.6), quote("varlix", 40.1, 42.7));
  const worse = quotesOf(quote("propia", 40.0, 42.8), quote("gales", 40.2, 42.6), quote("varlix", 40.1, 42.7));

  it("la primera corrida sólo aprende, no avisa", () => {
    const { events, state } = evaluate({ config: config(), state: stateAt(min(5)), now: NOW, quotes: first, changes: [] });
    expect(events.filter((e) => e.kind === "position")).toEqual([]);
    expect(state.positions["USD|buy"]).toEqual({ seen: 1, alerted: 1 });
  });

  it("la posición se avisa recién a la segunda corrida seguida con el mismo puesto", () => {
    const learned = evaluate({ config: config(), state: stateAt(min(10)), now: min(5), quotes: first, changes: [] }).state;
    const once = evaluate({ config: config(), state: learned, now: NOW, quotes: worse, changes: [] });
    expect(once.events.filter((e) => e.kind === "position")).toEqual([]);
    const twice = evaluate({ config: config(), state: once.state, now: new Date(NOW.getTime() + 5 * 60_000), quotes: worse, changes: [] });
    const positions = twice.events.filter((e) => e.kind === "position");
    expect(positions).toContainEqual({
      kind: "position",
      code: "USD",
      side: "buy",
      from: 1,
      to: 3,
      of: 3,
      better: [
        { origin: "gales", value: 40.2 },
        { origin: "varlix", value: 40.1 },
      ],
    });
    expect(twice.state.positions["USD|buy"]).toEqual({ seen: 3, alerted: 3 });
  });

  it("si la casa propia desaparece de la foto no cambia de posición", () => {
    const learned = evaluate({ config: config(), state: stateAt(min(10)), now: min(5), quotes: first, changes: [] }).state;
    const gone = quotesOf(quote("gales", 40.2, 42.6), quote("varlix", 40.1, 42.7));
    const a = evaluate({ config: config(), state: learned, now: NOW, quotes: gone, changes: [] });
    const b = evaluate({ config: config(), state: a.state, now: new Date(NOW.getTime() + 300_000), quotes: gone, changes: [] });
    expect(b.events.filter((e) => e.kind === "position")).toEqual([]);
    expect(b.state.positions["USD|buy"].alerted).toBe(1);
  });
});

describe("pizarra propia quieta", () => {
  const quotes = quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.3, 42.5), quote("varlix", 40.2, 42.5), quote("aeromar", 40.0, 42.9));
  const moved = [
    change("gales", min(60), [40.1, 42.6], [40.3, 42.5]),
    change("varlix", min(30), [40.1, 42.6], [40.2, 42.5]),
  ];

  it("avisa una vez por día si la propia no se movió en 3 h y se movieron al menos 2 competidores", () => {
    const a = evaluate({ config: config(), state: stateAt(min(5)), now: NOW, quotes, changes: moved });
    expect(a.events.filter((e) => e.kind === "quiet")).toEqual([
      { kind: "quiet", code: "USD", lastOwnChangeAt: null, movers: ["gales", "varlix"] },
    ]);
    const b = evaluate({ config: config(), state: a.state, now: new Date(NOW.getTime() + 300_000), quotes, changes: moved });
    expect(b.events.filter((e) => e.kind === "quiet")).toEqual([]);
  });

  it("no avisa fuera de horario ni en fin de semana", () => {
    const early = new Date("2026-09-29T11:30:00Z"); // 08:30 Montevideo
    const saturday = new Date("2026-10-03T14:05:00Z");
    for (const now of [early, saturday]) {
      const r = evaluate({ config: config(), state: stateAt(now), now, quotes, changes: moved.map((c) => ({ ...c, observedAt: new Date(now.getTime() - 30 * 60_000) })) });
      expect(r.events.filter((e) => e.kind === "quiet")).toEqual([]);
    }
  });

  it("si la casa propia no está en la foto (scraper caído) no la acusa de quieta", () => {
    const withoutOwn = quotesOf(quote("gales", 40.3, 42.5), quote("varlix", 40.2, 42.5));
    const r = evaluate({ config: config(), state: stateAt(min(5)), now: NOW, quotes: withoutOwn, changes: moved });
    expect(r.events.filter((e) => e.kind === "quiet")).toEqual([]);
  });

  it("si la propia se movió dentro de la ventana, no está quieta", () => {
    const r = evaluate({
      config: config(),
      state: stateAt(min(5)),
      now: NOW,
      quotes,
      changes: [...moved, change("propia", min(90), [40.0, 42.7], [40.1, 42.6])],
    });
    expect(r.events.filter((e) => e.kind === "quiet")).toEqual([]);
  });
});

describe("resumen del día", () => {
  const evening = new Date("2026-09-29T21:40:00Z"); // 18:40 Montevideo
  const quotes = quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.3, 42.5), quote("varlix", 40.2, 42.7));
  const changes = [
    change("gales", new Date("2026-09-29T13:00:00Z"), [40.1, 42.6], [40.2, 42.6]),
    change("gales", new Date("2026-09-29T17:00:00Z"), [40.2, 42.6], [40.3, 42.5]),
    change("varlix", new Date("2026-09-29T15:00:00Z"), [40.1, 42.8], [40.2, 42.7]),
  ];

  it("sale una vez por día desde las 18:30 con posición, mejores precios y movimientos", () => {
    const a = evaluate({ config: config(), state: stateAt(evening), now: evening, quotes, changes });
    const daily = a.events.find((e) => e.kind === "daily");
    expect(daily).toMatchObject({
      kind: "daily",
      day: "2026-09-29",
      lines: [
        {
          code: "USD",
          own: { buy: { position: 3, of: 3 }, sell: { position: 2, of: 3 } },
          bestBuy: { origin: "gales", value: 40.3 },
          bestSell: { origin: "gales", value: 42.5 },
          moves: [
            { origin: "gales", count: 2 },
            { origin: "varlix", count: 1 },
          ],
        },
      ],
    });
    const b = evaluate({ config: config(), state: a.state, now: new Date(evening.getTime() + 300_000), quotes, changes });
    expect(b.events.find((e) => e.kind === "daily")).toBeUndefined();
  });

  it("antes de las 18:30 no sale", () => {
    const r = evaluate({ config: config(), state: stateAt(NOW), now: NOW, quotes, changes });
    expect(r.events.find((e) => e.kind === "daily")).toBeUndefined();
  });
});

describe("sin casa propia", () => {
  it("sólo movimientos y resumen: posición y quieta necesitan una casa propia", () => {
    const quotes = quotesOf(quote("gales", 40.3, 42.5), quote("varlix", 40.2, 42.5));
    const r = evaluate({
      config: config({ ownOrigin: null }),
      state: stateAt(min(5)),
      now: NOW,
      quotes,
      changes: [change("gales", min(2), [40.1, 42.6], [40.3, 42.5]), change("varlix", min(1), [40.1, 42.6], [40.2, 42.5])],
    });
    expect(r.events.map((e) => e.kind).sort()).toEqual(["move", "move"]);
    expect(r.state.cursor).toEqual(NOW);
  });
});
