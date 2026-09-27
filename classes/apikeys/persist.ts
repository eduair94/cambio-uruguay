// Copia el medidor de uso de Redis (hash `usage:<día>`) a Mongo (`api_usage_days`). Lo corre el job
// `currency-api-usage` cada hora, fuera de la API (cluster ×2: nada programado vive ahí).
//
// Copia TODO día que siga en Redis (40 días de vida), no sólo ayer y hoy: un job caído una semana
// no pierde nada. Guarda con `$max` (usageUpsertOps), así que correrlo dos veces no duplica y un
// Redis que perdió datos no puede bajar un conteo ya guardado.
import { readUsage, USAGE_TTL, type RedisLike } from "./counters";
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
  const span = Math.round(USAGE_TTL / 86_400);
  const days: string[] = [];
  let rows = 0;
  const keyIds = new Set<string>();
  for (let back = span - 1; back >= 0; back--) {
    const day = dayMinus(today, back);
    const dayRows = rowsFromHash(day, await readUsage(deps.redis, day));
    if (!dayRows.length) continue;
    days.push(day);
    rows += await deps.repo.upsertDay(day, dayRows);
    if (day === today) {
      for (const row of dayRows) if (row.client.startsWith("key:")) keyIds.add(row.client.slice(4));
    }
  }
  await deps.store.touchLastUsed([...keyIds], deps.now);
  return { days, rows, keysTouched: keyIds.size };
}
