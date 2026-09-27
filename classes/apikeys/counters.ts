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
  hincrby(key: string, field: string, increment: number): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  mget(...keys: string[]): Promise<(string | null)[]>;
}

const MINUTE_TTL = 120;
const DAY_TTL = 3 * 86_400;
/** El medidor vive 40 días en Redis: un job caído varios días no pierde nada. */
export const USAGE_TTL = 40 * 86_400;

export const minuteKey = (subject: string, bucket: number): string => `rl:m:${subject}:${bucket}`;
export const dayKey = (subject: string, day: string): string => `rl:d:${subject}:${day}`;
export const usageKey = (day: string): string => `usage:${day}`;

export async function countRequest(
  redis: RedisLike,
  subject: string,
  keys: WindowKeys
): Promise<{ minute: number; day: number } | null> {
  try {
    const m = minuteKey(subject, keys.minuteBucket);
    const d = dayKey(subject, keys.day);
    const res = await redis.multi().incr(m).expire(m, MINUTE_TTL).incr(d).expire(d, DAY_TTL).exec();
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
  keys: WindowKeys
): Promise<{ minute: number; day: number } | null> {
  try {
    const [m, d] = await redis.mget(minuteKey(subject, keys.minuteBucket), dayKey(subject, keys.day));
    return { minute: Number(m ?? 0) || 0, day: Number(d ?? 0) || 0 };
  } catch {
    return null;
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
