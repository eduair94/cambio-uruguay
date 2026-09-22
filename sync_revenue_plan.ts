// El plan de ingreso (pm2 `currency-revenue-plan`).
//
// POR QUÉ EXISTE. Hay dos tableros privados que se construyeron para cruzarse y nunca se cruzaron.
// `currency-gsc` ordena el trabajo de SEO por CLICS POTENCIALES. `currency-site-analytics` mide el
// RPM por FAMILIA de página y su propio archivo dice, textual, que usa el mismo `bucketOf` "para
// que las dos tablas se puedan cruzar fila a fila". Entre una y otra hay un factor de TRESCIENTOS
// (GA4, 3–15/9/2026; las cifras viven sólo en `docs/seo/data/`, gitignored, porque este repo es
// público). Con ese spread, una cola ordenada por clics no está ordenada por nada que tenga que
// ver con el ingreso — manda a trabajar donde hay impresiones, que es justamente donde el clic
// no paga.
//
// Este job hace UNA cuenta: le pone precio a cada clic según la familia de la página que lo
// recibiría, reordena la cola, y publica la tabla de "qué porción del tráfico se lleva cada familia
// contra qué porción de la plata deja".
//
// Y hace una segunda cosa que no es análisis sino disciplina: mide el LIBRO DE CAMBIOS
// (`docs/seo/experiments.json`). Cada cambio declarado se compara contra su propia ventana
// anterior, pero como PORCIÓN de los clics del sitio — sobre una serie que venía multiplicándose
// por seis, un antes/después crudo declara ganador hasta a no hacer nada.
//
// LO QUE NO HACE, Y ES DELIBERADO: no publica páginas, no cambia títulos, no toca ningún catálogo y
// no manda nada a ningún lado. Escribe un documento privado que lee una persona en
// /estadisticas-de-busqueda y decide. El repo ya rechazó la generación automática de contenido por
// buenas razones, y una cola que se ejecuta sola es esa misma idea con otro nombre.
//
// TAMPOCO SALE A NINGUNA API: lee los snapshots que `currency-gsc` (11:20) y
// `currency-site-analytics` (10:51) ya dejaron escritos. Sin credenciales nuevas y sin cuota.
//
// Flags:
//   --dry-run    calcula e imprime, no escribe. Igual necesita leer la base del app.
//   --force      escribe aunque la corrida parezca flaca (sólo para sembrar la primera vez).
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { notifyAdmin } from "./classes/notify";
import { refreshRevenuePlan } from "./classes/revenueplan/refresh";
import { loadRevenuePlan, planIsThin, saveRevenuePlan } from "./classes/revenueplan/store";

const money = (n: number, currency: string) => `${currency} ${n.toFixed(2)}`;

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  if (!appDbConfigured()) {
    console.error(
      "[revenue-plan] APP_MONGO_URI no está configurado — no corro. Los tres snapshots que este job " +
        "cruza viven en la base del Nuxt (copiá el valor de app/.env MONGO_URI). Sin eso no hay nada " +
        "que leer y lo que escribiría iría a la base equivocada."
    );
    process.exit(1);
  }

  try {
    const previous = await loadRevenuePlan();
    const { snapshot, archiveDaysRead } = await refreshRevenuePlan({ previous });

    console.log(
      `[revenue-plan] ${snapshot.asOf}: ${snapshot.actions.length} acciones, ${snapshot.defend.length} en riesgo, ` +
        `${snapshot.families.length} familias, ${snapshot.experiments.length} experimentos ` +
        `(${archiveDaysRead} días de archivo leídos).`
    );
    console.log(
      `[revenue-plan] RPM del sitio ${snapshot.siteRpm.toFixed(3)} ${snapshot.currency}/1.000 vistas ` +
        `(sólo Uruguay ${snapshot.siteRpmUy.toFixed(3)}, diagnóstico: no ordena), ` +
        `clic promedio ${snapshot.siteUsdPerClick.toFixed(6)} ${snapshot.currency}, ` +
        `techo estimado de la cola ${money(snapshot.totalUpsideUsd, snapshot.currency)} por 28 días.`
    );

    for (const alert of snapshot.alerts) {
      const tag = alert.level === "critical" ? "!!" : alert.level === "warn" ? " !" : "  ";
      console.log(`[revenue-plan] ${tag} ${alert.code}: ${alert.message}`);
    }

    console.log("[revenue-plan] top 10 por plata (entre paréntesis, el puesto que tenía por clics):");
    for (const action of snapshot.actions.slice(0, 10)) {
      console.log(
        `  ${money(action.expectedUsd, snapshot.currency).padStart(12)}  ${String(action.weightedClicks).padStart(7)} clics equiv.  ` +
          `(#${action.rankByClicks} por clics)  [${action.bucket || "sin familia"} ${action.basis}]  ` +
          `${action.kind} · ${action.subject}`
      );
    }

    console.log("[revenue-plan] familias, tráfico contra plata:");
    for (const family of snapshot.families.slice(0, 12)) {
      console.log(
        `  ${family.bucket.padEnd(24)} ${String(family.views).padStart(7)} vistas  ` +
          `${(family.shareOfViews * 100).toFixed(1).padStart(5)} % del tráfico  ` +
          `${(family.shareOfRevenue * 100).toFixed(1).padStart(5)} % de la plata  ` +
          `×${family.multiplier} (${family.basis}, tramo ${family.tier})`
      );
    }

    for (const experiment of snapshot.experiments) {
      console.log(`  [${experiment.verdict}] ${experiment.id} (${experiment.shippedOn}): ${experiment.note}`);
    }

    if (dryRun) {
      console.log("[revenue-plan] --dry-run: no escribo nada.");
      process.exit(0);
    }

    if (!force && planIsThin(snapshot, previous)) {
      console.error(
        `[revenue-plan] corrida flaca: ${snapshot.actions.length} acciones contra ${previous!.actions.length} guardadas. ` +
          "No piso el plan bueno — una cola vacía en la pantalla se ve igual que 'no hay nada para hacer'. " +
          "Suele ser que currency-gsc falló hoy. Con --force se escribe igual."
      );
      await notifyAdmin(
        `[revenue-plan] corrida flaca (${snapshot.actions.length} vs ${previous!.actions.length}); no se sobrescribió el plan.`
      );
      process.exit(1);
    }

    await saveRevenuePlan(snapshot);
    console.log("[revenue-plan] guardado en `revenueplansnapshots`.");

    const critical = snapshot.alerts.filter((a) => a.level === "critical");
    if (critical.length) {
      await notifyAdmin(`[revenue-plan] ${critical.map((a) => a.message).join(" | ")}`);
    }
  } catch (error: any) {
    console.error("[revenue-plan] falló, se conserva el plan anterior:", error?.message || error);
    await notifyAdmin(`[revenue-plan] falló: ${error?.message || error}`);
    process.exit(1);
  }
  // Como el resto de los jobs de este repo: salida explícita. La conexión al app es una
  // `createConnection` aparte de la default y esperar a que las dos cierren solas deja el proceso
  // colgado en pm2 con `autorestart: false`, que es un job que "corrió" y nunca termina.
  process.exit(0);
}

main().catch((e) => {
  console.error("[revenue-plan] sync failed", e);
  process.exit(1);
});
