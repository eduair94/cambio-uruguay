// Copia el medidor de uso de Redis (hash `usage:<día>`) a Mongo (`api_usage_days`). Lo corre el job
// `currency-api-usage` cada hora, fuera de la API (cluster ×2: nada programado vive ahí).
//
// Copia AYER y HOY con el valor completo del día (upsert con $set, no $inc), así que correrlo dos
// veces no duplica y una corrida perdida la completa la siguiente. Redis guarda 40 días.
import { readUsage, type RedisLike } from "./counters";
import type { KeyStore } from "./store";
import { rowsFromHash, type UsageDaysRepo } from "./usage";
import { dayMinus, montevideoDay } from "./window";

export async function persistUsage(deps: {
  redis: RedisLike;
  repo: UsageDaysRepo;
  store: Pick<KeyStore, "touchLastUsed">;
  now: Date;
}): Promise<{ days: string[]; rows: number; keysTouched: number }> {
  const today = montevideoDay(deps.now);
  const days = [dayMinus(today, 1), today];
  let rows = 0;
  const keyIds = new Set<string>();
  for (const day of days) {
    const dayRows = rowsFromHash(day, await readUsage(deps.redis, day));
    rows += await deps.repo.upsertDay(day, dayRows);
    if (day === today) {
      for (const row of dayRows) if (row.client.startsWith("key:")) keyIds.add(row.client.slice(4));
    }
  }
  await deps.store.touchLastUsed([...keyIds], deps.now);
  return { days, rows, keysTouched: keyIds.size };
}
