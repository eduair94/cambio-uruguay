// Lee la ficha propia de los avisos de motos que el directorio ya tiene guardados, con presupuesto y
// por orden de utilidad (classes/motos/detailQueue.ts). No publica nada: deja la ficha en
// `motolistings.detail` y de ahí la toma `sync_motos.ts` en su próxima corrida (cilindrada, color,
// tipo, galería, ficha técnica y lo que el vendedor declara en la descripción).
//
// Medido el 2026-11-23: 590 avisos vigentes y la ficha declara la cilindrada 19 de cada 21 veces,
// contra 57 de 590 que la escriben en el título. A 120 fichas por corrida horaria el atraso entero se
// cubre en cinco horas y después esto es mantenimiento de lo que entra cada día.
//
// Va directo a `moto.mercadolibre.com.uy` desde la IP del VPS, como `currency-autos-detail` (:11) y
// `currency-rentals-ml-detail` (:35): por eso a los :51, cuando las dos ya terminaron.
import "./sentry_job";
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config({ path: "app/.env", quiet: true });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchMotoDetails } from "./classes/motos/detail";
import { motoDetailQueueSummary, motoDetailRunBroken, motoDetailTargets } from "./classes/motos/detailQueue";
import { loadStoredMotos, saveMotoDetailMeta, saveMotoDetails } from "./classes/motos/store";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

export async function main(): Promise<void> {
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) process.env.APP_MONGO_URI = process.env.MONGO_URI;
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) throw new Error("[motos-detail] falta APP_MONGO_URI/MONGO_URI — no se escribe la base equivocada");

  const now = new Date();
  const stored = await loadStoredMotos(now, 7);
  const targets = motoDetailTargets(stored, { now, refreshDays: number("MOTOS_DETAIL_REFRESH_DAYS", 30) });
  const withDetail = stored.filter(doc => doc.detail).length;
  const queue = motoDetailQueueSummary(targets);
  console.log(`[motos-detail] ${stored.length} avisos guardados, ${withDetail} con ficha; cola ${targets.length} ${JSON.stringify(queue)}`);
  if (dryRun) {
    for (const target of targets.slice(0, 10)) console.log(`  ${target.reason.padEnd(8)} ${target.permalink}`);
    return;
  }

  const result = await fetchMotoDetails(targets, {
    max: number("MOTOS_DETAIL_MAX", 120),
    maxDurationMs: number("MOTOS_DETAIL_MINUTES", 10) * 60_000,
    gapMs: number("MOTOS_DETAIL_GAP_MS", 2_000),
  });
  const finishedAt = new Date().toISOString();
  await saveMotoDetails(result, finishedAt);

  let withDisplacement = 0;
  for (const detail of result.details.values()) if (detail.displacement !== null) withDisplacement++;
  console.log(
    `[motos-detail] ${result.details.size} fichas leídas (${withDisplacement} con cilindrada), ` +
      `${result.gone.length} dadas de baja, ${result.failed.length} fallidas`
  );
  await saveMotoDetailMeta(
    {
      finishedAt,
      listings: stored.length,
      withDetail: withDetail + [...result.details.keys()].filter(key => !stored.find(doc => doc.key === key)?.detail).length,
      queued: targets.length,
      queue,
      read: result.details.size,
      withDisplacement,
      gone: result.gone.length,
      failed: result.failed.length,
      ok: result.details.size > 0 || targets.length === 0,
    },
    finishedAt
  );
  // Todo falló con cola llena: Mercado Libre cambió la página o nos está frenando. Que lo vea Sentry.
  if (motoDetailRunBroken({ targets: targets.length, read: result.details.size, failed: result.failed.length })) {
    throw new Error(`[motos-detail] ninguna ficha leída de ${result.failed.length} intentos (${result.failed[0]!.reason})`);
  }
}

if (require.main === module) {
  main()
    .then(async () => {
      if (appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(0);
    })
    .catch(async error => {
      console.error("[motos-detail] fallo", error);
      if (appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(1);
    });
}
