import { describe, expect, it } from "vitest";
import { evaluate } from "../../classes/monitor/events";
import { emptyState, type LedgerChange, type MonitorConfig, type MonitorState, type Quote } from "../../classes/monitor/types";

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

/** Estado sin corridas previas: la primera evaluación sólo aprende. */
const stateAt = (cursor: Date): MonitorState => ({ ...emptyState("u1", cursor) });
/** Estado de una corrida de hace 5 minutos que ya vio estos precios confirmados en la foto. */
const seen = (lastQuotes: Record<string, { buy: number; sell: number }>, ranAt = min(5)): MonitorState => ({
  ...emptyState("u1", ranAt),
  lastRunAt: ranAt,
  lastQuotes,
});

describe("movimientos de la competencia", () => {
  it("avisa el cambio contra el último precio confirmado en la foto, con la hora del ledger", () => {
    const { events, state } = evaluate({
      config: config(),
      state: seen({ "gales|USD": { buy: 40.1, sell: 42.7 } }),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.3, 42.5)),
      changes: [change("gales", min(4), [40.1, 42.7], [40.2, 42.6]), change("gales", min(2), [40.2, 42.6], [40.3, 42.5])],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([
      { kind: "move", origin: "gales", code: "USD", fromBuy: 40.1, toBuy: 40.3, fromSell: 42.7, toSell: 42.5, at: min(2) },
    ]);
    expect(state.lastQuotes["gales|USD"]).toEqual({ buy: 40.3, sell: 42.5 });
    expect(state.lastRunAt).toEqual(NOW);
  });

  it("un precio rechazado por la guarda que después vuelve no se avisa en ninguna de las dos corridas", () => {
    const quotes = quotesOf(quote("propia", 40.1, 42.6), quote("gales", 39.05, 42.6));
    const first = evaluate({
      config: config(),
      state: seen({ "gales|USD": { buy: 39.05, sell: 42.6 } }),
      now: NOW,
      quotes,
      changes: [change("gales", min(2), [39.05, 42.6], [3905, 42.6])],
    });
    expect(first.events.filter((e) => e.kind === "move")).toEqual([]);
    const second = evaluate({
      config: config(),
      state: first.state,
      now: new Date(NOW.getTime() + 300_000),
      quotes,
      changes: [change("gales", min(2), [39.05, 42.6], [3905, 42.6]), change("gales", new Date(NOW.getTime() + 60_000), [3905, 42.6], [39.05, 42.6])],
    });
    expect(second.events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("una casa que falta de la foto (0/0) y vuelve igual no es un movimiento", () => {
    const first = evaluate({
      config: config(),
      state: seen({ "gales|USD": { buy: 40.1, sell: 42.6 } }),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6)),
      changes: [change("gales", min(2), [40.1, 42.6], [0, 0])],
    });
    expect(first.state.lastQuotes["gales|USD"]).toEqual({ buy: 40.1, sell: 42.6 });
    const second = evaluate({
      config: config(),
      state: first.state,
      now: new Date(NOW.getTime() + 300_000),
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.1, 42.6)),
      changes: [change("gales", NOW, [0, 0], [40.1, 42.6])],
    });
    expect(second.events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("un salto imposible (una coma perdida en la venta) no se avisa aunque esté en la foto", () => {
    const { events } = evaluate({
      config: config(),
      state: seen({ "gales|USD": { buy: 40.1, sell: 42.6 } }),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.1, 4260)),
      changes: [change("gales", min(2), [40.1, 42.6], [40.1, 4260])],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("la primera vez que ve una casa sólo aprende", () => {
    const { events, state } = evaluate({
      config: config(),
      state: seen({}),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.3, 42.5)),
      changes: [change("gales", min(2), [40.1, 42.6], [40.3, 42.5])],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
    expect(state.lastQuotes["gales|USD"]).toEqual({ buy: 40.3, sell: 42.5 });
  });

  it("con la última evaluación de hace más de 30 minutos (monitor reactivado) re-aprende sin avisar", () => {
    const { events } = evaluate({
      config: config(),
      state: seen({ "gales|USD": { buy: 39.0, sell: 41.5 } }, min(60 * 24 * 20)),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.2, 42.6)),
      changes: [],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("no avisa la casa propia ni un tipo que no es el de la foto", () => {
    const { events } = evaluate({
      config: config(),
      state: seen({ "propia|USD": { buy: 40.1, sell: 42.6 }, "varlix|USD": { buy: 40.0, sell: 42.9 } }),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.2, 42.6), quote("varlix", 40.0, 42.9)),
      changes: [change("propia", min(2), [40.1, 42.6], [40.2, 42.6]), change("varlix", min(1), [40.0, 42.9], [40.5, 42.1], "EBROU")],
    });
    expect(events.filter((e) => e.kind === "move")).toEqual([]);
  });

  it("el tipo del ledger se compara normalizado, como el de la foto", () => {
    const { events } = evaluate({
      config: config(),
      state: seen({ "gales|USD": { buy: 40.1, sell: 42.6 } }),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.2, 42.6, "BILLETE")),
      changes: [change("gales", min(2), [40.1, 42.6], [40.2, 42.6], " billete ")],
    });
    expect(events.find((e) => e.kind === "move")).toMatchObject({ at: min(2) });
  });

  it("sin cambio del ledger en la ventana, la hora del movimiento es la de la corrida", () => {
    const { events } = evaluate({
      config: config(),
      state: seen({ "gales|USD": { buy: 40.1, sell: 42.6 } }),
      now: NOW,
      quotes: quotesOf(quote("propia", 40.1, 42.6), quote("gales", 40.2, 42.6)),
      changes: [],
    });
    expect(events.find((e) => e.kind === "move")).toMatchObject({ at: NOW, fromBuy: 40.1, toBuy: 40.2 });
  });
});

describe("posición propia", () => {
  const first = quotesOf(quote("propia", 40.3, 42.5), quote("gales", 40.2, 42.6), quote("varlix", 40.1, 42.7));
  const worse = quotesOf(quote("propia", 40.0, 42.8), quote("gales", 40.2, 42.6), quote("varlix", 40.1, 42.7));

  it("la primera corrida sólo aprende, no avisa", () => {
    const { events, state } = evaluate({ config: config(), state: stateAt(min(5)), now: NOW, quotes: first, changes: [] });
    expect(events.filter((e) => e.kind === "position")).toEqual([]);
    expect(state.positions["USD|buy"]).toMatchObject({ seen: 1, alerted: 1 });
  });

  it("la posición se avisa recién a la segunda corrida seguida con el mismo puesto", () => {
    const learned = evaluate({ config: config(), state: stateAt(min(10)), now: min(5), quotes: first, changes: [] }).state;
    const once = evaluate({ config: config(), state: learned, now: NOW, quotes: worse, changes: [] });
    expect(once.events.filter((e) => e.kind === "position")).toEqual([]);
    const twice = evaluate({ config: config(), state: once.state, now: new Date(NOW.getTime() + 5 * 60_000), quotes: worse, changes: [] });
    expect(twice.events.filter((e) => e.kind === "position")).toContainEqual({
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
    expect(twice.state.positions["USD|buy"]).toMatchObject({ seen: 3, alerted: 3 });
  });

  it("si la casa propia desaparece de la foto no se avisa nada, ni al irse ni al volver", () => {
    const learned = evaluate({ config: config(), state: stateAt(min(10)), now: min(5), quotes: first, changes: [] }).state;
    const gone = quotesOf(quote("gales", 40.2, 42.6), quote("varlix", 40.1, 42.7));
    const a = evaluate({ config: config(), state: learned, now: NOW, quotes: gone, changes: [] });
    const b = evaluate({ config: config(), state: a.state, now: new Date(NOW.getTime() + 300_000), quotes: gone, changes: [] });
    const c = evaluate({ config: config(), state: b.state, now: new Date(NOW.getTime() + 600_000), quotes: worse, changes: [] });
    const d = evaluate({ config: config(), state: c.state, now: new Date(NOW.getTime() + 900_000), quotes: worse, changes: [] });
    expect([...a.events, ...b.events, ...c.events, ...d.events].filter((e) => e.kind === "position")).toEqual([]);
  });

  it("un competidor que falta de la foto no cambia tu posición avisada", () => {
    const learned = evaluate({ config: config(), state: stateAt(min(10)), now: min(5), quotes: worse, changes: [] }).state;
    const withoutGales = quotesOf(quote("propia", 40.0, 42.8), quote("varlix", 40.1, 42.7));
    const a = evaluate({ config: config(), state: learned, now: NOW, quotes: withoutGales, changes: [] });
    const b = evaluate({ config: config(), state: a.state, now: new Date(NOW.getTime() + 300_000), quotes: withoutGales, changes: [] });
    expect([...a.events, ...b.events].filter((e) => e.kind === "position")).toEqual([]);
  });

  it("editar el grupo del monitor no dispara un cambio de posición", () => {
    const learned = evaluate({ config: config({ competitors: ["varlix"] }), state: stateAt(min(10)), now: min(5), quotes: worse, changes: [] }).state;
    const a = evaluate({ config: config(), state: learned, now: NOW, quotes: worse, changes: [] });
    const b = evaluate({ config: config(), state: a.state, now: new Date(NOW.getTime() + 300_000), quotes: worse, changes: [] });
    expect([...a.events, ...b.events].filter((e) => e.kind === "position")).toEqual([]);
  });

  it("después de una pausa larga re-aprende la posición sin avisar", () => {
    const learned = evaluate({ config: config(), state: stateAt(min(60 * 24 * 10)), now: min(60 * 24 * 9), quotes: first, changes: [] }).state;
    const a = evaluate({ config: config(), state: learned, now: NOW, quotes: worse, changes: [] });
    const b = evaluate({ config: config(), state: a.state, now: new Date(NOW.getTime() + 300_000), quotes: worse, changes: [] });
    expect([...a.events, ...b.events].filter((e) => e.kind === "position")).toEqual([]);
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

  it("un cambio imposible de un competidor no cuenta como movimiento para la quieta", () => {
    const junk = [moved[0], change("varlix", min(30), [40.2, 42.5], [4020, 42.5])];
    const r = evaluate({ config: config(), state: stateAt(min(5)), now: NOW, quotes, changes: junk });
    expect(r.events.filter((e) => e.kind === "quiet")).toEqual([]);
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
    change("varlix", new Date("2026-09-29T15:30:00Z"), [40.2, 42.7], [4020, 42.7]),
    change("varlix", new Date("2026-09-29T15:35:00Z"), [4020, 42.7], [40.2, 42.7]),
    change("gales", new Date("2026-09-29T16:00:00Z"), [0, 0], [40.2, 42.6]),
  ];

  it("sale una vez por día desde las 18:30 con posición, mejores precios y movimientos sanos", () => {
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
    const r = evaluate({
      config: config({ ownOrigin: null }),
      state: seen({ "gales|USD": { buy: 40.1, sell: 42.6 }, "varlix|USD": { buy: 40.1, sell: 42.6 } }),
      now: NOW,
      quotes: quotesOf(quote("gales", 40.3, 42.5), quote("varlix", 40.2, 42.5)),
      changes: [change("gales", min(2), [40.1, 42.6], [40.3, 42.5]), change("varlix", min(1), [40.1, 42.6], [40.2, 42.5])],
    });
    expect(r.events.map((e) => e.kind).sort()).toEqual(["move", "move"]);
    expect(r.state.cursor).toEqual(NOW);
  });
});
