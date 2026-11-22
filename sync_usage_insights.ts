// El tablero de uso del sitio (pm2 `currency-usage-insights`, 12:21 UTC = 09:21 en Uruguay).
//
// POR QUÉ EXISTE. Clarity y Google Analytics ya miran el sitio, pero cada uno cuenta sólo a una parte
// de la gente y ninguno dice qué hay que arreglar. Este job lee del lado del SERVIDOR ocho fuentes,
// cada una en su propio try y con su fecha, y calcula las señales que un ingeniero usa para decidir la
// próxima iteración: páginas que GA4 casi no ve (consentimiento), páginas que en el celular rinden mucho
// peor, páginas que nadie lee hasta la mitad, vitales malos y el elemento culpable, búsquedas sin
// resultado, páginas que mandan afuera, páginas no indexadas y por qué, «No» al «¿Te sirvió?» y,
// cuando exista su variable, clics de bronca, búsquedas de Bing que Google no manda y rastreadores de
// IA que reciben errores.
//
// FUENTES: Cloudflare Web Analytics (RUM, sin cookies: el denominador que no depende del
// consentimiento), GA4 (comportamiento), inspección de URLs de Search Console, el buzón del sitio
// (`sitefeedbacks`), y cuatro INERTES hasta que exista su variable: Clarity (`CLARITY_EXPORT_TOKEN`),
// Bing Webmaster (`BING_WEBMASTER_API_KEY`), Cloudflare zona (permiso Zone → Analytics → Read) y CrUX
// (`CRUX_API_KEY`).
//
// ESCRIBE la base del APP: `usageinsightsnapshots` (`key: site`, lo que lee /estadisticas-de-uso;
// `key: state`, la memoria del job y los dos contadores de cuota) y `usageinsightdays` (un documento
// por día: Clarity y Cloudflare olvidan). PRIVADO: la página y su API piden `requireAdmin`.
//
// NO AGREGA NADA AL NAVEGADOR: ningún script, ninguna cookie, ningún pedido del visitante.
//
// Flags:
//   --dry-run        trae y calcula, NO escribe e imprime el digest. No gasta cupos compartidos (ni
//                    inspección ni Clarity) salvo con --inspect=N / --clarity, que sí reservan el
//                    contador (lo único que un dry run puede escribir).
//   --json           en un dry run, el snapshot en JSON en lugar del digest.
//   --only=a,b       sólo esas fuentes; --skip=a,b todas menos ésas.
//   --backfill=N     archiva hasta N días (≤ 28) de Cloudflare RUM, retomado por las corridas
//                    siguientes; implica --only=cloudflareRum,ga4Behavior,feedback y rechaza
//                    indexation, clarity y crux.
//   --inspect=N      el techo de inspecciones del día de Google para esta corrida (0–1000).
//   --clarity        en un dry run, permite las llamadas a Clarity.
//
// Ver docs/analytics/USAGE_INSIGHTS.md.
import "./sentry_job";
import "dotenv/config";

import { appDbConfigured } from "./classes/appdb";
import { renderDigest, logLines } from "./classes/insights/digest";
import {
  CLARITY_MAX_CALLS_DEFAULT,
  CLARITY_MAX_CALLS_CEILING,
  INSPECT_MAX_CEILING,
  INSPECT_MAX_DEFAULT,
  envInt,
} from "./classes/insights/caps";
import { formatFatal, sanitizeError } from "./classes/insights/errors";
import { BACKFILL_REFUSED, refreshUsageInsights } from "./classes/insights/refresh";
import { mongoStore, offlineStore, readOnlyStore } from "./classes/insights/store";
import { SOURCE_IDS } from "./classes/insights/types";
import type { SourceId } from "./classes/insights/types";
import { notifyAdmin } from "./classes/notify";

