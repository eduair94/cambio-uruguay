# Monitor de competencia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una casa de cambio arma desde `/cuenta?tab=api` un monitor (su casa, competidores, monedas, avisos, canales) y recibe por Telegram/correo avisos verdaderos de movimientos, cambios de posición, pizarra quieta y un resumen diario; 14 días de prueba y después sólo con plan Empresa.

**Architecture:** La lógica es pura en `classes/monitor/` (foto del grupo, posición, eventos, acceso, mensajes) y la orquesta `runMonitors` con dependencias inyectadas; el job de pm2 `currency-competitor-monitor` (cada 5 min, instancia única) la cablea al ledger y la foto del backend, a la base del app por `appdb` y a Telegram/SMTP. El app guarda la configuración (`competitormonitors`) y muestra estado; el job escribe el estado (`competitormonitorstates`).

**Tech Stack:** TypeScript 4.9 CommonJS (raíz), mongoose 6, moment-timezone, nodemailer (nuevo en la raíz), vitest; Nuxt 4 + Vuetify 4 (app).

**Spec:** `docs/superpowers/specs/2026-09-29-monitor-competencia-design.md`

## Global Constraints

- Worktree `C:/Users/airau/Documents/GitHub/cambio-uruguay/.claude/worktrees/competitor-monitor`, rama `feat/competitor-monitor`. Nunca tocar el checkout principal.
- Monedas: `USD`, `EUR`, `BRL`, `ARS`. Competidores: 1 a 12. Prueba: 14 días desde `trialStartedAt`. `bcu` nunca es una casa.
- Tipos que cuentan: `''` y si no `BILLETE`. Nunca `INTERBANCARIO`, `PROMED.FONDO`, `CABLE`, `EBROU`, `TRANSFERENCIA`.
- Compra: gana la más alta. Venta: gana la más baja. Empates comparten puesto.
- "Quieta": lunes a viernes 10:00–19:00 Montevideo, ventana 3 h, ≥ 2 competidores movidos, una vez por día por moneda. Resumen: desde las 18:30 Montevideo, una vez por día.
- Mensajes en texto plano (sin `parse_mode`). Cifras con coma decimal y dos decimales.
- El cursor avanza aunque un envío falle. El primer estado arranca en "ahora". Un monitor que falla no corta a los demás.
- Nada programado dentro de la API ni del app: sólo el job de pm2.
- Repo público: cero cifras de ingreso en código, docs y commits. Gitleaks: nada de identificadores `key`/`token`/`secret` con valores de alta entropía en tests.
- Estilo raíz: comillas dobles, punto y coma. Estilo app: comillas simples, sin punto y coma; correr `eslint --fix` sobre lo tocado.
- TS 4.9 sin `strict`: no confiar en el estrechamiento de uniones por `!x.ok`; usar `x.ok === false`.
- Commits con `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Un cambio del ledger que la guarda de plausibilidad rechazó** (la coma perdida) no puede avisar como movimiento → test "no avisa un cambio que la foto no publica" (Task 2).
2. **La foto a medio actualizar por el sync** (una sola corrida con la posición cambiada) no avisa; dos seguidas sí → test "la posición se avisa recién a la segunda corrida" (Task 2).
3. **Un monitor pausado semanas que se reactiva** no vuelca un aluvión de movimientos viejos → test "no vuelca movimientos de más de 30 minutos" (Task 2).
4. **Casa propia ausente de la foto** (scraper caído) no se reporta como "quieta" ni cambia de posición → tests en Task 2.
5. **La prueba vencida** manda un solo aviso y deja de evaluar; si después le asignan plan Empresa, vuelve a funcionar → tests en Task 4.

---

## File Structure

Raíz:
- `classes/monitor/types.ts` — tipos y constantes compartidas.
- `classes/monitor/snapshot.ts` — foto del grupo por moneda.
- `classes/monitor/ranking.ts` — posición y mejor precio.
- `classes/monitor/events.ts` — evaluación pura de una corrida.
- `classes/monitor/access.ts` — prueba / Empresa / vencido.
- `classes/monitor/format.ts` — mensajes.
- `classes/monitor/deliver.ts` — Telegram y SMTP.
- `classes/monitor/run.ts` — orquestación con dependencias inyectadas.
- `classes/models/CompetitorMonitor.ts`, `classes/models/CompetitorMonitorState.ts`, `classes/models/AppUser.ts` — modelos de la base del app.
- `sync_competitor_monitor.ts` — entrypoint del job.
- Modificar: `package.json` (`nodemailer`), `ecosystem.config.js`, `scripts/deploy-backend.sh`, `tests/appdb/schema_parity.test.ts`, `.github/workflows/deploy.yml`, `AGENTS.md`.
- Docs: `docs/api/COMPETITOR_MONITOR.md`.
- Tests: `tests/monitor/*.test.ts`.

App:
- `app/utils/competitorMonitor.ts` — espejo de constantes, acceso y validación.
- `app/server/models/CompetitorMonitor.ts`, `app/server/models/CompetitorMonitorState.ts`.
- `app/server/utils/monitorHouses.ts` — casas elegibles desde `/localData`.
- `app/server/api/me/monitor/index.get.ts`, `index.put.ts`; `app/server/api/admin/monitors.get.ts`.
- `app/components/account/CompetitorMonitorPanel.vue`; modificar `app/pages/cuenta/index.vue`, `app/components/account/ApiClientsAdminPanel.vue`, `app/pages/empresas.vue`.
- Tests: `app/tests/unit/competitorMonitor.test.ts`, `competitorMonitorParity.test.ts`, `apiMonitorRoutes.test.ts`, y ampliar `cuentaApiTab.test.ts`, `empresasPage.test.ts`.

---

### Task 1: Tipos, foto del grupo y posición

**Files:**
- Create: `classes/monitor/types.ts`, `classes/monitor/snapshot.ts`, `classes/monitor/ranking.ts`
- Test: `tests/monitor/snapshot.test.ts`, `tests/monitor/ranking.test.ts`

**Interfaces:**
- Produces: `MonitorCurrency`, `MONITOR_CURRENCIES`, `MAX_COMPETITORS = 12`, `TRIAL_DAYS = 14`, `EmailMode`, `Side`, `MonitorConfig`, `PositionMemo`, `MonitorState`, `emptyState(uid, now)`, `SnapshotRow`, `Quote`, `LedgerChange`; `groupQuotes(rows, group, codes): Map<string, Quote[]>`; `Placement`, `placementOf(quotes, origin, side): Placement | null`, `bestOf(quotes, side): { origin; value } | null`.

- [ ] **Step 1: Write the failing tests**

`tests/monitor/snapshot.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { groupQuotes } from "../../classes/monitor/snapshot";

const rows = [
  { origin: "gales", code: "USD", type: "", buy: 40.1, sell: 42.6 },
  { origin: "gales", code: "USD", type: "EBROU", buy: 40.5, sell: 42.1 },
  { origin: "brou", code: "USD", type: "EBROU", buy: 40.6, sell: 42.0 },
  { origin: "brou", code: "USD", type: "BILLETE", buy: 40.0, sell: 42.8 },
  { origin: "la_favorita", code: "USD", type: "INTERBANCARIO", buy: 41, sell: 41.1 },
  { origin: "la_favorita", code: "USD", type: "", buy: 40.2, sell: 42.5 },
  { origin: "bcu", code: "USD", type: "", buy: 41.0, sell: 41.0 },
  { origin: "varlix", code: "EUR", type: "", buy: 45, sell: 49 },
  { origin: "afuera", code: "USD", type: "", buy: 39, sell: 44 },
];

describe("foto del grupo", () => {
  it("una fila por casa y moneda: mostrador primero, BILLETE si no hay, nunca precios condicionados ni mayoristas", () => {
    const q = groupQuotes(rows, new Set(["gales", "brou", "la_favorita", "bcu"]), new Set(["USD"]));
    expect(q.get("USD")!.map((x) => [x.origin, x.type, x.buy, x.sell]).sort()).toEqual([
      ["brou", "BILLETE", 40.0, 42.8],
      ["gales", "", 40.1, 42.6],
      ["la_favorita", "", 40.2, 42.5],
    ]);
  });

  it("sólo las casas del grupo y las monedas elegidas", () => {
    const q = groupQuotes(rows, new Set(["gales", "varlix"]), new Set(["USD"]));
    expect([...q.keys()]).toEqual(["USD"]);
    expect(q.get("USD")!.map((x) => x.origin)).toEqual(["gales"]);
  });

  it("una casa que publica sólo la venta queda con la compra en 0", () => {
    const q = groupQuotes([{ origin: "gales", code: "USD", type: "", buy: 0, sell: 42.6 }], new Set(["gales"]), new Set(["USD"]));
    expect(q.get("USD")![0]).toMatchObject({ buy: 0, sell: 42.6 });
  });
});
```

`tests/monitor/ranking.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { bestOf, placementOf } from "../../classes/monitor/ranking";
import type { Quote } from "../../classes/monitor/types";

const q = (origin: string, buy: number, sell: number): Quote => ({ origin, code: "USD", type: "", buy, sell });
const group = [q("propia", 40.1, 42.6), q("gales", 40.2, 42.5), q("varlix", 40.1, 42.7), q("aeromar", 40.0, 0)];

describe("posición en el grupo", () => {
  it("en la compra gana la más alta y los empates comparten puesto", () => {
    expect(placementOf(group, "propia", "buy")).toEqual({
      position: 2,
      of: 4,
      better: [{ origin: "gales", value: 40.2 }],
    });
    expect(placementOf(group, "varlix", "buy")!.position).toBe(2);
  });

  it("en la venta gana la más baja y una casa sin venta no cuenta", () => {
    expect(placementOf(group, "propia", "sell")).toEqual({
      position: 2,
      of: 3,
      better: [{ origin: "gales", value: 42.5 }],
    });
    expect(placementOf(group, "aeromar", "sell")).toBeNull();
  });

  it("sin la casa en la foto no hay posición", () => {
    expect(placementOf(group, "ausente", "buy")).toBeNull();
  });

  it("el mejor de cada lado", () => {
    expect(bestOf(group, "buy")).toEqual({ origin: "gales", value: 40.2 });
    expect(bestOf(group, "sell")).toEqual({ origin: "gales", value: 42.5 });
    expect(bestOf([], "sell")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/monitor/snapshot.test.ts tests/monitor/ranking.test.ts`
Expected: FAIL — cannot resolve the modules.

- [ ] **Step 3: Implement `classes/monitor/types.ts`**

```ts
// Tipos y constantes del monitor de competencia para casas de cambio. Diseño:
// docs/superpowers/specs/2026-09-29-monitor-competencia-design.md.
//
// app/utils/competitorMonitor.ts copia MONITOR_CURRENCIES, MAX_COMPETITORS y TRIAL_DAYS (el app no
// puede importar la raíz); app/tests/unit/competitorMonitorParity.test.ts las ata.

export type MonitorCurrency = "USD" | "EUR" | "BRL" | "ARS";
export const MONITOR_CURRENCIES: readonly MonitorCurrency[] = ["USD", "EUR", "BRL", "ARS"];
export const MAX_COMPETITORS = 12;
export const TRIAL_DAYS = 14;

export type EmailMode = "none" | "daily" | "all";
export type Side = "buy" | "sell";

/** La configuración que guarda el app (`competitormonitors`), ya normalizada. */
export interface MonitorConfig {
  uid: string;
  email: string | null;
  ownOrigin: string | null;
  competitors: string[];
  currencies: MonitorCurrency[];
  alerts: { moves: boolean; position: boolean; quiet: boolean; daily: boolean };
  channels: { telegram: boolean; email: EmailMode };
  active: boolean;
  trialStartedAt: Date;
}

/** Posición vista en la última corrida y la última avisada (1 = mejor; null = sin posición). */
export interface PositionMemo {
  seen: number | null;
  alerted: number | null;
}

/** El estado que escribe sólo el job (`competitormonitorstates`). */
export interface MonitorState {
  uid: string;
  cursor: Date | null;
  /** Clave `${moneda}|${lado}`. */
  positions: Record<string, PositionMemo>;
  /** Moneda → día (YYYY-MM-DD, Montevideo) del último aviso de pizarra quieta. */
  quietDay: Record<string, string>;
  dailyDay: string | null;
  accessEndedAt: Date | null;
  lastRunAt: Date | null;
  lastSentAt: Date | null;
}

export function emptyState(uid: string, now: Date): MonitorState {
  return {
    uid,
    cursor: now,
    positions: {},
    quietDay: {},
    dailyDay: null,
    accessEndedAt: null,
    lastRunAt: null,
    lastSentAt: null,
  };
}

/** Una fila de la foto del día (colección de cotizaciones del backend). */
export interface SnapshotRow {
  origin: string;
  code: string;
  type?: string | null;
  buy: number;
  sell: number;
}

/** Lo que publica una casa hoy para una moneda: una sola fila, la del mostrador. */
export interface Quote {
  origin: string;
  code: string;
  type: string;
  buy: number;
  sell: number;
}

/** Un cambio de pizarra del ledger `cambio_changes`. */
export interface LedgerChange {
  origin: string;
  code: string;
  type: string;
  previousBuy: number;
  previousSell: number;
  buy: number;
  sell: number;
  observedAt: Date;
}
```

- [ ] **Step 4: Implement `classes/monitor/snapshot.ts`**

```ts
// La foto del grupo: qué publica hoy cada casa del monitor, una fila por casa y moneda. Puro.
//
// Cuenta el precio de MOSTRADOR (`''`) y, si la casa no lo publica, el de BILLETE. Quedan afuera
// los precios que no son de mostrador —mayoristas (INTERBANCARIO, PROMED.FONDO, CABLE) y
// condicionados a tener cuenta (EBROU, TRANSFERENCIA)— y el BCU, que no es una casa.
import type { Quote, SnapshotRow } from "./types";

const COUNTER_TYPES = ["", "BILLETE"];

