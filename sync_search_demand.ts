// La cola de qué escribir (pm2 `currency-search-demand`).
//
// POR QUÉ EXISTE. Search Console sólo muestra consultas donde el sitio YA aparece, así que es ciego
// a la demanda que no captura. Medido el 2026-09-03: de las 302 consultas con forma de pregunta que
// el sitio recibe, 29.008 impresiones dan 11 clics, porque casi todas son conversiones de moneda
// que Google contesta sola. El sitio no crece optimizando lo que ya rankea — tiene que entrar en
// consultas donde hoy no aparece, y eso hay que salir a buscarlo.
//
// QUÉ HACE: cosecha el autocompletado uruguayo, descarta lo que no es de las temáticas del sitio,
// mide contra el índice propio si ya está cubierto, mira el SERP de los mejores candidatos y ordena
// una cola. Escribe UN documento en la Mongo del app y manda el top 5 por Telegram.
//
// QUÉ NO HACE, Y ES LO MÁS IMPORTANTE: no publica nada. La cola es para que una persona la lea y
// decida. El repo ya rechazó la generación automática de páginas por buenas razones, y una cola que
// se publica sola es esa misma idea con otro nombre.
//
// Flags:
//   --dry-run          cosecha y clasifica, imprime, no escribe
//   --no-serp          saltea la etapa del SERP (la única que sale a Google)
//   --serp-budget=N    cuántos candidatos se clasifican mirando el SERP (25 por defecto)
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { refreshDemandQueue } from "./classes/demand/refresh";
import { queueWouldRegress, saveDemandQueue } from "./classes/demand/store";
import { notifyAdmin } from "./classes/notify";

function flagValue(name: string): number | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const parsed = Number(hit.split("=")[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  if (!appDbConfigured() && !dryRun) {
    console.error(
      "[demand] APP_MONGO_URI no está configurado — no corro. La cola vive en la base del app " +
        "(copiá el valor de app/.env MONGO_URI); escribirla en la del backend la dejaría invisible."
    );
    process.exit(1);
  }

  try {
    const queue = await refreshDemandQueue({
      skipSerp: process.argv.includes("--no-serp"),
      serpBudget: flagValue("serp-budget"),
    });

    console.log(
      `[demand] ${queue.harvested} sugerencias cosechadas, ${queue.local} del mercado uruguayo, ` +
        `${queue.inScope} además dentro de las temáticas, ` +
        `${queue.probed} clasificadas por SERP, ${queue.items.length} en la cola`
    );
    for (const item of queue.items.slice(0, 10)) {
      console.log(`  ${item.score.toFixed(2)}  [${item.topic}] "${item.query}" — ${item.why}`);
    }

    if (dryRun) {
      console.log("[demand] DRY RUN: no se escribió nada");
      process.exit(0);
    }

    if (await queueWouldRegress(queue)) {
      console.warn(
        "[demand] la cosecha volvió vacía y hay una cola guardada con contenido — se conserva la " +
          "anterior. Casi siempre es el autocompletado caído, no un día sin demanda."
      );
      process.exit(0);
    }

    await saveDemandQueue(queue);

    // Sólo el top 5, y sólo si hay algo que valga la pena escribir. Un canal que avisa todos los
    // días de lo mismo deja de leerse.
    const top = queue.items.filter((i) => i.score >= 0.5).slice(0, 5);
    if (top.length) {
      const body = top.map((i) => `• _${i.query}_ — ${i.why}`).join("\n");
      await notifyAdmin(`*Qué escribir* (${queue.asOf})\n${body}`);
    }
  } catch (e: any) {
    const detail = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || String(e);
    console.error(`[demand] la corrida falló, se conserva la cola anterior: ${detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("[demand] sync failed", e);
  process.exit(1);
});