/** `--name=N`. Sin la flag: null. */
function flagNumber(name: string): number | null {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  const [, raw] = hit.split("=");
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

function flagList(name: string): SourceId[] | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return null;
  const ids = hit
    .slice(name.length + 3)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = ids.filter((id) => !(SOURCE_IDS as readonly string[]).includes(id));
  if (bad.length) {
    console.error(`[usage-insights] fuente desconocida en --${name}: ${bad.join(", ")}. Válidas: ${SOURCE_IDS.join(", ")}`);
    process.exit(2);
  }
  return ids as SourceId[];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const json = process.argv.includes("--json");
  const allowClarity = process.argv.includes("--clarity");
  const only = flagList("only");
  const skip = flagList("skip") || [];
  const backfill = flagNumber("backfill");
  const inspect = flagNumber("inspect");
  const hasDb = appDbConfigured();

  if (!hasDb && !dryRun) {
    console.error("[usage-insights] APP_MONGO_URI no está seteada — me niego a correr: el tablero vive en la base del app");
    process.exit(1);
  }
  if (dryRun && !hasDb && (allowClarity || inspect !== null)) {
    console.error("[usage-insights] --clarity / --inspect=N necesita APP_MONGO_URI para contar las llamadas");
    process.exit(2);
  }
  if (backfill) {
    const refused = (only || []).filter((id) => BACKFILL_REFUSED.includes(id));
    if (refused.length || allowClarity || inspect !== null) {
      console.error(
        `[usage-insights] --backfill nunca gasta inspección, Clarity ni CrUX (rechazado: ${[...refused, ...(allowClarity ? ["--clarity"] : []), ...(inspect !== null ? ["--inspect"] : [])].join(", ")})`
      );
      process.exit(2);
    }
  }

  const base = hasDb ? mongoStore : offlineStore;
  const store = dryRun ? readOnlyStore(base, { allowQuotaCounter: hasDb && (allowClarity || inspect !== null) }) : base;
  const log = (line: string) => console.log(line);

  const result = await refreshUsageInsights({
    now: new Date(),
    dryRun,
    hasDb,
    only,
    skip,
    backfillDays: backfill || 0,
    inspectBudget: inspect,
    allowClarity,
    store,
    log,
  });
  const s = result.snapshot;
  let quotaLine = "contadores sin base";
  if (hasDb) {
    try {
      const now = new Date();
      const utcDay = now.toISOString().slice(0, 10);
      const googleDay = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
      const clarity = await store.loadQuota("clarity", utcDay);
      const inspection = await store.loadQuota("inspection", googleDay);
      const clarityMax = envInt("USAGE_INSIGHTS_CLARITY_MAX_CALLS", CLARITY_MAX_CALLS_DEFAULT, 0, CLARITY_MAX_CALLS_CEILING);
      const inspectMax = inspect ?? envInt("USAGE_INSIGHTS_INSPECT_MAX", INSPECT_MAX_DEFAULT, 0, INSPECT_MAX_CEILING);
      quotaLine = `clarity ${clarity}/${clarityMax} hoy UTC · inspección ${inspection}/${inspectMax} día Google`;
    } catch (e) {
      quotaLine = `contadores ilegibles (${sanitizeError(e)})`;
    }
  }
  console.log(
    `[usage-insights] ${s.run.bytes} bytes${s.run.trimmed.length ? `, recortes: ${s.run.trimmed.join(", ")}` : ""} · ${quotaLine}`
  );

  if (dryRun) {
    console.log(json ? JSON.stringify(s, null, 2) : renderDigest(s, { top: 15 }));
    console.log("[usage-insights] --dry-run: no escribí nada.");
  } else {
    for (const line of logLines(s.signals)) console.log(line);
    if (result.telegram) await notifyAdmin(result.telegram);
  }
  // Salida explícita: la conexión al app es una `createConnection` aparte que deja el proceso vivo.
  process.exit(result.exitCode);
}

// Un error que se escapa NUNCA se imprime entero: un error de axios lleva el token en sus cabeceras.
process.on("unhandledRejection", (reason) => {
  console.error(formatFatal(reason));
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  console.error(formatFatal(error));
  process.exit(1);
});

main().catch((error) => {
  console.error(formatFatal(error));
  process.exit(1);
});
