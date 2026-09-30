// Una corrida del monitor de competencia: qué pasó desde la anterior y qué hay que avisar. Puro.
//
// Las guardas salen de cómo se escribe el dato, no de gustos:
// - Un MOVIMIENTO se mide contra el último precio CONFIRMADO en la foto (guardado en el estado), no
//   contra el "antes" del ledger. El ledger registra cada lectura antes de que la guarda de
//   plausibilidad decida (classes/cambio.ts), así que su "antes" puede ser un valor que nunca se
//   publicó: una coma perdida que después se corrige llegaría como "3905,00 → 39,05". El ledger
//   queda sólo para la hora del cambio y para contar movimientos del día.
// - Un salto de más de 1,5× en un lado nunca se avisa: una cotización no se mueve así en un día, y
//   es la forma de la coma perdida que todavía no borró la auditoría.
// - La POSICIÓN se avisa si se vio igual en DOS corridas seguidas (el sync escribe casa por casa) y
//   contra la misma base: si cambió el grupo —el cliente editó el monitor, un competidor falta de la
//   foto— se re-aprende sin avisar, porque ese cambio de puesto no lo causó ningún precio.
// - Con la última evaluación de más de 30 minutos (monitor pausado, reactivado, recién pagado) se
//   re-aprende todo sin avisar: no se vuelca historia.
import moment from "moment-timezone";
import { implausibleReason } from "../rate_plausibility";
import { bestOf, placementOf, type Placement } from "./ranking";
import { normalizeType } from "./snapshot";
import type { LedgerChange, MonitorConfig, MonitorState, Quote, Side } from "./types";

const ZONE = "America/Montevideo";
export const QUIET_WINDOW_MS = 3 * 3_600_000;
export const MOVE_LOOKBACK_MS = 30 * 60_000;
export const QUIET_MIN_MOVERS = 2;
/** Un lado que se mueve más que esto en una corrida no es un movimiento, es un dato roto. */
export const SANE_RATIO = 1.5;
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
  /** Foto de hoy del grupo, por moneda (groupQuotes sobre plausibleRows). */
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

/** Los dos valores son precios y no se separan más de SANE_RATIO. */
function saneStep(a: number, b: number): boolean {
  return a > 0 && b > 0 && Math.max(a, b) / Math.min(a, b) <= SANE_RATIO;
}

/**
 * Un cambio del ledger que cuenta como movimiento de verdad: ninguna punta 0/0 (una casa que falta
 * y vuelve), ninguna punta imposible (compra mayor que venta) y ningún lado que salte más de 1,5×.
 */
export function saneChange(c: LedgerChange): boolean {
  const before = { buy: c.previousBuy, sell: c.previousSell };
  const after = { buy: c.buy, sell: c.sell };
  if (!(before.buy > 0 || before.sell > 0) || !(after.buy > 0 || after.sell > 0)) return false;
  if (implausibleReason(before) || implausibleReason(after)) return false;
  const moved = SIDES.filter((side) => before[side] !== after[side]);
  return moved.length > 0 && moved.every((side) => saneStep(before[side], after[side]));
}

export function evaluate(input: EvaluationInput): { events: MonitorEvent[]; state: MonitorState } {
  const { config, now, quotes } = input;
  const state: MonitorState = {
    ...input.state,
    lastQuotes: { ...(input.state.lastQuotes ?? {}) },
    positions: { ...input.state.positions },
    quietDay: { ...input.state.quietDay },
  };
  const events: MonitorEvent[] = [];
  const nowMs = now.getTime();
  const today = montevideoToday(now);
  const todayMs = dayStart(now).getTime();
  const competitors = new Set(config.competitors);
  const own = config.ownOrigin;
  const fresh = !!input.state.lastRunAt && nowMs - input.state.lastRunAt.getTime() <= MOVE_LOOKBACK_MS;
  const group = [...new Set([...(own ? [own] : []), ...config.competitors])].sort().join(",");

  const quoteOf = (origin: string, code: string): Quote | null =>
    (quotes.get(code) ?? []).find((q) => q.origin === origin) ?? null;
  // Del ledger sólo cuentan los cambios sanos del mismo tipo que publica la foto.
  const counted = input.changes
    .map((c) => ({ ...c, code: c.code.toUpperCase(), type: normalizeType(c.type) }))
    .filter((c) => {
      const q = quoteOf(c.origin, c.code);
      return !!q && q.type === c.type && c.observedAt.getTime() <= nowMs && saneChange(c);
    });

  for (const code of config.currencies) {
    for (const q of quotes.get(code) ?? []) {
      const key = `${q.origin}|${code}`;
      const prev = input.state.lastQuotes?.[key];
      state.lastQuotes[key] = { buy: q.buy, sell: q.sell };
      if (!config.alerts.moves || !fresh || !prev || !competitors.has(q.origin)) continue;
      const moved = SIDES.filter((side) => prev[side] > 0 && q[side] > 0 && prev[side] !== q[side]);
      if (!moved.length || !moved.every((side) => saneStep(prev[side], q[side]))) continue;
      const since = input.state.lastRunAt!.getTime();
      const ledger = counted.filter(
        (c) => c.origin === q.origin && c.code === code && c.observedAt.getTime() > since && c.buy === q.buy && c.sell === q.sell
      );
      events.push({
        kind: "move",
        origin: q.origin,
        code,
        fromBuy: prev.buy,
        toBuy: q.buy,
        fromSell: prev.sell,
        toSell: q.sell,
        at: ledger.length ? ledger[ledger.length - 1].observedAt : now,
      });
    }
  }

  if (own && config.alerts.position) {
    for (const code of config.currencies) {
      const list = quotes.get(code) ?? [];
      for (const side of SIDES) {
        const key = `${code}|${side}`;
        const place = placementOf(list, own, side);
        const current = place ? place.position : null;
        const priced = list
          .filter((q) => q[side] > 0)
          .map((q) => q.origin)
          .sort()
          .join(",");
        const basis = `${priced}|${group}`;
        const memo = state.positions[key];
        if (!fresh || !memo || memo.basis !== basis || memo.alerted === null) {
          state.positions[key] = { seen: current, alerted: current, basis };
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
        state.positions[key] = { seen: current, alerted, basis };
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
  state.lastRunAt = now;
  return { events, state };
}
