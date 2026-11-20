/**
 * El digest del tablero de uso, para ingenieros y agentes: cada iteración empieza leyendo esto.
 *
 *   npm run insights                                  señales primero, después las páginas
 *   npm run insights -- --signal=poor-vitals          una señal: pregunta, umbrales, grupos, filas
 *   npm run insights -- --page=/dolar-hoy             una página (también una URL entera)
 *   npm run insights -- --source=indexation           un bloque de fuente con sus tablas
 *   npm run insights -- --day=2026-11-20              lo archivado ese día
 *   npm run insights -- --top=30 --all --json
 *
 * SÓLO LEE (`findOne`): el .env local apunta a la base de PRODUCCIÓN. Nunca llama a una API externa.
 * La lógica vive en classes/insights/digest.ts (tipada y con tests); esto carga el documento e imprime.
 */
import dotenv from "dotenv";
import "dotenv/config";
import fs from "fs";
import path from "path";

const appEnvFile = path.join("app", ".env");
if (fs.existsSync(appEnvFile)) {
  const appEnv = dotenv.parse(fs.readFileSync(appEnvFile));
  process.env.APP_MONGO_URI ||= appEnv.APP_MONGO_URI || appEnv.MONGO_URI;
}

import { appDbConfigured } from "../../classes/appdb";
import { renderDayDigest, renderDigest } from "../../classes/insights/digest";
import { sanitizeError } from "../../classes/insights/errors";
import { sitePath } from "../../classes/insights/paths";
import { mongoStore } from "../../classes/insights/store";
import { SIGNAL_IDS, SOURCE_IDS } from "../../classes/insights/types";
import type { SignalId, SourceId } from "../../classes/insights/types";

const option = (name: string): string | undefined => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const HINT = "todavía no corrió `currency-usage-insights` (o falta APP_MONGO_URI en el VPS)";

async function main(): Promise<void> {
  const signal = option("signal");
  const source = option("source");
  const page = option("page");
  const day = option("day");
  const top = Number(option("top")) || 15;
  const all = process.argv.includes("--all");
  const json = process.argv.includes("--json");

  if (signal && !(SIGNAL_IDS as readonly string[]).includes(signal)) {
    console.error(`señal desconocida: ${signal}. Válidas: ${SIGNAL_IDS.join(", ")}`);
    process.exit(2);
  }
  if (source && !(SOURCE_IDS as readonly string[]).includes(source)) {
    console.error(`fuente desconocida: ${source}. Válidas: ${SOURCE_IDS.join(", ")}`);
    process.exit(2);
  }
  if (!appDbConfigured()) {
    console.log(`Sin APP_MONGO_URI: ${HINT}`);
    process.exit(0);
  }

  if (day) {
    const doc = await mongoStore.loadDay(day);
    if (!doc) console.log(`No hay archivo del ${day}.`);
    else console.log(json ? JSON.stringify(doc, null, 2) : renderDayDigest(doc));
    process.exit(0);
  }

  const snapshot = await mongoStore.loadSnapshot();
  if (!snapshot) {
    console.log(HINT);
    process.exit(0);
  }
  if (json) {
    const path0 = page ? sitePath(page) || page : null;
    const part = signal
      ? snapshot.signals.find((s) => s.id === signal)
      : source
        ? snapshot.sources[source as SourceId]
        : path0
          ? snapshot.pages.find((p) => p.path === path0) || null
          : snapshot;
    console.log(JSON.stringify(part, null, 2));
  } else {
    console.log(
      renderDigest(snapshot, { signal: (signal as SignalId) || null, source: (source as SourceId) || null, page: page || null, top, all })
    );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(`[insights] falló: ${sanitizeError(e)}`);
  process.exit(1);
});
