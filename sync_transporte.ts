// El job del comparador de transporte (`/conviene-auto-moto-o-omnibus-uruguay`).
//
// Junta, una vez por día, las cuatro cosas que la página necesita y que nadie más tiene juntas:
//
//  1. **Precios vivos** de cada modo, leídos de los catálogos que el sitio ya publica
//     (`movilidaditems`, `carcatalog`, `motocatalog`) más nafta, boleto, kWh y tasas de cuotas.
//  2. **La matriz de rutas** entre las 68 zonas, por modo, sobre la red real de OpenStreetMap.
//  3. **Los viajes en ómnibus** entre esas mismas zonas, armados con los horarios publicados por la
//     Intendencia: caminata, espera, tiempo en vehículo y trasbordos.
//  4. **La cobertura**: qué se pudo calcular y qué no, que la página publica en vez de esconder.
//
// La aritmética de la comparación NO está acá: vive en `app/utils/transportModel.ts` y corre en el
// navegador, porque el visitante mueve controles y espera que los números cambien en el acto. Este
// job publica insumos.
//
// Igual que `sync_movilidad.ts`: ninguna salida llama a `process.exit` desde `main()`; cada negativa
// es un `Error`, `main` se exporta, y el proceso sólo corre detrás de `require.main === module` —
// así un test puede importarlo y correrlo contra colaboradores falsos sin tocar una base real.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { MongooseServer, withTimeout } from "./classes/database";

import { buildRouteMatrix } from "./classes/transporte/matrix";
import { readTransportPrices } from "./classes/transporte/prices";
import { TransportRouter } from "./classes/transporte/routing";
import { loadStmIndex, STM_SOURCES } from "./classes/transporte/sources/stm";
import { saveTransportSnapshot } from "./classes/transporte/store";
import { buildTransitIndex, buildTransitMatrix } from "./classes/transporte/transit";
import { transportZones } from "./classes/transporte/zones";
import type { TransportSnapshot, TransportZone } from "./classes/transporte/types";

/** Cada cuántos días se vuelve a rutear la matriz. La calle no se muda todos los días. */
const MATRIX_MAX_AGE_DAYS = Number(process.env.TRANSPORT_MATRIX_MAX_AGE_DAYS || 7);