export function groupQuotes(
  rows: readonly SnapshotRow[],
  group: ReadonlySet<string>,
  codes: ReadonlySet<string>
): Map<string, Quote[]> {
  const chosen = new Map<string, Quote>();
  for (const row of rows) {
    const code = String(row.code ?? "").toUpperCase();
    const type = String(row.type ?? "").trim().toUpperCase();
    if (row.origin === "bcu" || !group.has(row.origin) || !codes.has(code)) continue;
    const rank = COUNTER_TYPES.indexOf(type);
    if (rank < 0) continue;
    const buy = Number(row.buy);
    const sell = Number(row.sell);
    if (!(buy > 0) && !(sell > 0)) continue;
    const key = `${row.origin}|${code}`;
    const current = chosen.get(key);
    if (current && COUNTER_TYPES.indexOf(current.type) <= rank) continue;
    chosen.set(key, { origin: row.origin, code, type, buy: buy > 0 ? buy : 0, sell: sell > 0 ? sell : 0 });
  }
  const out = new Map<string, Quote[]>();
  for (const quote of chosen.values()) {
    const list = out.get(quote.code) ?? [];
    list.push(quote);
    out.set(quote.code, list);
  }
  return out;
}
```

- [ ] **Step 5: Implement `classes/monitor/ranking.ts`**

```ts
// Dónde queda una casa dentro de su grupo. Puro.
//
// Desde el lado de quien va a la casa: en la COMPRA (la casa le compra dólares) gana la más alta;
// en la VENTA gana la más baja. Empates comparten puesto (1, 2, 2, 4). Una casa sin precio de ese
// lado (0) no entra en la cuenta.
import type { Quote, Side } from "./types";

export interface Placement {
  position: number;
  of: number;
  better: { origin: string; value: number }[];
}

const valueOf = (quote: Quote, side: Side): number => (side === "buy" ? quote.buy : quote.sell);
const beats = (a: number, b: number, side: Side): boolean => (side === "buy" ? a > b : a < b);
const order = (side: Side) => (a: { origin: string; value: number }, b: { origin: string; value: number }) =>
  (side === "buy" ? b.value - a.value : a.value - b.value) || a.origin.localeCompare(b.origin);

export function placementOf(quotes: readonly Quote[], origin: string, side: Side): Placement | null {
  const valid = quotes.filter((q) => valueOf(q, side) > 0);
  const own = valid.find((q) => q.origin === origin);
  if (!own) return null;
  const mine = valueOf(own, side);
  const better = valid
    .filter((q) => beats(valueOf(q, side), mine, side))
    .map((q) => ({ origin: q.origin, value: valueOf(q, side) }))
    .sort(order(side));
  return { position: better.length + 1, of: valid.length, better };
}

