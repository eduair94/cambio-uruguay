// Las operaciones de Redis de las claves de API: contadores de límite y medidor de uso.
//
// Recibe el cliente inyectado (en producción, `redisCache.getClient()`, con su prefijo "cambio:").
// NUNCA tira: una falla devuelve null/false y quien llama deja pasar el pedido sin límite y sin
// medir. La API no se cae porque se cayó el contador.
import type { WindowKeys } from "./window";

export interface RedisMulti {
  incr(key: string): RedisMulti;
  expire(key: string, seconds: number): RedisMulti;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}

export interface RedisLike {
  multi(): RedisMulti;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  mget(...keys: string[]): Promise<(string | null)[]>;
}

/**
 * Tope de espera de los contadores en el camino del pedido. Un Redis conectado pero trabado no
 * responde ni con error: sin tope, cada pedido a la API esperaría con él.
 */
export const COUNTER_TIMEOUT_MS = 250;

function within<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis no contestó en ${ms} ms`)), ms);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

const MINUTE_TTL = 120;
const DAY_TTL = 3 * 86_400;
/** El medidor vive 40 días en Redis: un job caído varios días no pierde nada. */
export const USAGE_TTL = 40 * 86_400;

export const minuteKey = (subject: string, bucket: number): string => `rl:m:${subject}:${bucket}`;
export const dayKey = (subject: string, day: string): string => `rl:d:${subject}:${day}`;
export const usageKey = (day: string): string => `usage:${day}`;
export const invalidKey = (ip: string, bucket: number): string => `rl:inv:${ip}:${bucket}`;

export async function countRequest(
  redis: RedisLike,
  subject: string,
  keys: WindowKeys,
  timeoutMs = COUNTER_TIMEOUT_MS
): Promise<{ minute: number; day: number } | null> {
  try {
    const m = minuteKey(subject, keys.minuteBucket);
    const d = dayKey(subject, keys.day);
    const res = await within(redis.multi().incr(m).expire(m, MINUTE_TTL).incr(d).expire(d, DAY_TTL).exec(), timeoutMs);
    if (!res || res[0]?.[0] || res[2]?.[0]) return null;
    const minute = Number(res[0]?.[1]);
    const day = Number(res[2]?.[1]);
    return Number.isFinite(minute) && Number.isFinite(day) ? { minute, day } : null;
  } catch {
    return null;
  }
}

/** Lo consumido sin sumar un pedido (para `GET /usage`, que ya contó el middleware). */
export async function readCounts(
  redis: RedisLike,
  subject: string,
  keys: WindowKeys,
  timeoutMs = COUNTER_TIMEOUT_MS
): Promise<{ minute: number; day: number } | null> {
  try {
    const [m, d] = await within(redis.mget(minuteKey(subject, keys.minuteBucket), dayKey(subject, keys.day)), timeoutMs);
    return { minute: Number(m ?? 0) || 0, day: Number(d ?? 0) || 0 };
  } catch {
    return null;
  }
}

/**
 * Un pedido que cortó el límite de MINUTO no gasta el cupo del DÍA: si no, un cliente que ignora el
 * Retry-After durante una ráfaga se queda sin día entero con pedidos que nunca se atendieron.
 */
export async function refundDay(redis: RedisLike, subject: string, keys: WindowKeys): Promise<void> {
  try {
    await within(redis.decr(dayKey(subject, keys.day)), COUNTER_TIMEOUT_MS);
  } catch {
    // Sin devolución el cliente pierde un pedido del día; no vale cortar nada por eso.
  }
}

/** Intentos de esta IP en este minuto con una clave que no existe (bien formada pero inventada). */
export async function invalidAttempts(
  redis: RedisLike,
  ip: string,
  keys: WindowKeys,
  timeoutMs = COUNTER_TIMEOUT_MS
): Promise<number> {
  try {
    return Number(await within(redis.get(invalidKey(ip, keys.minuteBucket)), timeoutMs)) || 0;
  } catch {
    return 0;
  }
}

export async function noteInvalid(redis: RedisLike, ip: string, keys: WindowKeys): Promise<void> {
  try {
    const key = invalidKey(ip, keys.minuteBucket);
    await within(redis.incr(key), COUNTER_TIMEOUT_MS);
    await within(redis.expire(key, MINUTE_TTL), COUNTER_TIMEOUT_MS);
  } catch {
    // Sin la cuenta, esa IP sigue pudiendo probar claves: el caché negativo del store acota el costo.
  }
}

export async function meter(redis: RedisLike, day: string, client: string, route: string): Promise<boolean> {
  try {
    const key = usageKey(day);
    await redis.hincrby(key, `${client}|${route}`, 1);
    await redis.expire(key, USAGE_TTL);
    return true;
  } catch {
    return false;
  }
}

export async function readUsage(redis: RedisLike, day: string): Promise<Record<string, number>> {
  const raw = await redis.hgetall(usageKey(day));
  const out: Record<string, number> = {};
  for (const [field, value] of Object.entries(raw ?? {})) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) out[field] = n;
  }
  return out;
}