export async function main(): Promise<void> {
  // El app llama a esto `MONGO_URI`; el puente de la raíz exige `APP_MONGO_URI` para que un job no
  // pueda escribir la base del backend por accidente. Se mapea explícitamente, con la guarda contra
  // el `process.env.X = undefined` de Node, que coerce al STRING "undefined".
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) {
    process.env.APP_MONGO_URI = process.env.MONGO_URI;
  }

  const dryRun = process.argv.includes("--dry-run");
  const pricesOnly = process.argv.includes("--prices-only");
  const forceMatrix = process.argv.includes("--matrix");

  if (!dryRun && !appDbConfigured()) {
    throw new Error("[transporte] falta APP_MONGO_URI/MONGO_URI — no se escribe la base equivocada");
  }
  if (dryRun) {
    console.log("[transporte] --dry-run: no se conecta a ninguna base ni se escribe nada");
  }

  const startedAt = Date.now();
  const notes: string[] = [];
  const zones = transportZones();
  console.log(`[transporte] ${zones.length} zonas`);

  // Los horarios del STM primero: son los que deciden qué zonas se pueden comparar. Una zona sin
  // ómnibus no tiene contra qué medirse, y publicarla sería publicar media comparación.
  let transitPairs: TransportSnapshot["transit"] = [];
  let publishedZones: TransportZone[] = zones;
  let transitAgeDays: number | null = null;

  if (!pricesOnly) {
    try {
      const stm = await loadStmIndex();
      const index = buildTransitIndex(stm, zones);
      const covered = zones.filter(zone => (index.access.get(zone.slug) ?? []).length > 0);
      const uncovered = zones.filter(zone => !(index.access.get(zone.slug) ?? []).length);
      if (uncovered.length) {
        notes.push(
          `Sin recorrido del STM: ${uncovered.map(zone => zone.name).join(", ")}. Los horarios publicados por la Intendencia cubren Montevideo; el resto del área metropolitana viaja en líneas del MTOP, que todavía no leemos.`
        );
      }
      publishedZones = covered;
      const rebuilt = buildTransitIndex(stm, covered);
      const matrix = buildTransitMatrix(rebuilt, covered);
      transitPairs = matrix.pairs;
      transitAgeDays = 0;
      console.log(
        `[transporte] ómnibus: ${matrix.pairs.length} pares con viaje, ${matrix.missing} sin recorrido directo ni de un trasbordo`
      );
      if (matrix.missing > 0) {
        notes.push(
          `${matrix.missing} pares de barrios no tienen recorrido directo ni de un trasbordo en los horarios publicados; para esos la página no estima un tiempo de ómnibus.`
        );
      }
    } catch (error) {
      notes.push("No se pudieron leer los horarios del STM en esta corrida.");
      console.error("[transporte] STM falló", error);
    }
  }

  // La matriz de rutas. Se rehace sólo si está vieja o si se pide expresamente: son cuatro llamadas
  // a un servicio donado y la calle no cambia de un día para el otro.
  let routes: number[][] = [];
  let router: string | null = null;
  let matrixBuiltAt: string | null = null;

  const previous = dryRun ? null : await loadPrevious();
  const previousAgeDays = ageInDays(previous?.coverage?.matrixBuiltAt ?? null);
  const needsMatrix =
    forceMatrix || !previous?.routes?.length || previousAgeDays == null || previousAgeDays >= MATRIX_MAX_AGE_DAYS;

  if (!pricesOnly && needsMatrix) {
    const result = await buildRouteMatrix(publishedZones, {
      router: new TransportRouter(),
      onProgress: (mode, pairs) => console.log(`[transporte] ${mode}: ${pairs} pares ruteados`),
    });
    routes = result.routes;
    router = result.router;
    matrixBuiltAt = new Date().toISOString();
    if (result.failedModes.length) {
      notes.push(`No se pudo rutear: ${result.failedModes.join(", ")}. Esos modos usan velocidad estimada.`);
    }
    console.log(`[transporte] matriz: ${routes.length} filas en ${result.calls} llamadas a ${router}`);
  } else if (previous?.routes?.length) {
    routes = previous.routes;
    router = previous.coverage?.router ?? null;
    matrixBuiltAt = previous.coverage?.matrixBuiltAt ?? null;
    console.log(`[transporte] matriz reutilizada (${routes.length} filas, ${previousAgeDays ?? "?"} días)`);
  }

  // LA CONEXIÓN AL BACKEND HAY QUE ABRIRLA A MANO, y olvidarlo no falla ruidosamente: mongoose
  // ENCOLA las consultas de un modelo cuya conexión todavía no existe y recién tira a los diez
  // segundos, así que el job parecería "lento" y no "mal conectado". `tests/sync/connect_tripwire`
  // vigila exactamente esto para todos los jobs programados.
  //
  // Son DOS bases distintas: el boleto, la nafta y las tasas viven en la del backend
  // (`MongooseServer`) y los catálogos de vehículos en la del app (`classes/appdb.ts`, que abre la
  // suya sola). Un dry run no abre ninguna.
  if (!dryRun) {
    try {
      await withTimeout(MongooseServer.startConnectionPromise(), 15_000);
    } catch (error: any) {
      throw new Error(
        `[transporte] no se puede llegar a la Mongo del backend (boleto, nafta y tasas salen de ahí): ${error?.message || error}`
      );
    }
  }

  const priceResult = await readTransportPrices({ skipDatabases: dryRun });
  if (priceResult.missing.length) {
    notes.push(`Sin datos para: ${priceResult.missing.join(", ")}.`);
  }
  console.log(
    `[transporte] precios: boleto $${priceResult.prices.busFareUyu}, nafta $${priceResult.prices.naftaSuper95PerLitreUyu}, modos con precio ${Object.keys(priceResult.prices.vehiclePriceUyu).join(", ") || "ninguno"}`
  );

  // El consumo MEDIDO sobre el catálogo le gana al supuesto curado, igual que la depreciación.
  if (priceResult.measuredCarConsumption) {
    notes.push(`Consumo del auto medido sobre el catálogo: ${priceResult.measuredCarConsumption} L/100 km.`);
  }

  const snapshot: TransportSnapshot = {
    slug: "current",
    builtAt: new Date(),
    prices: priceResult.prices,
    zones: publishedZones,
    routes,
    transit: transitPairs,
    coverage: {
      zones: publishedZones.length,
      routedPairs: routes.length,
      transitPairs: transitPairs.length,
      matrixBuiltAt,
      router,
      transitAgeDays,
      notes,
    },
  };

  if (dryRun) {
    console.log("[transporte] --dry-run: no se guarda");
    console.log(JSON.stringify({ ...snapshot, routes: routes.length, transit: transitPairs.length }, null, 2).slice(0, 2000));
    return;
  }

  const saved = await saveTransportSnapshot(snapshot);
  if (!saved.saved) {
    throw new Error(`[transporte] no se guardó — ${saved.reason}`);
  }
  console.log(`[transporte] guardado en ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
}

async function loadPrevious(): Promise<TransportSnapshot | null> {
  const { loadTransportSnapshot } = await import("./classes/transporte/store");
  return loadTransportSnapshot().catch(() => null);
}

function ageInDays(iso: string | null): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  return (Date.now() - then) / 86_400_000;
}

export const TRANSPORT_SOURCES = STM_SOURCES;

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  // En dry run nunca se abrió una conexión: cerrarla la crearía sólo para cerrarla.
  const close = async (): Promise<void> => {
    if (dryRun) return;
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    MongooseServer.closeConnection();
  };
  main()
    .then(async () => {
      await close();
      process.exit(0);
    })
    .catch(async error => {
      console.error("[transporte] fallo", error);
      await close();
      process.exit(1);
    });
}
