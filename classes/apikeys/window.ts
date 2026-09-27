// Ventanas fijas de minuto y de día para el límite de la API, y la decisión de cortar o no.
// Puro: los contadores los trae counters.ts. El día es el de Montevideo porque es el día que
// entiende el cliente ("hoy") y el que usa el resto del sitio.
import moment from "moment-timezone";
import type { Limits } from "./plans";

const ZONE = "America/Montevideo";

export interface WindowKeys {
  /** Minutos desde el epoch: el sujeto del contador de minuto. */
  minuteBucket: number;
  /** YYYY-MM-DD en Montevideo. */
  day: string;
  minuteResetsAt: Date;
  dayResetsAt: Date;
}

export interface Decision {
  allowed: boolean;
  exceeded: "minute" | "day" | null;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export function montevideoDay(now: Date): string {
  return moment.tz(now, ZONE).format("YYYY-MM-DD");
}

export function windowKeys(now: Date): WindowKeys {
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  const local = moment.tz(now, ZONE);
  return {
    minuteBucket,
    day: local.format("YYYY-MM-DD"),
    minuteResetsAt: new Date((minuteBucket + 1) * 60_000),
    dayResetsAt: local.clone().startOf("day").add(1, "day").toDate(),
  };
}

/**
 * `counts` ya incluye el pedido actual (es lo que devuelve `INCR`). Si corta, informa la ventana
 * que cortó (el día manda sobre el minuto: es la espera más larga). Si no corta, las cabeceras
 * hablan de la ventana a la que le queda menos.
 */
export function decide(counts: { minute: number; day: number }, limits: Limits, keys: WindowKeys): Decision {
  const minuteLeft = limits.perMinute - counts.minute;
  const dayLeft = limits.perDay - counts.day;
  const exceeded: Decision["exceeded"] = dayLeft < 0 ? "day" : minuteLeft < 0 ? "minute" : null;
  const window = exceeded ?? (dayLeft <= minuteLeft ? "day" : "minute");
  return {
    allowed: exceeded === null,
    exceeded,
    limit: window === "day" ? limits.perDay : limits.perMinute,
    remaining: Math.max(0, window === "day" ? dayLeft : minuteLeft),
    resetAt: window === "day" ? keys.dayResetsAt : keys.minuteResetsAt,
  };
}

/** Resta días a un YYYY-MM-DD (aritmética de calendario, sin zona). */
export function dayMinus(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}
