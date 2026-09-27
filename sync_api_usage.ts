// Copia horaria del medidor de uso de la API (pm2 `currency-api-usage`, minuto 7 de cada hora):
// Redis `usage:<día>` → Mongo `api_usage_days`, y `lastUsedAt` de cada clave con uso hoy.
// Ver classes/apikeys/persist.ts y docs/api/API_KEYS.md.
import dotenv from "dotenv";
dotenv.config();

import type { RedisLike } from "./classes/apikeys/counters";
import { apiKeyStore, usageDaysRepo } from "./classes/apikeys/mongo";
import { persistUsage } from "./classes/apikeys/persist";
import { MongooseServer, withTimeout } from "./classes/database";
import { redisCache } from "./classes/redis_cache";

async function main(): Promise<void> {
  try {
    await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  } catch (e: any) {
    console.error("[api-usage] no se pudo conectar a MongoDB:", e?.message || e);
    process.exit(1);
  }
  await redisCache.connect();
  const redis = redisCache.getClient() as unknown as RedisLike | null;
  if (!redis) {
    console.error("[api-usage] Redis no disponible: no hay medidor para copiar");
    process.exit(1);
  }
  const result = await persistUsage({ redis, repo: usageDaysRepo(), store: apiKeyStore(), now: new Date() });
  console.log(`[api-usage] ${result.days.join(" y ")}: ${result.rows} filas, ${result.keysTouched} claves con uso hoy`);
  await redisCache.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("[api-usage] falló la copia", e);
  process.exit(1);
});
