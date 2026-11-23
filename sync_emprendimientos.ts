// El directorio de emprendimientos de Instagram (pm2 `currency-emprendimientos`, diez veces por día)
// detrás de /emprendimientos-de-instagram-uruguay. Cada corrida (classes/emprendimientos/run.ts):
//
//   1. descubre cuentas: semillas, sugerencias de la página, Reddit (una vez por día), el listado de
//      Uruguay Emprendedor (una vez por semana) y 80 de sus fichas por corrida, y 12 búsquedas web
//      con Gemini (producto × lugar, rotando; classes/emprendimientos/sources/web.ts);
//   2. lee en Instagram, sin sesión y en un solo Chrome, hasta 50 perfiles: sugerencias y semillas
//      primero, después las cuentas publicadas cuyas fotos vencen, después las nuevas; y después el
//      texto de 10 posts de curadoras (ferias, tiendas colectivas), buscando @menciones;
//   3. clasifica lo nuevo (créditos de Claude, Gemini de respaldo) y decide qué se publica;
//   4. suma las colaboraciones y menciones de lo publicado (bola de nieve) y reescribe las fichas.
//
// Si Instagram no devuelve ningún perfil en las primeras cinco lecturas, la corrida no cambia
// ningún estado y sale con 1. `EMPRENDIMIENTOS_ENABLED=0` la apaga sin desplegar.
//
// `--dry-run` no toca ninguna base: arranca de las semillas (y de `--handles=a,b`), lee, clasifica
// e imprime. `--json=<archivo>` guarda las fichas para mirar la página en dev
// (`EMPRENDIMIENTOS_PREVIEW_FILE` en app/.env). `--no-discovery` saltea Reddit, Uruguay Emprendedor
// y la búsqueda web.
import "./sentry_job";
import "dotenv/config";

import { writeFileSync } from "fs";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { readProfiles } from "./classes/emprendimientos/instagram";
import { DEFAULT_OPTIONS, newCandidate, runOnce } from "./classes/emprendimientos/run";
import { readReddit } from "./classes/emprendimientos/sources/reddit";
import { readUeListings, ueFetch } from "./classes/emprendimientos/sources/uruguayEmprendedor";
import { readWeb } from "./classes/emprendimientos/sources/web";
import { memoryStore, mongoStore } from "./classes/emprendimientos/store";
import { normalizeHandle } from "./classes/emprendimientos/handles";

const TAG = "[emprendimientos]";
const arg = (name: string): string | undefined => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

export async function main(): Promise<number> {
  if (process.env.EMPRENDIMIENTOS_ENABLED === "0") {
    console.log(`${TAG} EMPRENDIMIENTOS_ENABLED=0: no se corre.`);
    return 0;
  }
  const dryRun = process.argv.includes("--dry-run");
  const noDiscovery = process.argv.includes("--no-discovery");
  if (!dryRun && !appDbConfigured()) {
    console.error(`${TAG} APP_MONGO_URI no está definida: el directorio vive en la base del app. No se corre.`);
    return 1;
  }
  const now = new Date();
  let store = mongoStore;
  if (dryRun) {
    const extra = (arg("handles") ?? "").split(",").map(normalizeHandle).filter((h): h is string => !!h);
    store = memoryStore({ candidates: extra.map(handle => newCandidate(handle, { kind: "sugerencia", day: now.toISOString().slice(0, 10) }, now)) });
  } else {
    await appConnection().asPromise();
  }
  const maxReads = Number(arg("max-reads")) || number("EMPRENDIMIENTOS_MAX_READS", DEFAULT_OPTIONS.maxReads);
  const result = await runOnce({
    now,
    store,
    readProfiles,
    reddit: noDiscovery ? null : readReddit,
    ueListings: noDiscovery ? null : () => readUeListings(),
    ueFetch: noDiscovery ? null : ueFetch,
    web: noDiscovery ? null : (cursor, count, day) => readWeb(cursor, count, day),
    options: {
      maxReads,
      gapMs: number("EMPRENDIMIENTOS_GAP_MS", DEFAULT_OPTIONS.gapMs),
      readBudgetMs: number("EMPRENDIMIENTOS_READ_MINUTES", DEFAULT_OPTIONS.readBudgetMs / 60_000) * 60_000,
      ueDetailsPerRun: number("EMPRENDIMIENTOS_UE_DETAILS", DEFAULT_OPTIONS.ueDetailsPerRun),
      webQueriesPerRun: process.env.EMPRENDIMIENTOS_WEB_QUERIES === "0" ? 0 : number("EMPRENDIMIENTOS_WEB_QUERIES", DEFAULT_OPTIONS.webQueriesPerRun),
      maxPostReads: process.env.EMPRENDIMIENTOS_POST_READS === "0" ? 0 : number("EMPRENDIMIENTOS_POST_READS", DEFAULT_OPTIONS.maxPostReads),
      proxy: process.env.EMPRENDIMIENTOS_PROXY || null,
    },
    log: line => console.log(`${TAG} ${line}`),
  });
  console.log(`${TAG} ${JSON.stringify(result.summary)}`);
  if (dryRun) {
    for (const row of result.touched) {
      const c = row.classification;
      console.log(`  ${row.state.padEnd(11)} @${row.handle.padEnd(28)} ${c ? `${c.rubro} · ${c.tipo} · uy:${c.uruguaya}${c.raro ? " · raro" : ""} · ${c.resumen}` : ""} — ${row.reason ?? ""}`);
    }
    const out = arg("json");
    if (out) writeFileSync(out, JSON.stringify({ listings: result.listings, meta: (store as ReturnType<typeof memoryStore>).meta }, null, 2));
  }
  if (!dryRun) await appConnection().close().catch(() => undefined);
  if (result.instagramClosed) {
    console.error(`${TAG} Instagram no devolvió perfiles: no se cambió ningún estado.`);
    return 1;
  }
  return 0;
}

if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(error => {
      console.error(`${TAG} falló:`, error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