export function bestOf(quotes: readonly Quote[], side: Side): { origin: string; value: number } | null {
  const valid = quotes
    .filter((q) => valueOf(q, side) > 0)
    .map((q) => ({ origin: q.origin, value: valueOf(q, side) }))
    .sort(order(side));
  return valid[0] ?? null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/monitor/snapshot.test.ts tests/monitor/ranking.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 7: Commit**

```bash
git add classes/monitor/types.ts classes/monitor/snapshot.ts classes/monitor/ranking.ts tests/monitor/snapshot.test.ts tests/monitor/ranking.test.ts
git commit -m "feat(monitor): foto del grupo y posición de cada casa

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Evaluación de una corrida (eventos)

**Files:**
- Create: `classes/monitor/events.ts`
- Test: `tests/monitor/events.test.ts`

**Interfaces:**
- Consumes: Task 1 (`MonitorConfig`, `MonitorState`, `Quote`, `LedgerChange`, `Side`, `emptyState`, `placementOf`, `bestOf`, `Placement`).
- Produces: `QUIET_WINDOW_MS`, `MOVE_LOOKBACK_MS`, `QUIET_MIN_MOVERS`, `type MonitorEvent` (kinds `move` | `position` | `quiet` | `daily`), `DailyLine`, `EvaluationInput { config; state; now; quotes; changes }`, `dayStart(now): Date`, `montevideoToday(now): string`, `evaluate(input): { events: MonitorEvent[]; state: MonitorState }`.

- [ ] **Step 1: Write the failing test `tests/monitor/events.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/monitor/events.test.ts`
Expected: FAIL — cannot resolve `../../classes/monitor/events`.

- [ ] **Step 3: Implement `classes/monitor/events.ts`**

```ts
// Una corrida del monitor de competencia: qué pasó desde la anterior y qué hay que avisar. Puro.
//
// Tres guardas que salen de cómo se escribe el dato, no de gustos:
// - Un cambio del ledger se CONFIRMA contra la foto de hoy. El ledger registra el cambio antes de
//   que la guarda de plausibilidad decida (classes/cambio.ts), así que una coma perdida deja un
//   "cambio" que la foto nunca publicó.
// - La posición se avisa recién si se vio igual en DOS corridas seguidas: el sync de 5 minutos
//   escribe casa por casa y una sola lectura puede ser un estado a medio actualizar.
// - Los movimientos miran como mucho 30 minutos atrás: un monitor reactivado después de semanas no
//   vuelca historia.
import moment from "moment-timezone";
import { bestOf, placementOf, type Placement } from "./ranking";
import type { LedgerChange, MonitorConfig, MonitorState, Quote, Side } from "./types";

const ZONE = "America/Montevideo";
export const QUIET_WINDOW_MS = 3 * 3_600_000;
export const MOVE_LOOKBACK_MS = 30 * 60_000;
export const QUIET_MIN_MOVERS = 2;
const SIDES: Side[] = ["buy", "sell"];

export type MonitorEvent =
  | { kind: "move"; origin: string; code: string; fromBuy: number; toBuy: number; fromSell: number; toSell: number; at: Date }
  | {
      kind: "position";
      code: string;
      side: Side;
      from: number | null;
      to: number;
      of: number;
      better: { origin: string; value: number }[];
    }
  | { kind: "quiet"; code: string; lastOwnChangeAt: Date | null; movers: string[] }
  | { kind: "daily"; day: string; lines: DailyLine[] };

export interface DailyLine {
  code: string;
  own: { buy: Placement | null; sell: Placement | null } | null;
  bestBuy: { origin: string; value: number } | null;
  bestSell: { origin: string; value: number } | null;
  moves: { origin: string; count: number }[];
}

export interface EvaluationInput {
  config: MonitorConfig;
  state: MonitorState;
  now: Date;
  /** Foto de hoy del grupo, por moneda (groupQuotes). */
  quotes: Map<string, Quote[]>;
  /** Cambios del grupo desde el principio del día de Montevideo (o 30 min antes si es más temprano), en orden. */
  changes: readonly LedgerChange[];
}

export function dayStart(now: Date): Date {
  return moment.tz(now, ZONE).startOf("day").toDate();
}

export function montevideoToday(now: Date): string {
  return moment.tz(now, ZONE).format("YYYY-MM-DD");
}

function minutesOfDay(now: Date): number {
  const local = moment.tz(now, ZONE);
  return local.hours() * 60 + local.minutes();
}

function inQuietHours(now: Date): boolean {
  const weekday = moment.tz(now, ZONE).isoWeekday(); // 1 = lunes … 7 = domingo
  const minutes = minutesOfDay(now);
  return weekday <= 5 && minutes >= 10 * 60 && minutes < 19 * 60;
}

export function evaluate(input: EvaluationInput): { events: MonitorEvent[]; state: MonitorState } {
  const { config, now, quotes } = input;
  const state: MonitorState = {
    ...input.state,
    positions: { ...input.state.positions },
    quietDay: { ...input.state.quietDay },
  };
  const events: MonitorEvent[] = [];
  const nowMs = now.getTime();
  const today = montevideoToday(now);
  const todayMs = dayStart(now).getTime();
  const competitors = new Set(config.competitors);
  const own = config.ownOrigin;

  const quoteOf = (origin: string, code: string): Quote | null =>
    (quotes.get(code) ?? []).find((q) => q.origin === origin) ?? null;
  // Sólo cuentan los cambios del mismo tipo que publica la foto para esa casa y moneda.
  const counted = input.changes.filter((c) => {
    const q = quoteOf(c.origin, c.code);
    return !!q && q.type === c.type && c.observedAt.getTime() <= nowMs;
  });

  if (config.alerts.moves) {
    const from = Math.max(state.cursor ? state.cursor.getTime() : nowMs, nowMs - MOVE_LOOKBACK_MS);
    const collapsed = new Map<string, { first: LedgerChange; last: LedgerChange }>();
    for (const c of counted) {
      if (c.observedAt.getTime() <= from || !competitors.has(c.origin)) continue;
      const key = `${c.origin}|${c.code}`;
      const entry = collapsed.get(key);
      if (entry) entry.last = c;
      else collapsed.set(key, { first: c, last: c });
    }
    for (const { first, last } of collapsed.values()) {
      const q = quoteOf(last.origin, last.code)!;
      if (q.buy !== last.buy || q.sell !== last.sell) continue;
      if (first.previousBuy === last.buy && first.previousSell === last.sell) continue;
      events.push({
        kind: "move",
        origin: last.origin,
        code: last.code,
        fromBuy: first.previousBuy,
        toBuy: last.buy,
        fromSell: first.previousSell,
        toSell: last.sell,
        at: last.observedAt,
      });
    }
  }

  if (own && config.alerts.position) {
    for (const code of config.currencies) {
      for (const side of SIDES) {
        const key = `${code}|${side}`;
        const place = placementOf(quotes.get(code) ?? [], own, side);
        const current = place ? place.position : null;
        const memo = state.positions[key];
        if (!memo) {
          state.positions[key] = { seen: current, alerted: current };
          continue;
        }
        let alerted = memo.alerted;
        if (place && current === memo.seen && current !== memo.alerted) {
          events.push({
            kind: "position",
            code,
            side,
            from: memo.alerted,
            to: place.position,
            of: place.of,
            better: place.better.slice(0, 3),
          });
          alerted = current;
        }
        state.positions[key] = { seen: current, alerted };
      }
    }
  }

  if (own && config.alerts.quiet && inQuietHours(now)) {
    const since = nowMs - QUIET_WINDOW_MS;
    for (const code of config.currencies) {
      if (state.quietDay[code] === today || !quoteOf(own, code)) continue;
      const inWindow = counted.filter((c) => c.code === code && c.observedAt.getTime() > since);
      if (inWindow.some((c) => c.origin === own)) continue;
      const movers = [...new Set(inWindow.filter((c) => competitors.has(c.origin)).map((c) => c.origin))].sort();
      if (movers.length < QUIET_MIN_MOVERS) continue;
      const ownToday = counted.filter((c) => c.code === code && c.origin === own && c.observedAt.getTime() >= todayMs);
      events.push({
        kind: "quiet",
        code,
        lastOwnChangeAt: ownToday.length ? ownToday[ownToday.length - 1].observedAt : null,
        movers,
      });
      state.quietDay[code] = today;
    }
  }

  if (config.alerts.daily && minutesOfDay(now) >= 18 * 60 + 30 && state.dailyDay !== today) {
    const lines: DailyLine[] = config.currencies.map((code) => {
      const list = quotes.get(code) ?? [];
      const counts = new Map<string, number>();
      for (const c of counted) {
        if (c.code !== code || !competitors.has(c.origin) || c.observedAt.getTime() < todayMs) continue;
        counts.set(c.origin, (counts.get(c.origin) ?? 0) + 1);
      }
      return {
        code,
        own: own ? { buy: placementOf(list, own, "buy"), sell: placementOf(list, own, "sell") } : null,
        bestBuy: bestOf(list, "buy"),
        bestSell: bestOf(list, "sell"),
        moves: [...counts]
          .map(([origin, count]) => ({ origin, count }))
          .sort((a, b) => b.count - a.count || a.origin.localeCompare(b.origin)),
      };
    });
    if (lines.some((line) => line.bestBuy || line.bestSell)) events.push({ kind: "daily", day: today, lines });
    state.dailyDay = today;
  }

  state.cursor = now;
  return { events, state };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/monitor/events.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
git add classes/monitor/events.ts tests/monitor/events.test.ts
git commit -m "feat(monitor): evaluación de una corrida con las guardas del ledger

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Acceso, mensajes y envío

**Files:**
- Create: `classes/monitor/access.ts`, `classes/monitor/format.ts`, `classes/monitor/deliver.ts`
- Modify: `package.json` (dependencies: `"nodemailer": "^6.10.1"`)
- Test: `tests/monitor/access.test.ts`, `tests/monitor/format.test.ts`, `tests/monitor/deliver.test.ts`

**Interfaces:**
- Consumes: `TRIAL_DAYS` (Task 1), `MonitorEvent`, `DailyLine` (Task 2).
- Produces: `type Access = { status: "trial"; daysLeft: number; endsAt: Date } | { status: "business" } | { status: "expired"; endedAt: Date }`, `accessFor(trialStartedAt, hasBusiness, now): Access`; `PANEL_URL`, `type NameOf = (origin: string) => string`, `interface Message { subject; text; html }`, `money(n)`, `escapeHtml(s)`, `formatEvents(events, name, now): Message | null`, `formatAccessEnded(): Message`; `sendTelegramText(chatId, text, env?, fetchImpl?): Promise<boolean>`, `interface MailTransport`, `smtpTransport(env?): MailTransport | null`, `sendEmail(transport, from, to, message): Promise<boolean>`.

- [ ] **Step 1: Write the failing tests**

`tests/monitor/access.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { accessFor } from "../../classes/monitor/access";

const start = new Date("2026-09-01T12:00:00Z");
const day = 86_400_000;

describe("acceso al monitor", () => {
  it("prueba de 14 días con los días que quedan", () => {
    expect(accessFor(start, false, new Date(start.getTime() + 3 * day))).toEqual({
      status: "trial",
      daysLeft: 11,
      endsAt: new Date(start.getTime() + 14 * day),
    });
  });

  it("vencida a los 14 días justos", () => {
    expect(accessFor(start, false, new Date(start.getTime() + 14 * day))).toEqual({
      status: "expired",
      endedAt: new Date(start.getTime() + 14 * day),
    });
  });

  it("con plan Empresa funciona siempre", () => {
    expect(accessFor(start, true, new Date(start.getTime() + 90 * day))).toEqual({ status: "business" });
  });
});
```

`tests/monitor/format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { escapeHtml, formatAccessEnded, formatEvents, money } from "../../classes/monitor/format";
import type { MonitorEvent } from "../../classes/monitor/events";

const NOW = new Date("2026-09-29T14:05:00Z");
const names: Record<string, string> = { gales: "Cambio Gales", varlix: "Varlix", la_favorita: "La Favorita" };
const name = (o: string) => names[o] ?? o;

describe("mensajes del monitor", () => {
  it("coma decimal con dos cifras", () => {
    expect(money(40.1)).toBe("40,10");
    expect(money(42.5)).toBe("42,50");
  });

  it("agrupa por moneda y habla en texto plano con nombres legibles", () => {
    const events: MonitorEvent[] = [
      { kind: "move", origin: "la_favorita", code: "USD", fromBuy: 40.1, toBuy: 40.2, fromSell: 42.6, toSell: 42.6, at: new Date("2026-09-29T14:02:00Z") },
      { kind: "position", code: "USD", side: "sell", from: 2, to: 4, of: 6, better: [{ origin: "gales", value: 42.55 }, { origin: "varlix", value: 42.6 }] },
      { kind: "quiet", code: "USD", lastOwnChangeAt: null, movers: ["gales", "varlix"] },
    ];
    const m = formatEvents(events, name, NOW)!;
    expect(m.text).toContain("USD");
    expect(m.text).toContain("La Favorita movió su pizarra (11:02): compra 40,10 → 40,20");
    expect(m.text).not.toContain("venta 42,60 → 42,60");
    expect(m.text).toContain("Tu venta bajó del 2.º al 4.º lugar entre 6 casas. Mejores ahora: Cambio Gales (42,55), Varlix (42,60).");
    expect(m.text).toContain("no se movió en todo el día y en las últimas 3 horas se movieron 2 competidores: Cambio Gales, Varlix.");
    expect(m.text).toContain("https://cambio-uruguay.com/cuenta?tab=api");
    expect(m.subject).toBe("Monitor de competencia: 3 novedades");
  });

  it("el resumen del día tiene su propio asunto", () => {
    const events: MonitorEvent[] = [
      {
        kind: "daily",
        day: "2026-09-29",
        lines: [
          {
            code: "USD",
            own: { buy: { position: 3, of: 3, better: [] }, sell: { position: 2, of: 3, better: [] } },
            bestBuy: { origin: "gales", value: 40.3 },
            bestSell: { origin: "gales", value: 42.5 },
            moves: [{ origin: "gales", count: 2 }, { origin: "varlix", count: 1 }],
          },
        ],
      },
    ];
    const m = formatEvents(events, name, NOW)!;
    expect(m.subject).toBe("Monitor de competencia: resumen del 29/9");
    expect(m.text).toContain("Tu compra: 3.º de 3 · tu venta: 2.º de 3");
    expect(m.text).toContain("Mejor compra: Cambio Gales 40,30 · mejor venta: Cambio Gales 42,50");
    expect(m.text).toContain("Se movieron hoy: Cambio Gales 2 veces, Varlix 1 vez");
  });

  it("sin eventos no hay mensaje", () => {
    expect(formatEvents([], name, NOW)).toBeNull();
  });

  it("el HTML va escapado", () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;");
    const m = formatEvents(
      [{ kind: "move", origin: "<x>", code: "USD", fromBuy: 1, toBuy: 2, fromSell: 3, toSell: 3, at: NOW }],
      (o) => o,
      NOW
    )!;
    expect(m.html).toContain("&lt;x&gt;");
    expect(m.html).not.toContain("<x>");
  });

  it("aviso de fin de prueba", () => {
    const m = formatAccessEnded();
    expect(m.subject).toBe("Terminó la prueba del monitor de competencia");
    expect(m.text).toContain("plan Empresa");
    expect(m.text).toContain("admin@cambio-uruguay.com");
  });
});
```

`tests/monitor/deliver.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { sendEmail, sendTelegramText, smtpTransport } from "../../classes/monitor/deliver";

const env = { TELEGRAM_BOT_TOKEN: "bot-de-prueba" } as NodeJS.ProcessEnv;

describe("envío del monitor", () => {
  it("Telegram en texto plano, sin parse_mode", async () => {
    const fetchImpl = vi.fn(async () => ({ json: async () => ({ ok: true }) })) as any;
    expect(await sendTelegramText("123", "Cambio_Gales movió", env, fetchImpl)).toBe(true);
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({ chat_id: "123", text: "Cambio_Gales movió" });
    expect(body.parse_mode).toBeUndefined();
  });

  it("Telegram sin token, sin chat o con error de red devuelve false sin tirar", async () => {
    const boom = vi.fn(async () => {
      throw new Error("red");
    }) as any;
    expect(await sendTelegramText("123", "x", {} as NodeJS.ProcessEnv, boom)).toBe(false);
    expect(await sendTelegramText("", "x", env, boom)).toBe(false);
    expect(await sendTelegramText("123", "x", env, boom)).toBe(false);
  });

  it("sin SMTP configurado no hay transporte y el correo devuelve false", async () => {
    expect(smtpTransport({} as NodeJS.ProcessEnv)).toBeNull();
    expect(await sendEmail(null, "a@b.uy", "c@d.uy", { subject: "s", text: "t", html: "h" })).toBe(false);
  });

  it("un correo que falla devuelve false sin tirar", async () => {
    const transport = { sendMail: vi.fn(async () => { throw new Error("smtp"); }) };
    expect(await sendEmail(transport, "a@b.uy", "c@d.uy", { subject: "s", text: "t", html: "h" })).toBe(false);
    const ok = { sendMail: vi.fn(async () => ({})) };
    expect(await sendEmail(ok, "a@b.uy", "c@d.uy", { subject: "s", text: "t", html: "h" })).toBe(true);
    expect(ok.sendMail).toHaveBeenCalledWith({ from: "a@b.uy", to: "c@d.uy", subject: "s", text: "t", html: "h" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/monitor/access.test.ts tests/monitor/format.test.ts tests/monitor/deliver.test.ts`
Expected: FAIL — cannot resolve the three modules.

- [ ] **Step 3: Implement `classes/monitor/access.ts`**

```ts
// Quién tiene el monitor andando: la prueba de 14 días, o una clave de la API con plan Empresa
// (la asigna el dueño del sitio desde /cuenta?tab=api). Puro. app/utils/competitorMonitor.ts tiene
// el espejo para mostrarlo; competitorMonitorParity.test.ts los compara.
import { TRIAL_DAYS } from "./types";

const DAY_MS = 86_400_000;

export type Access =
  | { status: "trial"; daysLeft: number; endsAt: Date }
  | { status: "business" }
  | { status: "expired"; endedAt: Date };

export function accessFor(trialStartedAt: Date, hasBusiness: boolean, now: Date): Access {
  if (hasBusiness) return { status: "business" };
  const endsAt = new Date(trialStartedAt.getTime() + TRIAL_DAYS * DAY_MS);
  if (now.getTime() < endsAt.getTime()) {
    return { status: "trial", daysLeft: Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS), endsAt };
  }
  return { status: "expired", endedAt: endsAt };
}
```

- [ ] **Step 4: Implement `classes/monitor/format.ts`**

```ts
// Los mensajes del monitor. Puro. TEXTO PLANO a propósito: los identificadores de casa llevan "_" y
// el Markdown de Telegram falla en silencio con un "_" sin cerrar (pasó con las alertas del sitio).
// El correo lleva el mismo texto y un HTML con cada línea escapada.
import moment from "moment-timezone";
import type { DailyLine, MonitorEvent } from "./events";
import type { Side } from "./types";

export const PANEL_URL = "https://cambio-uruguay.com/cuenta?tab=api";
const CONTACT = "admin@cambio-uruguay.com";
const ZONE = "America/Montevideo";
const SIDE: Record<Side, string> = { buy: "compra", sell: "venta" };

export type NameOf = (origin: string) => string;

export interface Message {
  subject: string;
  text: string;
  html: string;
}

export function money(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const hhmm = (d: Date) => moment(d).tz(ZONE).format("HH:mm");
const ordinal = (n: number) => `${n}.º`;

function toMessage(subject: string, lines: string[]): Message {
  const all = [...lines, "", `Configurar el monitor: ${PANEL_URL}`];
  return {
    subject,
    text: all.join("\n"),
    html: all.map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "")).join(""),
  };
}

function eventLine(e: Exclude<MonitorEvent, { kind: "daily" }>, name: NameOf): string {
  if (e.kind === "move") {
    const parts: string[] = [];
    if (e.fromBuy !== e.toBuy) parts.push(`compra ${money(e.fromBuy)} → ${money(e.toBuy)}`);
    if (e.fromSell !== e.toSell) parts.push(`venta ${money(e.fromSell)} → ${money(e.toSell)}`);
    return `• ${name(e.origin)} movió su pizarra (${hhmm(e.at)}): ${parts.join(" · ")}`;
  }
  if (e.kind === "position") {
    const verb = e.from === null ? "quedó" : e.to < e.from ? "subió" : "bajó";
    const from = e.from === null ? "" : ` del ${ordinal(e.from)}`;
    const ahead = e.better.length
      ? ` Mejores ahora: ${e.better.map((b) => `${name(b.origin)} (${money(b.value)})`).join(", ")}.`
      : "";
    return `• Tu ${SIDE[e.side]} ${verb}${from} al ${ordinal(e.to)} lugar entre ${e.of} casas.${ahead}`;
  }
  const since = e.lastOwnChangeAt ? `desde las ${hhmm(e.lastOwnChangeAt)}` : "en todo el día";
  return `• Tu pizarra no se movió ${since} y en las últimas 3 horas se movieron ${e.movers.length} competidores: ${e.movers
    .map(name)
    .join(", ")}.`;
}

function dailyLines(line: DailyLine, name: NameOf): string[] {
  const out = [`Resumen del día (${line.code})`];
  if (line.own) {
    const place = (p: { position: number; of: number } | null) => (p ? `${ordinal(p.position)} de ${p.of}` : "sin precio");
    out.push(`• Tu compra: ${place(line.own.buy)} · tu venta: ${place(line.own.sell)}`);
  }
  const best = (b: { origin: string; value: number } | null) => (b ? `${name(b.origin)} ${money(b.value)}` : "sin datos");
  out.push(`• Mejor compra: ${best(line.bestBuy)} · mejor venta: ${best(line.bestSell)}`);
  out.push(
    line.moves.length
      ? `• Se movieron hoy: ${line.moves
          .map((m) => `${name(m.origin)} ${m.count} ${m.count === 1 ? "vez" : "veces"}`)
          .join(", ")}`
      : "• Ningún competidor movió su pizarra hoy."
  );
  return out;
}

export function formatEvents(events: readonly MonitorEvent[], name: NameOf, now: Date): Message | null {
  if (!events.length) return null;
  const lines: string[] = [`Monitor de competencia · ${hhmm(now)}`];
  const realtime = events.filter((e): e is Exclude<MonitorEvent, { kind: "daily" }> => e.kind !== "daily");
  const codes = [...new Set(realtime.map((e) => e.code))];
  for (const code of codes) {
    lines.push("", code, ...realtime.filter((e) => e.code === code).map((e) => eventLine(e, name)));
  }
  const daily = events.find((e): e is Extract<MonitorEvent, { kind: "daily" }> => e.kind === "daily");
  if (daily) for (const line of daily.lines) lines.push("", ...dailyLines(line, name));
  const subject =
    daily && !realtime.length
      ? `Monitor de competencia: resumen del ${moment(now).tz(ZONE).format("D/M")}`
      : `Monitor de competencia: ${realtime.length} ${realtime.length === 1 ? "novedad" : "novedades"}`;
  return toMessage(subject, lines);
}

export function formatAccessEnded(): Message {
  return toMessage("Terminó la prueba del monitor de competencia", [
    "Terminó la prueba de 14 días del monitor de competencia de Cambio Uruguay.",
    `Para que siga avisándote, el monitor está incluido en el plan Empresa: escribinos a ${CONTACT}.`,
    "Tu configuración queda guardada.",
  ]);
}
```

- [ ] **Step 5: Implement `classes/monitor/deliver.ts`**

```ts
// Envío del monitor: Telegram con el bot del sitio (mismo TELEGRAM_BOT_TOKEN en la raíz y en el app,
// verificado el 29/9) y correo por SMTP con las credenciales del sitio. Nada de esto tira: devuelve
// true/false y la corrida sigue.
import type { Message } from "./format";

export async function sendTelegramText(
  chatId: string,
  text: string,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const bot = env.TELEGRAM_BOT_TOKEN;
  if (!bot || !chatId) return false;
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
    });
    const data: any = await (res as any).json().catch(() => ({}));
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export interface MailTransport {
  sendMail(opts: { from: string; to: string; subject: string; text: string; html: string }): Promise<unknown>;
}

/** El transporte SMTP, o null si falta configuración. `nodemailer` se carga recién acá. */
export function smtpTransport(env: NodeJS.ProcessEnv = process.env): MailTransport | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_FROM) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT) || 587,
    secure: env.SMTP_SECURE === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  }) as MailTransport;
}

export async function sendEmail(transport: MailTransport | null, from: string, to: string, message: Message): Promise<boolean> {
  if (!transport || !to) return false;
  try {
    await transport.sendMail({ from, to, subject: message.subject, text: message.text, html: message.html });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 6: Add `nodemailer` to the root `package.json`**

In `package.json` `dependencies`, add (alphabetical position):
```json
    "nodemailer": "^6.10.1",
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/monitor/access.test.ts tests/monitor/format.test.ts tests/monitor/deliver.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 8: Commit**

```bash
git add classes/monitor/access.ts classes/monitor/format.ts classes/monitor/deliver.ts package.json tests/monitor/access.test.ts tests/monitor/format.test.ts tests/monitor/deliver.test.ts
git commit -m "feat(monitor): acceso de prueba, mensajes en texto plano y envío

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Orquestación de la corrida

**Files:**
- Create: `classes/monitor/run.ts`
- Test: `tests/monitor/run.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`MonitorConfig`, `MonitorState`, `SnapshotRow`, `LedgerChange`, `emptyState`, `groupQuotes`, `evaluate`, `dayStart`, `MOVE_LOOKBACK_MS`, `accessFor`, `formatEvents`, `formatAccessEnded`, `Message`, `NameOf`).
- Produces: `interface RunDeps { now; monitors(); loadState(uid); saveState(state); todayRows(); changesSince(since, origins, codes); hasBusinessKey(uid); telegramChatId(uid); name; sendTelegram(chatId, text); sendEmail(to, message); log? }`, `interface RunResult { monitors; evaluated; messages; sendFailures; failures; expiredNotices }`, `runMonitors(deps): Promise<RunResult>`.

- [ ] **Step 1: Write the failing test `tests/monitor/run.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { runMonitors, type RunDeps } from "../../classes/monitor/run";
import { emptyState, type MonitorConfig, type MonitorState } from "../../classes/monitor/types";

const NOW = new Date("2026-09-29T14:05:00Z");
const min = (m: number) => new Date(NOW.getTime() - m * 60_000);

const config = (over: Partial<MonitorConfig> = {}): MonitorConfig => ({
  uid: "u1",
  email: "ana@casa.uy",
  ownOrigin: "propia",
  competitors: ["gales"],
  currencies: ["USD"],
  alerts: { moves: true, position: true, quiet: false, daily: true },
  channels: { telegram: true, email: "daily" },
  active: true,
  trialStartedAt: min(60 * 24),
  ...over,
});

function deps(over: Partial<RunDeps> = {}, states = new Map<string, MonitorState>()) {
  const sent: Array<{ via: string; to: string; text: string }> = [];
  const base: RunDeps = {
    now: NOW,
    monitors: async () => [config()],
    loadState: async (uid) => states.get(uid) ?? null,
    saveState: async (s) => {
      states.set(s.uid, s);
    },
    todayRows: async () => [
      { origin: "propia", code: "USD", type: "", buy: 40.1, sell: 42.6 },
      { origin: "gales", code: "USD", type: "", buy: 40.3, sell: 42.5 },
    ],
    changesSince: async () => [
      { origin: "gales", code: "USD", type: "", previousBuy: 40.1, previousSell: 42.6, buy: 40.3, sell: 42.5, observedAt: min(2) },
    ],
    hasBusinessKey: async () => false,
    telegramChatId: async () => "999",
    name: (o) => o,
    sendTelegram: async (to, text) => {
      sent.push({ via: "telegram", to, text });
      return true;
    },
    sendEmail: async (to, message) => {
      sent.push({ via: "email", to, text: message.text });
      return true;
    },
    log: () => undefined,
  };
  return { deps: { ...base, ...over }, sent, states };
}

describe("corrida del monitor", () => {
  it("un monitor nuevo arranca con el cursor en ahora: la primera corrida no avisa nada viejo", async () => {
    const { deps: d, sent, states } = deps();
    const r = await runMonitors(d);
    expect(r).toMatchObject({ monitors: 1, evaluated: 1, messages: 0 });
    expect(sent).toEqual([]);
    expect(states.get("u1")!.cursor).toEqual(NOW);
  });

  it("con estado previo, avisa por Telegram lo nuevo y el correo diario no recibe el movimiento", async () => {
    const states = new Map([["u1", { ...emptyState("u1", min(5)) }]]);
    const { deps: d, sent } = deps({}, states);
    const r = await runMonitors(d);
    expect(r.messages).toBe(1);
    expect(sent.map((s) => s.via)).toEqual(["telegram"]);
    expect(sent[0].text).toContain("gales movió su pizarra");
    expect(states.get("u1")!.lastSentAt).toEqual(NOW);
  });

  it("con correo en 'all' recibe lo mismo por correo", async () => {
    const states = new Map([["u1", { ...emptyState("u1", min(5)) }]]);
    const { deps: d, sent } = deps({ monitors: async () => [config({ channels: { telegram: false, email: "all" } })] }, states);
    await runMonitors(d);
    expect(sent.map((s) => [s.via, s.to])).toEqual([["email", "ana@casa.uy"]]);
  });

  it("el cursor avanza aunque el envío falle", async () => {
    const states = new Map([["u1", { ...emptyState("u1", min(5)) }]]);
    const { deps: d } = deps({ sendTelegram: async () => false }, states);
    const r = await runMonitors(d);
    expect(r.sendFailures).toBe(1);
    expect(states.get("u1")!.cursor).toEqual(NOW);
    expect(states.get("u1")!.lastSentAt).toBeNull();
  });

  it("un monitor que falla no corta a los demás", async () => {
    const states = new Map<string, MonitorState>();
    const { deps: d } = deps(
      {
        monitors: async () => [config({ uid: "roto" }), config({ uid: "sano" })],
        telegramChatId: async (uid) => {
          if (uid === "roto") throw new Error("mongo");
          return "1";
        },
      },
      states
    );
    const r = await runMonitors(d);
    expect(r.failures).toBe(1);
    expect(states.has("sano")).toBe(true);
  });

  it("prueba vencida: un solo aviso, sin evaluar, y vuelve a andar con plan Empresa", async () => {
    const expired = config({ trialStartedAt: new Date(NOW.getTime() - 15 * 86_400_000) });
    const states = new Map([["u1", { ...emptyState("u1", min(5)) }]]);
    const changesSince = vi.fn(async () => []);
    const first = deps({ monitors: async () => [expired], changesSince }, states);
    const r1 = await runMonitors(first.deps);
    expect(r1).toMatchObject({ expiredNotices: 1, evaluated: 0 });
    expect(first.sent.map((s) => s.via)).toEqual(["telegram", "email"]);
    expect(first.sent[0].text).toContain("Terminó la prueba");
    expect(changesSince).not.toHaveBeenCalled();

    const again = deps({ monitors: async () => [expired], changesSince }, states);
    const r2 = await runMonitors(again.deps);
    expect(r2.expiredNotices).toBe(0);
    expect(again.sent).toEqual([]);

    const paid = deps({ monitors: async () => [expired], hasBusinessKey: async () => true }, states);
    const r3 = await runMonitors(paid.deps);
    expect(r3.evaluated).toBe(1);
    expect(states.get("u1")!.accessEndedAt).toBeNull();
  });

  it("pide al ledger desde el principio del día y el grupo entero", async () => {
    const changesSince = vi.fn(async () => []);
    const { deps: d } = deps({ changesSince });
    await runMonitors(d);
    expect(changesSince).toHaveBeenCalledWith(new Date("2026-09-29T03:00:00.000Z"), ["propia", "gales"], ["USD"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/monitor/run.test.ts`
Expected: FAIL — cannot resolve `../../classes/monitor/run`.

- [ ] **Step 3: Implement `classes/monitor/run.ts`**

```ts
// Una corrida del job `currency-competitor-monitor`: evalúa cada monitor activo, envía y guarda su
// estado. Todo lo que toca afuera (Mongo, Telegram, SMTP) entra por `RunDeps`, así la corrida se
// prueba sin nada de eso.
//
// Reglas del diseño: el cursor avanza aunque un envío falle (un aviso de hace 20 minutos ya no
// sirve; el resumen del día lo cubre); un monitor que falla no corta a los demás; la prueba vencida
// manda UN aviso y deja de evaluar hasta que la cuenta tenga plan Empresa.
import { accessFor } from "./access";
import { dayStart, evaluate, MOVE_LOOKBACK_MS, type MonitorEvent } from "./events";
import { formatAccessEnded, formatEvents, type Message, type NameOf } from "./format";
import { groupQuotes } from "./snapshot";
import { emptyState, type LedgerChange, type MonitorConfig, type MonitorState, type SnapshotRow } from "./types";

export interface RunDeps {
  now: Date;
  monitors(): Promise<MonitorConfig[]>;
  loadState(uid: string): Promise<MonitorState | null>;
  saveState(state: MonitorState): Promise<void>;
  todayRows(): Promise<SnapshotRow[]>;
  changesSince(since: Date, origins: string[], codes: string[]): Promise<LedgerChange[]>;
  hasBusinessKey(uid: string): Promise<boolean>;
  telegramChatId(uid: string): Promise<string | null>;
  name: NameOf;
  sendTelegram(chatId: string, text: string): Promise<boolean>;
  sendEmail(to: string, message: Message): Promise<boolean>;
  log?(message: string): void;
}

export interface RunResult {
  monitors: number;
  evaluated: number;
  messages: number;
  sendFailures: number;
  failures: number;
  expiredNotices: number;
}

async function deliver(
  deps: RunDeps,
  config: MonitorConfig,
  chatId: string | null,
  forTelegram: Message | null,
  forEmail: Message | null,
  result: RunResult
): Promise<boolean> {
  let any = false;
  if (forTelegram && chatId) {
    if (await deps.sendTelegram(chatId, forTelegram.text)) {
      any = true;
      result.messages++;
    } else result.sendFailures++;
  }
  if (forEmail && config.email) {
    if (await deps.sendEmail(config.email, forEmail)) {
      any = true;
      result.messages++;
    } else result.sendFailures++;
  }
  return any;
}

export async function runMonitors(deps: RunDeps): Promise<RunResult> {
  const log = deps.log ?? ((message: string) => console.log(`[competitor-monitor] ${message}`));
  const configs = await deps.monitors();
  const result: RunResult = { monitors: configs.length, evaluated: 0, messages: 0, sendFailures: 0, failures: 0, expiredNotices: 0 };
  if (!configs.length) return result;
  const rows = await deps.todayRows();
  const since = new Date(Math.min(dayStart(deps.now).getTime(), deps.now.getTime() - MOVE_LOOKBACK_MS));

  for (const config of configs) {
    try {
      const state = (await deps.loadState(config.uid)) ?? emptyState(config.uid, deps.now);
      const access = accessFor(config.trialStartedAt, await deps.hasBusinessKey(config.uid), deps.now);
      const chatId = config.channels.telegram ? await deps.telegramChatId(config.uid) : null;

      if (access.status === "expired") {
        if (!state.accessEndedAt) {
          const notice = formatAccessEnded();
          const emailNotice = config.channels.email === "none" ? null : notice;
          if (await deliver(deps, config, chatId, notice, emailNotice, result)) state.lastSentAt = deps.now;
          state.accessEndedAt = deps.now;
          result.expiredNotices++;
        }
        state.lastRunAt = deps.now;
        await deps.saveState(state);
        continue;
      }
      state.accessEndedAt = null;

      const group = [...new Set([...(config.ownOrigin ? [config.ownOrigin] : []), ...config.competitors])];
      const quotes = groupQuotes(rows, new Set(group), new Set(config.currencies));
      const changes = await deps.changesSince(since, group, config.currencies);
      const { events, state: next } = evaluate({ config, state, now: deps.now, quotes, changes });
      result.evaluated++;

      const onlyDaily = (list: MonitorEvent[]) => list.filter((e) => e.kind === "daily");
      const forTelegram = formatEvents(events, deps.name, deps.now);
      const forEmail =
        config.channels.email === "all"
          ? forTelegram
          : config.channels.email === "daily"
          ? formatEvents(onlyDaily(events), deps.name, deps.now)
          : null;
      if (await deliver(deps, config, chatId, forTelegram, forEmail, result)) next.lastSentAt = deps.now;
      next.lastRunAt = deps.now;
      await deps.saveState(next);
    } catch (e: any) {
      result.failures++;
      log(`monitor ${config.uid}: ${e?.message || e}`);
    }
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/monitor/`
Expected: PASS (all monitor tests, 42).

- [ ] **Step 5: Commit**

```bash
git add classes/monitor/run.ts tests/monitor/run.test.ts
git commit -m "feat(monitor): corrida que evalúa, envía y guarda estado por monitor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Modelos de la base del app, job de pm2 y documentación

**Files:**
- Create: `app/server/models/CompetitorMonitor.ts`, `app/server/models/CompetitorMonitorState.ts`, `classes/models/CompetitorMonitor.ts`, `classes/models/CompetitorMonitorState.ts`, `classes/models/AppUser.ts`, `sync_competitor_monitor.ts`, `docs/api/COMPETITOR_MONITOR.md`
- Modify: `tests/appdb/schema_parity.test.ts`, `ecosystem.config.js`, `scripts/deploy-backend.sh`, `AGENTS.md`
- Test: `tests/appdb/schema_parity.test.ts` (two new cases), `tests/sync/pm2_registration.test.ts` (existing)

**Interfaces:**
- Consumes: `runMonitors`, `RunDeps` (Task 4); `sendTelegramText`, `smtpTransport`, `sendEmail` (Task 3); `apiKeyStore` (`classes/apikeys/mongo.ts`, existing); `rateChangesDb` (`classes/rate_changes.ts`); `cambio_info` (`classes/cambioInfo.ts`); `origins` (`classes/origins.ts`); `appConnection`, `appModel` (`classes/appdb.ts`).
- Produces: collections `competitormonitors`, `competitormonitorstates` (models on both sides); pm2 app `currency-competitor-monitor` (`dist/sync_competitor_monitor.js`, cron `3-58/5 * * * *`).

- [ ] **Step 1: Write the failing parity tests**

In `tests/appdb/schema_parity.test.ts`, add the imports next to the other model imports:
```ts
import { CompetitorMonitorModel } from "../../classes/models/CompetitorMonitor";
import { CompetitorMonitorStateModel } from "../../classes/models/CompetitorMonitorState";
```
and, inside `describe("app-Mongo schema parity", ...)`, add:
```ts
  it("CompetitorMonitor declares exactly the app's top-level fields", () => {
    // La configuración del monitor la escribe el app y la lee el job: un campo que el job no declare
    // no se lee nunca, y el monitor ignora en silencio lo que la persona eligió.
    expect(Object.keys(CompetitorMonitorModel.schema.obj).sort()).toEqual(appFields(appModel("CompetitorMonitor")).sort());
    expect(CompetitorMonitorModel.collection.name).toBe("competitormonitors");
  });

  it("CompetitorMonitorState declares exactly the app's top-level fields", () => {
    expect(Object.keys(CompetitorMonitorStateModel.schema.obj).sort()).toEqual(
      appFields(appModel("CompetitorMonitorState")).sort()
    );
    expect(CompetitorMonitorStateModel.collection.name).toBe("competitormonitorstates");
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/appdb/schema_parity.test.ts`
Expected: FAIL — cannot resolve `../../classes/models/CompetitorMonitor`.

- [ ] **Step 3: Create the app models**

`app/server/models/CompetitorMonitor.ts`:
```ts
import mongoose, { Schema, type Model } from 'mongoose'

// La configuración del monitor de competencia (una por cuenta). La escribe /api/me/monitor y la lee
// el job del backend `currency-competitor-monitor`. Espejo en classes/models/CompetitorMonitor.ts;
// tests/appdb/schema_parity.test.ts falla si se separan. No se borra: pausar es `active: false`,
// así volver a crearlo no reinicia la prueba (`trialStartedAt` se fija una vez).
export interface CompetitorMonitorDoc {
  uid: string
  email: string | null
  ownOrigin: string | null
  competitors: string[]
  currencies: string[]
  alerts: { moves: boolean; position: boolean; quiet: boolean; daily: boolean }
  channels: { telegram: boolean; email: 'none' | 'daily' | 'all' }
  active: boolean
  trialStartedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

const CompetitorMonitorSchema = new Schema<CompetitorMonitorDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, default: null },
    ownOrigin: { type: String, default: null },
    competitors: { type: [String], default: [] },
    currencies: { type: [String], default: ['USD'] },
    alerts: {
      moves: { type: Boolean, default: true },
      position: { type: Boolean, default: true },
      quiet: { type: Boolean, default: true },
      daily: { type: Boolean, default: true },
    },
    channels: {
      telegram: { type: Boolean, default: true },
      email: { type: String, enum: ['none', 'daily', 'all'], default: 'daily' },
    },
    active: { type: Boolean, default: true },
    trialStartedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

export const CompetitorMonitorModel: Model<CompetitorMonitorDoc> =
  (mongoose.models.CompetitorMonitor as Model<CompetitorMonitorDoc>) ||
  mongoose.model<CompetitorMonitorDoc>('CompetitorMonitor', CompetitorMonitorSchema, 'competitormonitors')
```

`app/server/models/CompetitorMonitorState.ts`:
```ts
import mongoose, { Schema, type Model } from 'mongoose'

// El estado del monitor de competencia: lo escribe SÓLO el job del backend. El app lo lee para
// mostrar cuándo fue el último aviso. Espejo en classes/models/CompetitorMonitorState.ts.
export interface CompetitorMonitorStateDoc {
  uid: string
  cursor: Date | null
  positions: Record<string, { seen: number | null; alerted: number | null }>
  quietDay: Record<string, string>
  dailyDay: string | null
  accessEndedAt: Date | null
  lastRunAt: Date | null
  lastSentAt: Date | null
}

const CompetitorMonitorStateSchema = new Schema<CompetitorMonitorStateDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    cursor: { type: Date, default: null },
    positions: { type: Schema.Types.Mixed, default: {} },
    quietDay: { type: Schema.Types.Mixed, default: {} },
    dailyDay: { type: String, default: null },
    accessEndedAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
)

export const CompetitorMonitorStateModel: Model<CompetitorMonitorStateDoc> =
  (mongoose.models.CompetitorMonitorState as Model<CompetitorMonitorStateDoc>) ||
  mongoose.model<CompetitorMonitorStateDoc>(
    'CompetitorMonitorState',
    CompetitorMonitorStateSchema,
    'competitormonitorstates'
  )
```

- [ ] **Step 4: Create the backend models**

`classes/models/CompetitorMonitor.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Vive en la base del APP. La configuración del monitor de competencia: la escribe el app
// (/api/me/monitor), la LEE el job `currency-competitor-monitor`. Espejo campo a campo de
// app/server/models/CompetitorMonitor.ts — tests/appdb/schema_parity.test.ts falla si se separan.
const CompetitorMonitorSchema = new Schema(
  {
    uid: { type: String, required: true },
    email: { type: String, default: null },
    ownOrigin: { type: String, default: null },
    competitors: { type: [String], default: [] },
    currencies: { type: [String], default: ["USD"] },
    alerts: { type: Schema.Types.Mixed, default: {} },
    channels: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
    trialStartedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const CompetitorMonitorModel = appModel<any>("CompetitorMonitor", CompetitorMonitorSchema, "competitormonitors");
```

`classes/models/CompetitorMonitorState.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Vive en la base del APP y lo escribe SÓLO el job `currency-competitor-monitor`: cursor del
// ledger, posiciones vistas y avisadas, días de avisos. Espejo de
// app/server/models/CompetitorMonitorState.ts (tests/appdb/schema_parity.test.ts).
const CompetitorMonitorStateSchema = new Schema(
  {
    uid: { type: String, required: true },
    cursor: { type: Date, default: null },
    positions: { type: Schema.Types.Mixed, default: {} },
    quietDay: { type: Schema.Types.Mixed, default: {} },
    dailyDay: { type: String, default: null },
    accessEndedAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
);

CompetitorMonitorStateSchema.index({ uid: 1 }, { unique: true });

export const CompetitorMonitorStateModel = appModel<any>(
  "CompetitorMonitorState",
  CompetitorMonitorStateSchema,
  "competitormonitorstates"
);
```

`classes/models/AppUser.ts`:
```ts
import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Lectura mínima de las cuentas del app (colección `users`, `_id` = uid de Firebase): el job del
// monitor sólo necesita el chat de Telegram vinculado. Nunca escribe acá.
const AppUserSchema = new Schema({ _id: String, telegramChatId: { type: String, default: null } }, { strict: false });

export const AppUserModel = appModel<{ _id: string; telegramChatId: string | null }>("AppUser", AppUserSchema, "users");
```

- [ ] **Step 5: Run parity to verify it passes**

Run: `npx vitest run tests/appdb/schema_parity.test.ts`
Expected: PASS.

- [ ] **Step 6: Create the entrypoint `sync_competitor_monitor.ts`**

```ts
// Monitor de competencia para casas de cambio (pm2 `currency-competitor-monitor`, cada 5 minutos,
// minutos 3, 8, 13…: después de que arrancó el sync de las :00/:05). Lee el ledger de cambios y la
// foto del día de la base del backend, la configuración y los contactos de la base del app, y avisa
// por Telegram y correo. Ver docs/api/COMPETITOR_MONITOR.md y classes/monitor/.
import dotenv from "dotenv";
dotenv.config();

import { apiKeyStore } from "./classes/apikeys/mongo";
import { appConnection } from "./classes/appdb";
import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer, withTimeout } from "./classes/database";
import { AppUserModel } from "./classes/models/AppUser";
import { CompetitorMonitorModel } from "./classes/models/CompetitorMonitor";
import { CompetitorMonitorStateModel } from "./classes/models/CompetitorMonitorState";
import { sendEmail, sendTelegramText, smtpTransport } from "./classes/monitor/deliver";
import { runMonitors } from "./classes/monitor/run";
import { MONITOR_CURRENCIES, type MonitorConfig, type MonitorCurrency, type MonitorState } from "./classes/monitor/types";
import { origins } from "./classes/origins";
import { rateChangesDb } from "./classes/rate_changes";

function houseNames(): (origin: string) => string {
  const names: Record<string, string> = {};
  for (const origin of Object.keys(origins)) {
    try {
      names[origin] = new (origins as any)[origin](origin).name || origin;
    } catch {
      names[origin] = origin;
    }
  }
  return (origin) => names[origin] ?? origin.replace(/_/g, " ");
}

function toConfig(doc: any): MonitorConfig {
  const currencies = (doc.currencies ?? []).filter((c: string) => (MONITOR_CURRENCIES as readonly string[]).includes(c));
  return {
    uid: String(doc.uid),
    email: doc.email ?? null,
    ownOrigin: doc.ownOrigin ?? null,
    competitors: Array.isArray(doc.competitors) ? doc.competitors.map(String) : [],
    currencies: currencies as MonitorCurrency[],
    alerts: {
      moves: doc.alerts?.moves !== false,
      position: doc.alerts?.position !== false,
      quiet: doc.alerts?.quiet !== false,
      daily: doc.alerts?.daily !== false,
    },
    channels: {
      telegram: doc.channels?.telegram !== false,
      email: ["none", "daily", "all"].includes(doc.channels?.email) ? doc.channels.email : "daily",
    },
    active: doc.active !== false,
    trialStartedAt: new Date(doc.trialStartedAt ?? doc.createdAt ?? Date.now()),
  };
}

function toState(doc: any): MonitorState | null {
  if (!doc) return null;
  return {
    uid: String(doc.uid),
    cursor: doc.cursor ? new Date(doc.cursor) : null,
    positions: doc.positions ?? {},
    quietDay: doc.quietDay ?? {},
    dailyDay: doc.dailyDay ?? null,
    accessEndedAt: doc.accessEndedAt ? new Date(doc.accessEndedAt) : null,
    lastRunAt: doc.lastRunAt ? new Date(doc.lastRunAt) : null,
    lastSentAt: doc.lastSentAt ? new Date(doc.lastSentAt) : null,
  };
}

async function main(): Promise<void> {
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
    await withTimeout(appConnection().asPromise(), 15000);
  } catch (e: any) {
    console.error("[competitor-monitor] no se pudo conectar a Mongo:", e?.message || e);
    process.exit(1);
  }

  const transport = smtpTransport();
  if (!transport) console.warn("[competitor-monitor] SMTP sin configurar: sólo Telegram");
  const from = process.env.SMTP_FROM || "";
  const name = houseNames();
  const changes = rateChangesDb().getModel();

  const result = await runMonitors({
    now: new Date(),
    monitors: async () => ((await CompetitorMonitorModel.find({ active: true }).lean()) as any[]).map(toConfig),
    loadState: async (uid) => toState(await CompetitorMonitorStateModel.findOne({ uid }).lean()),
    saveState: async (state) => {
      await CompetitorMonitorStateModel.updateOne({ uid: state.uid }, { $set: state }, { upsert: true });
    },
    todayRows: async () => (await cambio_info.get_data()) as any[],
    changesSince: async (since, originList, codes) => {
      const docs = (await changes
        .find({ observedAt: { $gt: since }, origin: { $in: originList }, code: { $in: codes } })
        .sort({ observedAt: 1 })
        .lean()) as any[];
      return docs.map((d) => ({
        origin: d.origin,
        code: d.code,
        type: d.type || "",
        previousBuy: Number(d.previousBuy),
        previousSell: Number(d.previousSell),
        buy: Number(d.buy),
        sell: Number(d.sell),
        observedAt: new Date(d.observedAt),
      }));
    },
    hasBusinessKey: async (uid) =>
      (await apiKeyStore().list(uid)).some((k) => k.status === "active" && k.plan === "business"),
    telegramChatId: async (uid) => {
      const user = (await AppUserModel.findOne({ _id: uid }).lean()) as any;
      return user?.telegramChatId ? String(user.telegramChatId) : null;
    },
    name,
    sendTelegram: (chatId, text) => sendTelegramText(chatId, text),
    sendEmail: (to, message) => sendEmail(transport, from, to, message),
  });

  console.log(
    `[competitor-monitor] ${result.monitors} monitores, ${result.evaluated} evaluados, ${result.messages} mensajes, ` +
      `${result.sendFailures} envíos fallidos, ${result.failures} fallas, ${result.expiredNotices} pruebas vencidas`
  );
  await appConnection().close();
  process.exit(result.failures && !result.evaluated ? 1 : 0);
}

main().catch((e) => {
  console.error("[competitor-monitor] falló la corrida", e);
  process.exit(1);
});
```

- [ ] **Step 7: Register the pm2 app**

`ecosystem.config.js` — add after the `currency-api-usage` entry:
```js
    {
      // Monitor de competencia para casas de cambio (classes/monitor/): cada 5 minutos, en los
      // minutos 3, 8, 13… para caer después de que arrancó el sync de las :00/:05. Evalúa contra el
      // ledger y la foto del día, avisa por Telegram y correo, y guarda el estado en la base del app.
      name: "currency-competitor-monitor",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_competitor_monitor.js",
      cron_restart: "3-58/5 * * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```
`scripts/deploy-backend.sh` line 51: append ` currency-competitor-monitor` before the closing `)` of `OTHER_APPS=(...)`.

- [ ] **Step 8: Docs**

`docs/api/COMPETITOR_MONITOR.md`:
```markdown
# Monitor de competencia

Diseño: `docs/superpowers/specs/2026-09-29-monitor-competencia-design.md`. Código: `classes/monitor/`,
job `sync_competitor_monitor.ts` (pm2 `currency-competitor-monitor`, cada 5 minutos).

## Qué hace

Una cuenta del sitio arma su monitor en `/cuenta?tab=api`: su casa (opcional), hasta 12
competidores, monedas (USD, EUR, BRL, ARS), qué avisos quiere y por dónde. El job avisa:

- **Movimiento**: un competidor cambió su pizarra — sólo si el valor nuevo es el que publica hoy la
  foto (el ledger también registra cambios que la guarda de plausibilidad rechazó).
- **Posición**: la casa propia cambió de puesto en compra o venta — visto en dos corridas seguidas.
- **Pizarra quieta**: la propia no se movió en 3 h y se movieron ≥ 2 competidores (lunes a viernes,
  10:00–19:00, una vez por día por moneda).
- **Resumen**: desde las 18:30, una vez por día.

## Acceso

14 días de prueba desde el primer guardado (`trialStartedAt`, no se reinicia). Después sigue sólo
si la cuenta tiene una clave de la API activa con plan `business` (se asigna en el panel de
clientes de `/cuenta?tab=api`). Al vencer se manda un aviso y el monitor deja de evaluarse.

## Dónde vive cada cosa

| qué | dónde |
|---|---|
| configuración (la escribe el app) | base del app, `competitormonitors` |
| estado (lo escribe el job) | base del app, `competitormonitorstates` |
| cambios de pizarra | base del backend, `cambio_changes` |
| chat de Telegram | base del app, `users.telegramChatId` |

## Configuración

`.env` de la raíz: `APP_MONGO_URI`, `TELEGRAM_BOT_TOKEN` (el mismo bot del sitio) y `SMTP_*`
(copiadas de `app/.env`). Sin SMTP, sólo Telegram.
```

`AGENTS.md` — add a row to the pm2 table right after the `currency-api-usage` row:
```markdown
| currency-competitor-monitor | dist/sync_competitor_monitor.js | 3-58/5 * * * * | monitor de competencia para casas de cambio (venta a empresas): por cada `competitormonitors` activo (base del app, lo escribe `/api/me/monitor`), foto del grupo de hoy + ledger `cambio_changes` → avisos por Telegram (mismo bot del sitio, texto plano) y correo (`SMTP_*` en el `.env` de la raíz). Un movimiento se confirma contra la foto (el ledger registra antes de la guarda de plausibilidad); la posición se avisa si se vio igual dos corridas seguidas; "quieta" sólo L–V 10–19. 14 días de prueba y después sólo con una clave `business` (`api_keys`). Estado en `competitormonitorstates`. Ver `docs/api/COMPETITOR_MONITOR.md` |
```
and add `monitor` to the per-feature dirs list in the `classes/` key-files paragraph (alphabetical, before `motos` if present, otherwise after `marketseries`).

- [ ] **Step 9: Type-check and run the backend tests**

Run: `npx tsc -p tsconfig.production.json --noEmit --pretty false 2>&1 | grep -v "sheet_key"`
Expected: no output.
Run: `npx vitest run tests/monitor/ tests/appdb/schema_parity.test.ts tests/sync/pm2_registration.test.ts tests/no_scheduler_in_api.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add app/server/models/CompetitorMonitor.ts app/server/models/CompetitorMonitorState.ts classes/models/CompetitorMonitor.ts classes/models/CompetitorMonitorState.ts classes/models/AppUser.ts sync_competitor_monitor.ts tests/appdb/schema_parity.test.ts ecosystem.config.js scripts/deploy-backend.sh docs/api/COMPETITOR_MONITOR.md AGENTS.md
git commit -m "feat(monitor): job currency-competitor-monitor y modelos en la base del app

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: App — validación, acceso y rutas de servidor

**Files:**
- Create: `app/utils/competitorMonitor.ts`, `app/server/utils/monitorHouses.ts`, `app/server/api/me/monitor/index.get.ts`, `app/server/api/me/monitor/index.put.ts`, `app/server/api/admin/monitors.get.ts`
- Modify: `.github/workflows/deploy.yml` (`appContracts` += `classes/monitor/types.ts`, `classes/monitor/access.ts`)
- Test: `app/tests/unit/competitorMonitor.test.ts`, `app/tests/unit/competitorMonitorParity.test.ts`, `app/tests/unit/apiMonitorRoutes.test.ts`

**Interfaces:**
- Consumes: app models (Task 5); `requireUser` (`{uid, email, emailVerified, anonymous}`), `requireAdmin`, `connectDb`, `apiAdminFetch` (existing); backend `GET /localData` → `Record<origin, { name }>`.
- Produces: `app/utils/competitorMonitor.ts`: `MonitorCurrency`, `MONITOR_CURRENCIES`, `MAX_COMPETITORS`, `TRIAL_DAYS`, `EmailMode`, `MonitorInput`, `MonitorAccess`, `monitorAccess(trialStartedAt, hasBusiness, now?)`, `sanitizeMonitor(body, eligible): { ok: true; value: MonitorInput } | { ok: false; error: string }`, `emptyMonitorInput()`; `app/server/utils/monitorHouses.ts`: `loadMonitorHouses(): Promise<{ id: string; name: string }[]>`; HTTP `GET /api/me/monitor` → `{ monitor, access, lastSentAt, telegramLinked, canCreate, houses }`, `PUT /api/me/monitor` → `{ ok: true }`, `GET /api/admin/monitors` → `{ monitors: [...] }`.

- [ ] **Step 1: Write the failing tests**

`app/tests/unit/competitorMonitor.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { monitorAccess, sanitizeMonitor } from '../../utils/competitorMonitor'

const houses = new Set(['propia', 'gales', 'varlix', 'aeromar'])
const good = {
  ownOrigin: 'propia',
  competitors: ['gales', 'varlix'],
  currencies: ['USD', 'EUR'],
  alerts: { moves: true, position: true, quiet: false, daily: true },
  channels: { telegram: true, email: 'all' },
  active: true,
}

describe('validación del monitor', () => {
  it('acepta un monitor completo', () => {
    expect(sanitizeMonitor(good, houses)).toEqual({ ok: true, value: good })
  })

  it('saca repetidos y la casa propia de los competidores', () => {
    const r = sanitizeMonitor({ ...good, competitors: ['gales', 'gales', 'propia', 'varlix'] }, houses)
    expect(r).toMatchObject({ ok: true, value: { competitors: ['gales', 'varlix'] } })
  })

  it('rechaza casas que no existen, el BCU, más de 12 competidores o ninguno', () => {
    expect(sanitizeMonitor({ ...good, competitors: ['inventada'] }, houses)).toMatchObject({ ok: false })
    expect(sanitizeMonitor({ ...good, ownOrigin: 'bcu' }, new Set([...houses, 'bcu']))).toMatchObject({ ok: false })
    expect(sanitizeMonitor({ ...good, competitors: [] }, houses)).toMatchObject({ ok: false })
    const many = new Set(Array.from({ length: 14 }, (_, i) => `c${i}`))
    expect(
      sanitizeMonitor({ ...good, ownOrigin: null, competitors: [...many] }, many)
    ).toMatchObject({ ok: false, error: 'Elegí entre 1 y 12 competidores.' })
  })

  it('sin casa propia apaga posición y quieta', () => {
    const r = sanitizeMonitor({ ...good, ownOrigin: null, alerts: { moves: true, position: true, quiet: true, daily: true } }, houses)
    expect(r).toMatchObject({ ok: true, value: { ownOrigin: null, alerts: { position: false, quiet: false } } })
  })

  it('monedas: sólo las cuatro y al menos una', () => {
    expect(sanitizeMonitor({ ...good, currencies: ['USD', 'JPY'] }, houses)).toMatchObject({ ok: true, value: { currencies: ['USD'] } })
    expect(sanitizeMonitor({ ...good, currencies: ['JPY'] }, houses)).toMatchObject({ ok: false })
  })

  it('canal de correo desconocido cae en el resumen diario', () => {
    expect(sanitizeMonitor({ ...good, channels: { telegram: false, email: 'spam' } }, houses)).toMatchObject({
      ok: true,
      value: { channels: { telegram: false, email: 'daily' } },
    })
  })
})

describe('acceso al monitor (espejo del backend)', () => {
  it('prueba, Empresa y vencido', () => {
    const start = new Date('2026-09-01T12:00:00Z')
    expect(monitorAccess(start, false, new Date('2026-09-04T12:00:00Z'))).toMatchObject({ status: 'trial', daysLeft: 11 })
    expect(monitorAccess(start, false, new Date('2026-09-15T12:00:00Z'))).toMatchObject({ status: 'expired' })
    expect(monitorAccess(start, true, new Date('2026-12-01T12:00:00Z'))).toEqual({ status: 'business' })
  })
})
```

`app/tests/unit/competitorMonitorParity.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { accessFor } from '../../../classes/monitor/access'
import { MAX_COMPETITORS as API_MAX, MONITOR_CURRENCIES as API_CURRENCIES, TRIAL_DAYS as API_TRIAL } from '../../../classes/monitor/types'
import { MAX_COMPETITORS, MONITOR_CURRENCIES, TRIAL_DAYS, monitorAccess } from '../../utils/competitorMonitor'

// El panel promete lo que el job cumple: si la prueba, el tope o las monedas cambian de un lado y no
// del otro, la cuenta ve "te quedan 3 días" mientras el job ya cortó.
describe('monitor: el app y el job dicen lo mismo', () => {
  it('constantes', () => {
    expect(TRIAL_DAYS).toBe(API_TRIAL)
    expect(MAX_COMPETITORS).toBe(API_MAX)
    expect([...MONITOR_CURRENCIES]).toEqual([...API_CURRENCIES])
  })

  it('el acceso da el mismo estado en los bordes', () => {
    const start = new Date('2026-09-01T12:00:00Z')
    for (const offsetDays of [0, 13.99, 14, 30]) {
      const now = new Date(start.getTime() + offsetDays * 86_400_000)
      for (const business of [false, true]) {
        expect(monitorAccess(start, business, now).status).toBe(accessFor(start, business, now).status)
      }
    }
  })
})
```

`app/tests/unit/apiMonitorRoutes.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installNitroGlobals } from './helpers/nitro'

const requireUser = vi.fn()
const requireAdmin = vi.fn()
const setResponseHeader = vi.fn()
const fetchMock = vi.fn()
const monitorFindOne = vi.fn()
const monitorFind = vi.fn()
const monitorUpsert = vi.fn()
const stateFindOne = vi.fn()
const stateFind = vi.fn()
const userFindById = vi.fn()
const apiAdminFetch = vi.fn()

vi.mock('../../server/utils/auth', () => ({ requireUser }))
vi.mock('../../server/utils/requireAdmin', () => ({ requireAdmin }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn().mockResolvedValue(null) }))
vi.mock('../../server/utils/apiAdmin', () => ({ apiAdminFetch }))
vi.mock('../../server/models/CompetitorMonitor', () => ({
  CompetitorMonitorModel: { findOne: monitorFindOne, find: monitorFind, findOneAndUpdate: monitorUpsert },
}))
vi.mock('../../server/models/CompetitorMonitorState', () => ({
  CompetitorMonitorStateModel: { findOne: stateFindOne, find: stateFind },
}))
vi.mock('../../server/models/User', () => ({ UserModel: { findById: userFindById } }))
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('setResponseHeader', setResponseHeader)

const { readBody, useRuntimeConfig } = installNitroGlobals()
const getH = (await import('../../server/api/me/monitor/index.get')).default
const putH = (await import('../../server/api/me/monitor/index.put')).default
const adminH = (await import('../../server/api/admin/monitors.get')).default

const lean = (value: unknown) => ({ lean: () => ({ exec: () => Promise.resolve(value) }) })
const sorted = (value: unknown) => ({ sort: () => lean(value) })

const good = {
  ownOrigin: 'propia',
  competitors: ['gales'],
  currencies: ['USD'],
  alerts: { moves: true, position: true, quiet: true, daily: true },
  channels: { telegram: true, email: 'daily' },
  active: true,
}

beforeEach(() => {
  ;[requireUser, requireAdmin, setResponseHeader, fetchMock, monitorFindOne, monitorFind, monitorUpsert, stateFindOne, stateFind, userFindById, apiAdminFetch, readBody].forEach(m => m.mockReset())
  useRuntimeConfig.mockImplementation(() => ({ apiBaseServer: 'http://api.test' }))
  requireUser.mockResolvedValue({ uid: 'u1', email: 'ana@casa.uy', emailVerified: true, anonymous: false })
  fetchMock.mockResolvedValue({ propia: { name: 'Mi Casa' }, gales: { name: 'Cambio Gales' }, bcu: { name: 'BCU' } })
  apiAdminFetch.mockResolvedValue({ keys: [] })
})

describe('GET /api/me/monitor', () => {
  it('devuelve la configuración, el acceso y las casas sin el BCU', async () => {
    monitorFindOne.mockReturnValueOnce(lean({ ...good, uid: 'u1', email: 'ana@casa.uy', trialStartedAt: new Date() }))
    stateFindOne.mockReturnValueOnce(lean({ lastSentAt: new Date('2026-09-29T14:00:00Z') }))
    userFindById.mockReturnValueOnce(lean({ telegramChatId: '999' }))
    const res: any = await getH({} as any)
    expect(res.monitor).toMatchObject({ ownOrigin: 'propia', competitors: ['gales'] })
    expect(res.access).toMatchObject({ status: 'trial', daysLeft: 14 })
    expect(res.telegramLinked).toBe(true)
    expect(res.canCreate).toBe(true)
    expect(res.houses).toEqual([
      { id: 'gales', name: 'Cambio Gales' },
      { id: 'propia', name: 'Mi Casa' },
    ])
    expect(setResponseHeader).toHaveBeenCalledWith({}, 'cache-control', 'private, no-store')
  })

  it('una clave Empresa activa hace que el acceso sea Empresa', async () => {
    monitorFindOne.mockReturnValueOnce(lean({ ...good, uid: 'u1', trialStartedAt: new Date('2026-01-01T00:00:00Z') }))
    stateFindOne.mockReturnValueOnce(lean(null))
    userFindById.mockReturnValueOnce(lean(null))
    apiAdminFetch.mockResolvedValueOnce({ keys: [{ status: 'active', plan: 'business' }] })
    const res: any = await getH({} as any)
    expect(res.access).toEqual({ status: 'business' })
  })
})

describe('PUT /api/me/monitor', () => {
  it('una sesión de invitado o sin correo verificado no arma monitores', async () => {
    requireUser.mockResolvedValueOnce({ uid: 'g', email: null, emailVerified: false, anonymous: true })
    readBody.mockResolvedValueOnce(good)
    await expect(putH({} as any)).rejects.toMatchObject({ statusCode: 403 })
    expect(monitorUpsert).not.toHaveBeenCalled()
  })

  it('guarda con el correo de la sesión y fija la prueba sólo la primera vez', async () => {
    readBody.mockResolvedValueOnce({ ...good, email: 'otro@mail.uy', trialStartedAt: '2020-01-01' })
    monitorUpsert.mockReturnValueOnce(lean({}))
    expect(await putH({} as any)).toEqual({ ok: true })
    const [filter, update, options] = monitorUpsert.mock.calls[0]
    expect(filter).toEqual({ uid: 'u1' })
    expect(update.$set).toMatchObject({ ...good, email: 'ana@casa.uy' })
    expect(update.$set.trialStartedAt).toBeUndefined()
    expect(update.$setOnInsert.trialStartedAt).toBeInstanceOf(Date)
    expect(options).toMatchObject({ upsert: true })
  })

  it('una configuración inválida es 400 con el mensaje', async () => {
    readBody.mockResolvedValueOnce({ ...good, competitors: ['inventada'] })
    await expect(putH({} as any)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('sin la lista de casas no se puede validar: 502', async () => {
    fetchMock.mockRejectedValueOnce(new Error('api caída'))
    readBody.mockResolvedValueOnce(good)
    await expect(putH({} as any)).rejects.toMatchObject({ statusCode: 502 })
  })
})

describe('GET /api/admin/monitors', () => {
  it('exige administrador', async () => {
    requireAdmin.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
    await expect(adminH({} as any)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('lista con acceso y último envío', async () => {
    requireAdmin.mockResolvedValueOnce({ uid: 'admin' })
    monitorFind.mockReturnValueOnce(sorted([{ ...good, uid: 'u1', email: 'ana@casa.uy', trialStartedAt: new Date() }]))
    stateFind.mockReturnValueOnce(lean([{ uid: 'u1', lastSentAt: new Date('2026-09-29T14:00:00Z') }]))
    apiAdminFetch.mockResolvedValueOnce({ keys: [] })
    const res: any = await adminH({} as any)
    expect(res.monitors[0]).toMatchObject({ uid: 'u1', email: 'ana@casa.uy', access: { status: 'trial' } })
    expect(res.monitors[0].lastSentAt).toBe('2026-09-29T14:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run to verify they fail**

Run (from `app/`): `npx vitest run tests/unit/competitorMonitor.test.ts tests/unit/competitorMonitorParity.test.ts tests/unit/apiMonitorRoutes.test.ts`
Expected: FAIL — cannot resolve `../../utils/competitorMonitor` and the routes.

- [ ] **Step 3: Implement `app/utils/competitorMonitor.ts`**

```ts
// Espejo en el app del monitor de competencia (classes/monitor/): constantes, estado de acceso para
// mostrar y la validación de lo que guarda /api/me/monitor. El job del backend es quien evalúa y
// avisa; competitorMonitorParity.test.ts ata las constantes y el acceso a las del backend.

export type MonitorCurrency = 'USD' | 'EUR' | 'BRL' | 'ARS'
export const MONITOR_CURRENCIES: readonly MonitorCurrency[] = ['USD', 'EUR', 'BRL', 'ARS']
export const MAX_COMPETITORS = 12
export const TRIAL_DAYS = 14
export type EmailMode = 'none' | 'daily' | 'all'

export interface MonitorInput {
  ownOrigin: string | null
  competitors: string[]
  currencies: MonitorCurrency[]
  alerts: { moves: boolean; position: boolean; quiet: boolean; daily: boolean }
  channels: { telegram: boolean; email: EmailMode }
  active: boolean
}

export type MonitorAccess =
  | { status: 'trial'; daysLeft: number; endsAt: string }
  | { status: 'business' }
  | { status: 'expired'; endedAt: string }

const DAY_MS = 86_400_000

export function monitorAccess(trialStartedAt: Date | string, hasBusiness: boolean, now = new Date()): MonitorAccess {
  if (hasBusiness) return { status: 'business' }
  const endsAt = new Date(new Date(trialStartedAt).getTime() + TRIAL_DAYS * DAY_MS)
  if (now.getTime() < endsAt.getTime()) {
    return { status: 'trial', daysLeft: Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS), endsAt: endsAt.toISOString() }
  }
  return { status: 'expired', endedAt: endsAt.toISOString() }
}

export function emptyMonitorInput(): MonitorInput {
  return {
    ownOrigin: null,
    competitors: [],
    currencies: ['USD'],
    alerts: { moves: true, position: true, quiet: true, daily: true },
    channels: { telegram: true, email: 'daily' },
    active: true,
  }
}

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)

export function sanitizeMonitor(
  body: unknown,
  eligible: ReadonlySet<string>
): { ok: true; value: MonitorInput } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>
  const isHouse = (id: unknown): id is string => typeof id === 'string' && id !== 'bcu' && eligible.has(id)

  let ownOrigin: string | null = null
  if (b.ownOrigin !== null && b.ownOrigin !== undefined && b.ownOrigin !== '') {
    if (!isHouse(b.ownOrigin)) return { ok: false, error: 'La casa propia no está entre las casas del sitio.' }
    ownOrigin = b.ownOrigin
  }

  const raw: unknown[] = Array.isArray(b.competitors) ? b.competitors : []
  if (raw.some(id => !isHouse(id))) return { ok: false, error: 'Hay un competidor que no está entre las casas del sitio.' }
  const competitors = [...new Set(raw as string[])].filter(id => id !== ownOrigin)
  if (competitors.length < 1 || competitors.length > MAX_COMPETITORS) {
    return { ok: false, error: `Elegí entre 1 y ${MAX_COMPETITORS} competidores.` }
  }

  const currencies = [...new Set(Array.isArray(b.currencies) ? b.currencies : [])].filter(
    (c): c is MonitorCurrency => (MONITOR_CURRENCIES as readonly unknown[]).includes(c)
  )
  if (!currencies.length) return { ok: false, error: 'Elegí al menos una moneda.' }

  const alerts = {
    moves: bool(b.alerts?.moves, true),
    position: ownOrigin ? bool(b.alerts?.position, true) : false,
    quiet: ownOrigin ? bool(b.alerts?.quiet, true) : false,
    daily: bool(b.alerts?.daily, true),
  }
  const email: EmailMode = ['none', 'daily', 'all'].includes(b.channels?.email) ? b.channels.email : 'daily'
  return {
    ok: true,
    value: {
      ownOrigin,
      competitors,
      currencies,
      alerts,
      channels: { telegram: bool(b.channels?.telegram, true), email },
      active: bool(b.active, true),
    },
  }
}
```

- [ ] **Step 4: Implement `app/server/utils/monitorHouses.ts`**

```ts
// Las casas que se pueden elegir en el monitor: las que conoce la API (`/localData`), sin el BCU,
// ordenadas por nombre. Tira si la API no contesta: sin la lista no se puede validar un guardado.
export async function loadMonitorHouses(): Promise<{ id: string; name: string }[]> {
  const data = await $fetch<Record<string, { name?: string }>>('/localData', {
    baseURL: useRuntimeConfig().apiBaseServer,
    timeout: 8000,
  })
  return Object.entries(data ?? {})
    .filter(([id]) => id !== 'bcu')
    .map(([id, info]) => ({ id, name: info?.name || id }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
```

- [ ] **Step 5: Implement the three routes**

`app/server/api/me/monitor/index.get.ts`:
```ts
// El monitor de competencia de la cuenta en sesión: configuración, acceso (prueba/Empresa/vencido),
// último aviso, si tiene Telegram vinculado y las casas elegibles. Privado y sin caché.
import { CompetitorMonitorModel } from '../../../models/CompetitorMonitor'
import { CompetitorMonitorStateModel } from '../../../models/CompetitorMonitorState'
import { UserModel } from '../../../models/User'
import { monitorAccess } from '../../../../utils/competitorMonitor'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { loadMonitorHouses } from '../../../utils/monitorHouses'

async function hasBusinessKey(uid: string): Promise<boolean> {
  try {
    const { keys } = await apiAdminFetch<{ keys: { status: string; plan: string }[] }>('/admin/api-keys', {
      query: { ownerUid: uid },
    })
    return keys.some(k => k.status === 'active' && k.plan === 'business')
  } catch {
    return false
  }
}

export default defineEventHandler(async event => {
  const { uid, email, emailVerified, anonymous } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  await connectDb()
  const [monitor, state, user, houses, business] = await Promise.all([
    CompetitorMonitorModel.findOne({ uid }).lean().exec(),
    CompetitorMonitorStateModel.findOne({ uid }).lean().exec(),
    UserModel.findById(uid).lean().exec(),
    loadMonitorHouses().catch(() => []),
    hasBusinessKey(uid),
  ])
  return {
    monitor: monitor
      ? {
          ownOrigin: monitor.ownOrigin,
          competitors: monitor.competitors,
          currencies: monitor.currencies,
          alerts: monitor.alerts,
          channels: monitor.channels,
          active: monitor.active,
        }
      : null,
    access: monitor ? monitorAccess(monitor.trialStartedAt, business) : null,
    lastSentAt: state?.lastSentAt ?? null,
    telegramLinked: Boolean(user?.telegramChatId),
    canCreate: !anonymous && Boolean(email) && emailVerified,
    houses,
  }
})
```

`app/server/api/me/monitor/index.put.ts`:
```ts
// Guardar el monitor de competencia de la cuenta en sesión. El correo sale de la SESIÓN (verificado)
// y la prueba se fija una sola vez (`$setOnInsert`): volver a guardar, pausar o reactivar no la reinicia.
import { CompetitorMonitorModel } from '../../../models/CompetitorMonitor'
import { sanitizeMonitor } from '../../../../utils/competitorMonitor'
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { loadMonitorHouses } from '../../../utils/monitorHouses'

export default defineEventHandler(async event => {
  const { uid, email, emailVerified, anonymous } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  if (anonymous || !email || !emailVerified) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Para usar el monitor necesitás una cuenta con correo verificado: entrá con Google o verificá tu correo.',
    })
  }
  const body = await readBody(event)
  let houses: { id: string }[]
  try {
    houses = await loadMonitorHouses()
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'No pudimos leer la lista de casas. Probá de nuevo en un rato.' })
  }
  const parsed = sanitizeMonitor(body, new Set(houses.map(h => h.id)))
  if (parsed.ok === false) throw createError({ statusCode: 400, statusMessage: parsed.error })
  await connectDb()
  await CompetitorMonitorModel.findOneAndUpdate(
    { uid },
    { $set: { ...parsed.value, email }, $setOnInsert: { trialStartedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean()
    .exec()
  return { ok: true }
})
```

`app/server/api/admin/monitors.get.ts`:
```ts
// Panel de clientes: todos los monitores de competencia con su acceso y el último aviso. Sólo
// NUXT_ADMIN_EMAILS, nunca cacheado.
import { CompetitorMonitorModel } from '../../models/CompetitorMonitor'
import { CompetitorMonitorStateModel } from '../../models/CompetitorMonitorState'
import { monitorAccess } from '../../../utils/competitorMonitor'
import { apiAdminFetch } from '../../utils/apiAdmin'
import { connectDb } from '../../utils/db'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  await connectDb()
  const monitors = await CompetitorMonitorModel.find({}).sort({ createdAt: -1 }).lean().exec()
  const states = await CompetitorMonitorStateModel.find({ uid: { $in: monitors.map(m => m.uid) } })
    .lean()
    .exec()
  const lastSent = new Map(states.map(s => [s.uid, s.lastSentAt]))
  let business = new Set<string>()
  try {
    const { keys } = await apiAdminFetch<{ keys: { ownerUid: string; status: string; plan: string }[] }>(
      '/admin/api-keys',
      { query: {} }
    )
    business = new Set(keys.filter(k => k.status === 'active' && k.plan === 'business').map(k => k.ownerUid))
  } catch {
    // Sin la API, el acceso se muestra como si no hubiera plan: el panel sigue sirviendo.
  }
  return {
    monitors: monitors.map(m => ({
      uid: m.uid,
      email: m.email,
      ownOrigin: m.ownOrigin,
      competitors: m.competitors,
      currencies: m.currencies,
      active: m.active,
      access: monitorAccess(m.trialStartedAt, business.has(m.uid)),
      lastSentAt: lastSent.get(m.uid) ? new Date(lastSent.get(m.uid) as Date).toISOString() : null,
      createdAt: m.createdAt ?? null,
    })),
  }
})
```

- [ ] **Step 6: Add the root files the parity test reads to `appContracts`**

In `.github/workflows/deploy.yml`, under `appContracts:` next to `- 'classes/apikeys/validate.ts'`, add:
```yaml
              - 'classes/monitor/types.ts'
              - 'classes/monitor/access.ts'
```

- [ ] **Step 7: Run to verify they pass**

Run (from `app/`): `npx vitest run tests/unit/competitorMonitor.test.ts tests/unit/competitorMonitorParity.test.ts tests/unit/apiMonitorRoutes.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 8: Lint and commit**

Run (from `app/`): `node node_modules/eslint/bin/eslint.js --fix utils/competitorMonitor.ts server/utils/monitorHouses.ts server/api/me/monitor server/api/admin/monitors.get.ts server/models/CompetitorMonitor.ts server/models/CompetitorMonitorState.ts tests/unit/competitorMonitor.test.ts tests/unit/competitorMonitorParity.test.ts tests/unit/apiMonitorRoutes.test.ts`
Then re-run Step 7 (prettier can re-wrap assertions).

```bash
git add app/utils/competitorMonitor.ts app/server/utils/monitorHouses.ts app/server/api/me/monitor app/server/api/admin/monitors.get.ts app/server/models/CompetitorMonitor.ts app/server/models/CompetitorMonitorState.ts .github/workflows/deploy.yml app/tests/unit/competitorMonitor.test.ts app/tests/unit/competitorMonitorParity.test.ts app/tests/unit/apiMonitorRoutes.test.ts
git commit -m "feat(app): rutas del monitor de competencia con prueba de 14 días

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: App — panel del monitor, panel de administración y `/empresas`

**Files:**
- Create: `app/components/account/CompetitorMonitorPanel.vue`
- Modify: `app/pages/cuenta/index.vue` (api tab), `app/components/account/ApiClientsAdminPanel.vue` (monitors table), `app/pages/empresas.vue` (use-case copy + CTA)
- Test: extend `app/tests/unit/cuentaApiTab.test.ts`, `app/tests/unit/empresasPage.test.ts`

**Interfaces:**
- Consumes: `GET|PUT /api/me/monitor`, `GET /api/admin/monitors` (Task 6); `app/utils/competitorMonitor.ts` (Task 6); `<AccountTelegramLink />` (existing); `useAuthFetch()`.
- Produces: `<AccountCompetitorMonitorPanel />` rendered in `/cuenta?tab=api`.

- [ ] **Step 1: Extend the source-level tests (failing)**

In `app/tests/unit/cuentaApiTab.test.ts`, add inside the existing `describe`:
```ts
  it('la pestaña api monta el monitor de competencia entre las claves y la administración', () => {
    const tab = page.slice(page.indexOf('<VTabsWindowItem value="api">'))
    const keys = tab.indexOf('<AccountApiKeysPanel />')
    const monitor = tab.indexOf('<AccountCompetitorMonitorPanel />')
    const admin = tab.indexOf('<AccountApiClientsAdminPanel />')
    expect(keys).toBeGreaterThan(-1)
    expect(monitor).toBeGreaterThan(keys)
    expect(admin).toBeGreaterThan(monitor)
  })

  it('el monitor ofrece vincular Telegram y muestra el estado de la prueba', () => {
    const panel = read('components/account/CompetitorMonitorPanel.vue')
    expect(panel).toContain('<AccountTelegramLink')
    expect(panel).toContain("'/api/me/monitor'")
    expect(panel).toContain('TRIAL_DAYS')
    expect(panel).toContain('daysLeft')
  })

  it('el panel de administración lista los monitores', () => {
    expect(read('components/account/ApiClientsAdminPanel.vue')).toContain("'/api/admin/monitors'")
  })
```

In `app/tests/unit/empresasPage.test.ts`, add:
```ts
  it('el monitoreo de competencia dice que se prueba gratis, con la constante', () => {
    expect(page).toContain('TRIAL_DAYS')
    expect(page).toContain('Monitoreo de competencia')
  })
```

- [ ] **Step 2: Run to verify they fail**

Run (from `app/`): `npx vitest run tests/unit/cuentaApiTab.test.ts tests/unit/empresasPage.test.ts`
Expected: FAIL — `ENOENT` for the panel and missing strings.

- [ ] **Step 3: Create `app/components/account/CompetitorMonitorPanel.vue`**

```vue
<template>
  <section class="monitor-panel mt-10">
    <h2 class="text-h6 font-weight-bold mb-1">Monitor de competencia</h2>
    <p class="text-body-2 text-medium-emphasis mb-4 monitor-panel__intro">
      Te avisamos por Telegram o por correo cuando otra casa mueve su pizarra, cuando cambia tu lugar
      en el grupo o cuando la tuya quedó quieta mientras las demás se movieron, y te mandamos un
      resumen al cierre del día. {{ TRIAL_DAYS }} días de prueba gratis; después sigue con el plan
      Empresa.
    </p>

    <VProgressLinear v-if="loading" indeterminate class="mb-3" />
    <VAlert v-else-if="loadError" type="error" variant="tonal" class="mb-4">{{ loadError }}</VAlert>
    <template v-else-if="data">
      <VAlert v-if="!data.canCreate" type="info" variant="tonal" class="mb-4">
        Para usar el monitor necesitás una cuenta con correo verificado: entrá con Google, o abrí el
        enlace de verificación que te mandamos al registrarte con correo y contraseña.
      </VAlert>
      <template v-else>
        <VAlert v-if="data.access" :type="accessType" variant="tonal" density="compact" class="mb-4">
          <template v-if="data.access.status === 'trial'">
            Prueba gratis: te quedan {{ data.access.daysLeft }}
            {{ data.access.daysLeft === 1 ? 'día' : 'días' }}.
          </template>
          <template v-else-if="data.access.status === 'business'">Activo con el plan Empresa.</template>
          <template v-else>
            Terminó la prueba. Para que siga avisándote, escribinos a {{ API_CONTACT_EMAIL }} por el plan
            Empresa. Tu configuración queda guardada.
          </template>
          <span v-if="data.lastSentAt"> Último aviso: {{ formatDay(data.lastSentAt) }}.</span>
        </VAlert>

        <VCard variant="outlined" class="pa-4">
          <form @submit.prevent="save">
            <VRow dense>
              <VCol cols="12" md="6">
                <VAutocomplete
                  v-model="form.ownOrigin"
                  :items="houseItems"
                  label="Tu casa (opcional)"
                  hint="Sin casa propia, el monitor sólo avisa movimientos y el resumen"
                  persistent-hint
                  clearable
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VAutocomplete
                  v-model="form.competitors"
                  :items="competitorItems"
                  :label="`Competidores (hasta ${MAX_COMPETITORS})`"
                  multiple
                  chips
                  closable-chips
                  density="comfortable"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="form.currencies"
                  :items="[...MONITOR_CURRENCIES]"
                  label="Monedas"
                  multiple
                  chips
                  density="comfortable"
                />
              </VCol>
            </VRow>

            <h3 class="text-subtitle-2 font-weight-bold mt-2 mb-1">Avisos</h3>
            <VRow dense>
              <VCol cols="12" sm="6">
                <VCheckbox v-model="form.alerts.moves" label="Un competidor movió su pizarra" density="compact" hide-details />
                <VCheckbox
                  v-model="form.alerts.position"
                  label="Cambió tu lugar en el grupo"
                  :disabled="!form.ownOrigin"
                  density="compact"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VCheckbox
                  v-model="form.alerts.quiet"
                  label="Tu pizarra quedó quieta y las demás se movieron"
                  :disabled="!form.ownOrigin"
                  density="compact"
                  hide-details
                />
                <VCheckbox v-model="form.alerts.daily" label="Resumen al cierre del día (18:30)" density="compact" hide-details />
              </VCol>
            </VRow>

            <h3 class="text-subtitle-2 font-weight-bold mt-4 mb-1">Por dónde</h3>
            <VRow dense align="center">
              <VCol cols="12" sm="6">
                <VSwitch v-model="form.channels.telegram" label="Telegram, al momento" color="primary" density="compact" hide-details />
              </VCol>
              <VCol cols="12" sm="6">
                <VSelect v-model="form.channels.email" :items="emailItems" label="Correo" density="comfortable" hide-details />
              </VCol>
            </VRow>
            <div v-if="form.channels.telegram && !data.telegramLinked" class="mt-3">
              <p class="text-body-2 mb-2">Vinculá tu Telegram para recibir los avisos al momento:</p>
              <AccountTelegramLink />
            </div>

            <VAlert v-if="saveError" type="error" variant="tonal" density="compact" class="mt-4">{{ saveError }}</VAlert>
            <VAlert v-if="saved" type="success" variant="tonal" density="compact" class="mt-4">
              Guardado. El monitor revisa las pizarras cada cinco minutos.
            </VAlert>
            <div class="d-flex flex-wrap align-center ga-3 mt-4">
              <VBtn type="submit" color="primary" variant="flat" :loading="saving" :disabled="!canSave" prepend-icon="mdi-radar">
                {{ data.monitor ? 'Guardar cambios' : 'Empezar la prueba' }}
              </VBtn>
              <VSwitch
                v-if="data.monitor"
                v-model="form.active"
                label="Monitor activo"
                color="primary"
                density="compact"
                hide-details
              />
            </div>
          </form>
        </VCard>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { API_CONTACT_EMAIL, formatDay } from '~/utils/apiKeys'
import {
  MAX_COMPETITORS,
  MONITOR_CURRENCIES,
  TRIAL_DAYS,
  emptyMonitorInput,
  type MonitorAccess,
  type MonitorInput,
} from '~/utils/competitorMonitor'

interface MonitorResponse {
  monitor: MonitorInput | null
  access: MonitorAccess | null
  lastSentAt: string | null
  telegramLinked: boolean
  canCreate: boolean
  houses: { id: string; name: string }[]
}

const { authFetch } = useAuthFetch()
const data = ref<MonitorResponse | null>(null)
const loading = ref(true)
const loadError = ref('')
const form = reactive<MonitorInput>(emptyMonitorInput())
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

const emailItems = [
  { title: 'Sólo el resumen del día', value: 'daily' },
  { title: 'Todos los avisos', value: 'all' },
  { title: 'Nada por correo', value: 'none' },
]
const houseItems = computed(() => (data.value?.houses ?? []).map(h => ({ title: h.name, value: h.id })))
const competitorItems = computed(() => houseItems.value.filter(h => h.value !== form.ownOrigin))
const accessType = computed(() =>
  data.value?.access?.status === 'expired' ? 'warning' : data.value?.access?.status === 'business' ? 'success' : 'info'
)
const canSave = computed(
  () =>
    !saving.value &&
    form.competitors.length >= 1 &&
    form.competitors.length <= MAX_COMPETITORS &&
    form.currencies.length >= 1
)

watch(
  () => form.ownOrigin,
  own => {
    if (own) form.competitors = form.competitors.filter(id => id !== own)
  }
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await authFetch<MonitorResponse>('/api/me/monitor')
    data.value = res
    Object.assign(form, res.monitor ?? emptyMonitorInput())
  } catch (e: any) {
    loadError.value = e?.data?.statusMessage || 'No pudimos leer tu monitor. Probá de nuevo en un rato.'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    await authFetch('/api/me/monitor', { method: 'PUT', body: { ...form } })
    saved.value = true
    await load()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage || 'No se pudo guardar el monitor.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.monitor-panel__intro {
  max-width: 760px;
}
</style>
```

- [ ] **Step 4: Mount it in `app/pages/cuenta/index.vue`**

Inside `<VTabsWindowItem value="api">`, between `<AccountApiKeysPanel />` and `<AccountApiClientsAdminPanel />`, add:
```vue
        <AccountCompetitorMonitorPanel />
```

- [ ] **Step 5: Add the monitors table to `app/components/account/ApiClientsAdminPanel.vue`**

In the template, right after the closing `</VTable>` of the anonymous-usage table (the last `VTable` inside `<template v-else-if="data">`), add:
```vue
      <h3 class="text-subtitle-1 font-weight-bold mt-8 mb-2">Monitores de competencia ({{ monitors.length }})</h3>
      <VTable density="compact">
        <thead>
          <tr>
            <th>Cuenta</th>
            <th>Casa y grupo</th>
            <th>Monedas</th>
            <th>Acceso</th>
            <th>Último aviso</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in monitors" :key="m.uid">
            <td>
              <div>{{ m.email || m.uid }}</div>
              <div class="text-caption">{{ m.active ? 'activo' : 'pausado' }}</div>
            </td>
            <td class="text-caption">{{ m.ownOrigin || '—' }} · {{ m.competitors.join(', ') }}</td>
            <td class="text-caption">{{ m.currencies.join(', ') }}</td>
            <td class="text-caption">{{ accessText(m.access) }}</td>
            <td class="text-caption">{{ m.lastSentAt ? formatDay(m.lastSentAt) : '—' }}</td>
          </tr>
          <tr v-if="!monitors.length">
            <td colspan="5" class="text-caption">Todavía nadie armó un monitor.</td>
          </tr>
        </tbody>
      </VTable>
```

In the script, add the import `formatDay` to the existing `~/utils/apiKeys` import list, add
`import type { MonitorAccess } from '~/utils/competitorMonitor'`, and add:
```ts
interface AdminMonitor {
  uid: string
  email: string | null
  ownOrigin: string | null
  competitors: string[]
  currencies: string[]
  active: boolean
  access: MonitorAccess
  lastSentAt: string | null
}
const monitors = ref<AdminMonitor[]>([])

function accessText(access: MonitorAccess): string {
  if (access.status === 'trial') return `prueba, ${access.daysLeft} d`
  if (access.status === 'business') return 'Empresa'
  return 'vencido'
}
```
and at the end of the `try` block in `load()` (after `data.value = res`), add:
```ts
    monitors.value = (await authFetch<{ monitors: AdminMonitor[] }>('/api/admin/monitors').catch(() => ({ monitors: [] }))).monitors
```

- [ ] **Step 6: Update `/empresas`**

In `app/pages/empresas.vue`, add `TRIAL_DAYS` to the imports:
```ts
import { TRIAL_DAYS } from '~/utils/competitorMonitor'
```
and replace the `USES` entry whose title is `'Monitoreo de competencia'` with:
```ts
  {
    title: 'Monitoreo de competencia',
    text: `Avisos por Telegram o correo cuando otra casa mueve su pizarra o cambia tu lugar en el grupo, y un resumen al cierre del día. Probalo ${TRIAL_DAYS} días gratis desde tu cuenta.`,
  },
```

- [ ] **Step 7: Run tests, tripwires and lint**

Run (from `app/`): `node node_modules/eslint/bin/eslint.js --fix components/account/CompetitorMonitorPanel.vue components/account/ApiClientsAdminPanel.vue pages/cuenta/index.vue pages/empresas.vue tests/unit/cuentaApiTab.test.ts tests/unit/empresasPage.test.ts`
Run: `npx vitest run tests/unit/cuentaApiTab.test.ts tests/unit/empresasPage.test.ts tests/unit/componentResolution.test.ts tests/unit/seoContract.test.ts tests/unit/seoDescriptionBudget.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/components/account/CompetitorMonitorPanel.vue app/components/account/ApiClientsAdminPanel.vue app/pages/cuenta/index.vue app/pages/empresas.vue app/tests/unit/cuentaApiTab.test.ts app/tests/unit/empresasPage.test.ts
git commit -m "feat(app): panel del monitor de competencia en /cuenta y en la administración

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Verificación completa, VPS, despliegue y prueba real

**Files:** none new.

- [ ] **Step 1: Full suites, types, lint, gitleaks**

Root: `npx vitest run`; `npx tsc -p tsconfig.production.json --noEmit` (only the gitignored `sheet_key.json` error is acceptable). App: `npx vitest run`. Gitleaks: `/c/Users/airau/go/bin/gitleaks git . --log-opts="origin/main..HEAD" --no-banner`.
Expected: green (re-run known timing flakes alone before blaming the change).

- [ ] **Step 2: Final whole-branch review** (executing-plans: fresh reviewer, then one fix pass).

- [ ] **Step 3: Copy SMTP settings to the root `.env` on the VPS (before pushing)**

```bash
ssh -p 2223 root@104.234.204.107 'cd /root/cambio-uruguay && cp .env .env.bak-monitor-20260929 && for v in SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS SMTP_FROM; do grep -q "^$v=" .env || grep "^$v=" app/.env >> .env; done; grep -c "^SMTP_" .env'
```
Expected: `6`.

- [ ] **Step 4: Integrate and push from the worktree**

`git fetch origin && git rebase origin/main`, re-run the monitor + contract tests, `git push origin HEAD:main`, then `gh run watch <id> --exit-status`.

- [ ] **Step 5: Real run in production**

On the VPS: confirm `pm2 describe currency-competitor-monitor` (cron `3-58/5`), run `node dist/sync_competitor_monitor.js` once (expect "0 monitores" or the count). Then create a monitor for the owner's account in the app DB (uid of the owner's Firebase user, found in `users` by the owner's email, with `telegramChatId` set), with `trialStartedAt` 15 days ago so the run sends the one-time "Terminó la prueba" notice deterministically; run the job; confirm the Telegram arrived and the state has `accessEndedAt`. Then set `trialStartedAt` to now (a real trial for the owner) and delete the state doc so the next run starts fresh; confirm the next cron run evaluates it (`evaluated: 1`). Open `/cuenta?tab=api` logged in if possible; otherwise verify `GET /api/me/monitor` shape through the unit tests and report that the UI was not exercised live.

- [ ] **Step 6: Cleanup and memory**

Remove junctions before `git worktree remove`; delete the merged branch; update the memory file `monetizacion-b2b-2026-09-27.md` (monitor shipped, envs, how to activate business).
