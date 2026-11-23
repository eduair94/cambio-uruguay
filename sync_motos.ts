// El directorio de motos usadas (`/motos-usadas-uruguay`).
//
// En Uruguay la moto es el vehículo de trabajo: es la alternativa de costo medio entre el boleto y
// el auto, y la que más se compra usada. El sitio ya publica autos usados, monopatines y bicicletas
// eléctricas, y justo en el medio tenía un agujero — que además es el modo `moto` del comparador de
// transporte, que lee `motocatalog`/`motocatalogmetas` y hasta hoy decía "sin datos relevados".
//
// Reusa la maquinaria de autos en vez de bifurcarla: el mismo puente de Mercado Libre con la misma
// cadencia y el mismo manejo de 429 (`classes/autos/sources/mercadolibre.ts`), el mismo lector de
// tarjetas (`classes/autos/normalize.ts`) y la misma recta de depreciación (`annualDropOf` /
// `depreciationOf`, cuya firma ya está ensanchada a `{ year, priceUsd }`). Lo propio es el
// vocabulario: la CILINDRADA, que autos no tiene y que acá decide qué se compara con qué.
//
// Como sync_movilidad.ts y a diferencia de sync_autos.ts, este archivo no llama a `process.exit`
// desde adentro de `main()`: cada negativa es un `throw`, `main()` se exporta, y el proceso sólo
// corre (y sólo sale una vez, con la conexión cerrada) detrás de `require.main === module`. Así un
// test puede importar `main` y llamarla contra colaboradores mockeados, sin proceso ni base.
import "./sentry_job";
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config({ path: "app/.env", quiet: true });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/rentals/rate";
import {
  buildMotoCatalog,
  buildMotoModels,
  motoSourceCoverage,
  MOTO_CATALOG_FRESH_DAYS,
} from "./classes/motos/catalog";
import {
  attachMotoDisplacements,
  dedupeMotos,
  enrichMotoListing,
  filterMotos,
  motoFichaExcluded,
  motoInactive,
} from "./classes/motos/enrich";
import { dropImplausibleMotoPrices, motoPriceDropSummary } from "./classes/motos/priceSanity";
import { buildMotoReport } from "./classes/motos/report";
import { harvestMercadoLibreMotos } from "./classes/motos/sources/mercadolibre";
import {
  buildMotoDictionary,
  fbBrandPattern,
  fbCardToMoto,
  motoReferenceFrom,
  type FbMotoResult,
} from "./classes/motos/sources/facebook";
import { motoSourceEnabled } from "./classes/motos/sources";
import {
  collapseRefusal,
  countPublishedMotos,
  loadCatalogMeta,
  loadHarvestMeta,
  loadFbMotoCards,
  loadMotoDictionaryListings,
  loadStoredMotos,
  motoHarvestMetaRecord,
  publishMotoCatalog,
  publishMotoModels,
  saveFbMotos,
  saveHarvestMeta,
  saveMotoHarvest,
  saveRefusal,
} from "./classes/motos/store";
import type {
  MotoDisplacementBandId,
  MotoHarvestResult,
  MotoListing,
  MotoSource,
  MotoType,
  StoredMoto,
} from "./classes/motos/types";

/**
 * Los presupuestos van en CÓDIGO y no en `env:` de pm2: `scripts/deploy-backend.sh` sólo recrea una
 * app ya registrada cuando cambia alguno de los cuatro campos que pm2 congela, así que un `env:`
 * agregado después nunca llega al VPS, sin error y sin aviso.
 *
 * Los números salen de una medición, no de copiar los de autos: el 2026-09-22 MLU1763 tenía 1.391
 * avisos usados en 97 marcas. Recorrer marca → modelo cuesta del orden de 500-600 páginas, que a
 * 1,5 s son unos 15 minutos; el tope de 1.200 pedidos deja margen para que el catálogo crezca y el
 * de 60 minutos es el corte duro. La horaria lee `since=today`, así que ve una fracción de eso.
 */
const ML_BUDGET = {
  full: { maxRequests: 1_200, maxDurationMs: 60 * 60_000 },
  fast: { maxRequests: 250, maxDurationMs: 12 * 60_000 },
  /**
   * `--dry-run` se corre a mano para ver que la cañería anda de punta a punta, no para relevar el
   * mercado, así que una prueba nunca le cuesta al puente compartido los quince minutos de una
   * corrida real. El tope de MARCAS no es cosmético: el recorrido encola las tareas de marca antes
   * que las de modelo, así que un presupuesto chico sin ese tope se gasta entero en páginas de marca
   * y vuelve con cero avisos — o sea que la prueba de humo no probaría lo único que hay que probar,
   * que es que una tarjeta se lee bien de punta a punta.
   */
  dry: { maxRequests: 40, maxDurationMs: 3 * 60_000, maxBrands: 3 },
} as const;

const storedFrom = (listings: MotoHarvestResult["listings"]): StoredMoto[] =>
  listings.map(listing => ({
    key: `ml-${listing.id}`,
    firstSeen: listing.observedAt,
    lastSeen: listing.observedAt,
    listing,
    priceHistory: [{ price: listing.price, currency: listing.currency, observedAt: listing.observedAt }],
    retiredAt: null,
    missedFullSweeps: 0,
  }));

export async function main(): Promise<void> {
  // El app llama `MONGO_URI` a lo que el puente exige como `APP_MONGO_URI`. Se mapea SÓLO si hay un
  // valor real: `process.env.X = undefined` guarda el STRING "undefined" y `appDbConfigured()`
  // devolvería true sin ninguna de las dos configurada.
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) {
    process.env.APP_MONGO_URI = process.env.MONGO_URI;
  }

  const dryRun = process.argv.includes("--dry-run");
  const fast = process.argv.includes("--fast");

  if (!dryRun && !appDbConfigured()) {
    throw new Error("[motos] falta APP_MONGO_URI/MONGO_URI — no se escribe la base equivocada");
  }
  if (dryRun) {
    console.log(
      `[motos] --dry-run: no se toca ninguna base (APP_MONGO_URI ${appDbConfigured() ? "está configurada, pero" : "no está configurada;"} no se conecta)`
    );
  }

  const now = new Date();
  const generatedAt = now.toISOString();
  const usdUyu = await fetchUsdUyuRate();
  if (!(usdUyu > 0)) {
    throw new Error("[motos] sin referencia USD/UYU — se conserva lo publicado en vez de convertir a ciegas");
  }

  // 1. Mercado Libre. Una fuente caída degrada la corrida (se publica lo guardado), no la falla.
  const mlEnabled = motoSourceEnabled("mercadolibre");
  let harvest: MotoHarvestResult | null = null;
  if (mlEnabled) {
    const budget = dryRun ? ML_BUDGET.dry : fast ? ML_BUDGET.fast : ML_BUDGET.full;
    harvest = await harvestMercadoLibreMotos({
      mode: fast ? "fast" : "full",
      maxRequests: budget.maxRequests,
      maxDurationMs: budget.maxDurationMs,
      // Secuencial y espaciado: una ráfaga deja al puente compartido en su proxy residencial 10
      // minutos PARA TODOS los jobs que lo usan (ver CAR_HARVEST_RETRY en autos).
      gapMs: Number(process.env.MOTOS_ML_GAP_MS || 1_500),
      // El barrido por tipo etiqueta casi todos los avisos con la taxonomía del propio origen. Sólo
      // en la completa: en la horaria valen más los 250 pedidos gastados en precios.
      typeSweep: !fast && !dryRun,
      // El tramo de cilindrada es la dimensión propia del directorio y la única que el catálogo
      // tiene de verdad (2 de 73 títulos escriben la unidad, medido): se barre en la completa.
      displacementSweep: !fast && !dryRun,
      maxBrands: dryRun ? ML_BUDGET.dry.maxBrands : undefined,
      onProgress: message => console.log(message),
    });
    console.log(
      `[motos] cosecha ${harvest.mode}: ${harvest.listings.length} avisos, ${harvest.requests} pedidos, ` +
        `${harvest.failedPages} páginas fallidas, ${harvest.cooldowns} esperas por caída` +
        (harvest.note ? `, ${harvest.note}` : "")
    );
  } else {
    console.log("[motos] Mercado Libre desactivado (MOTOS_ML_ENABLED=0): sólo lo guardado");
  }

  if (harvest && !dryRun) {
    const saved = await saveMotoHarvest(harvest);
    const previous = await loadHarvestMeta().catch(() => null);
    await saveHarvestMeta(motoHarvestMetaRecord(harvest, previous));
    console.log(`[motos] guardados ${saved.upserted} avisos, retirados ${saved.retired}`);
  }

  // 2. Lo guardado es la base del catálogo: la horaria publica el mercado entero, no sólo lo de hoy.
  let stored: StoredMoto[] = dryRun ? (harvest ? storedFrom(harvest.listings) : []) : await loadStoredMotos(now);

  // 2b. Facebook Marketplace: las tarjetas de la categoría Vehículos que el lector de AUTOS ya guarda
  // (classes/motos/sources/facebook.ts). No se le pide nada nuevo a Facebook, así que corre también en
  // la horaria. Una lectura que falla deja la corrida con lo de Mercado Libre: degrada, no tumba.
  let fbLastOkAt: string | null = null;
  let fbOk = false;
  if (motoSourceEnabled("facebook") && !dryRun) {
    try {
      const ml = stored.filter(doc => doc.listing.source === "mercadolibre").map(doc => doc.listing);
      const dictionary = buildMotoDictionary([...(await loadMotoDictionaryListings(now)), ...ml]);
      const since = new Date(now.getTime() - MOTO_CATALOG_FRESH_DAYS * 86_400_000).toISOString();
      const cards = await loadFbMotoCards(since, fbBrandPattern(dictionary));
      const context = { dictionary, usdUyu, maxYear: now.getUTCFullYear() + 1, referenceUsd: motoReferenceFrom(ml, usdUyu) };
      const reasons: Record<string, number> = {};
      const accepted: Array<FbMotoResult & { firstSeen: string; lastSeen: string }> = [];
      for (const doc of cards) {
        const result = fbCardToMoto(doc.card, doc.item, doc.lastSeen, context);
        if ("rejected" in result) {
          reasons[result.rejected] = (reasons[result.rejected] ?? 0) + 1;
          continue;
        }
        accepted.push({ ...result, firstSeen: doc.firstSeen, lastSeen: doc.lastSeen });
        if (!fbLastOkAt || doc.lastSeen > fbLastOkAt) fbLastOkAt = doc.lastSeen;
      }
      const saved = await saveFbMotos(accepted);
      // Con Marketplace leído, lo de Facebook que se publica es SÓLO lo aceptado en esta corrida. Lo
      // guardado de corridas anteriores que hoy no pasa (un filtro mejor, o la tarjeta dejó de
      // verse) no puede seguir saliendo por estar en `motolistings`: medido el 23/11/2026, un
      // «Honda CR-V 2.4I» siguió publicado una hora después de que el filtro nuevo lo rechazara.
      stored = [...stored.filter(doc => doc.listing.source !== "facebook"), ...saved];
      fbOk = cards.length > 0;
      console.log(
        `[motos] Facebook Marketplace: ${cards.length} tarjetas con marca de moto, ${accepted.length} motos ` +
          `(${accepted.filter(result => result.listing.currencyInferred).length} con moneda deducida); descartes ${JSON.stringify(reasons)}`
      );
    } catch (error) {
      console.error("[motos] Facebook Marketplace no se pudo leer; la corrida sigue con Mercado Libre", error);
    }
  }

  // 3. Lo que no es una moto usada en venta se va antes de cualquier estadística. Los cuatriciclos,
  // triciclos y motocarros salen de la faceta del propio ML: medido, 16 de sus 23 títulos distintos
  // no nombran su clase en ninguna parte.
  const excludedIds = new Set(harvest?.excludedIds ?? []);
  // La ficha propia también lo dice (fila «Tipo de moto»), y vale aunque la corrida de hoy no haya
  // barrido las facetas: la horaria nunca las barre.
  for (const doc of stored) if (motoFichaExcluded(doc.detail)) excludedIds.add(doc.listing.id);
  // Un aviso que su propia ficha da por pausado o finalizado no se lista, salvo que la búsqueda lo
  // haya vuelto a mostrar después de leerla.
  const inactive = stored.filter(motoInactive).length;
  if (inactive) console.log(`[motos] ${inactive} avisos inactivos según su ficha: no se publican`);
  const filtered = filterMotos(
    stored.filter(doc => !motoInactive(doc)).map(doc => ({ ...doc, id: doc.listing.id, title: doc.listing.title })),
    excludedIds
  );
  if (Object.keys(filtered.rejected).length) {
    console.log(`[motos] descartados: ${JSON.stringify(filtered.rejected)}`);
  }

  const declaredTypes = new Map<string, MotoType>((harvest?.types ?? []).map(entry => [entry.id, entry.type]));
  const declaredBands = new Map<string, MotoDisplacementBandId>(
    (harvest?.displacements ?? []).map(entry => [entry.id, entry.band])
  );
  const single: MotoListing[] = filtered.kept.map(doc =>
    enrichMotoListing(doc.listing, {
      usdUyu,
      firstSeen: doc.firstSeen,
      lastSeen: doc.lastSeen,
      priceHistory: doc.priceHistory ?? [],
      // Lo que midió ESTA corrida primero; si no barrió las facetas (la horaria no lo hace, son
      // ~170 páginas del puente compartido), lo que dejó guardado la última corrida completa.
      declaredType: declaredTypes.get(doc.listing.id) ?? doc.facets?.type ?? null,
      declaredBand: declaredBands.get(doc.listing.id) ?? doc.facets?.displacementBand ?? null,
      detail: doc.detail ?? null,
    })
  );
  // La cilindrada con el consenso del modelo, que necesita ver a todos los avisos juntos
  // (classes/motos/displacement.ts). Antes de la guarda de precios, que no la usa, y antes de las
  // bandas, que sólo cuentan la cilindrada que dice el aviso.
  const enriched = attachMotoDisplacements(single);
  const bases = new Map<string, number>();
  for (const listing of enriched) {
    const basis = listing.displacementBasis ?? "sin dato";
    bases.set(basis, (bases.get(basis) ?? 0) + 1);
  }
  console.log(`[motos] cilindrada por base: ${JSON.stringify(Object.fromEntries(bases))}`);

  // 4. Un precio que no puede ser el de esa moto se RETIRA antes del análisis, no se corrige: así el
  // veredicto vale a la vez para el catálogo, las bandas y el informe.
  const sane = dropImplausibleMotoPrices(enriched);
  if (sane.dropped.length) {
    console.log(`[motos] precios imposibles retirados: ${sane.dropped.length} ${JSON.stringify(motoPriceDropSummary(sane.dropped))}`);
  }

  const deduped = dedupeMotos(sane.kept);

  // 5. El catálogo público y las fichas de modelo.
  const harvestOk = !!harvest && !harvest.note;
  const sourceMeta = new Map<MotoSource, { lastOkAt: string | null; ok: boolean }>([
    ["mercadolibre", { lastOkAt: harvestOk && harvest ? harvest.finishedAt : null, ok: harvestOk }],
    ["facebook", { lastOkAt: fbLastOkAt, ok: fbOk }],
  ]);
  const catalog = buildMotoCatalog(deduped.kept, {
    now,
    generatedAt,
    usdUyu,
    lastFullReadAt: harvest && harvest.mode === "full" ? harvest.finishedAt : null,
    lastReadAt: harvest?.finishedAt ?? null,
    reportedTotal: harvest?.reportedTotal ?? null,
    // La cobertura se calcula DESPUÉS, sobre las filas que de verdad quedaron publicables: contar
    // avisos antes de proyectarlos publicaría un número que no es el de la página.
    sources: [],
  });
  catalog.meta.sources = motoSourceCoverage(catalog.listings, deduped.duplicates, sourceMeta);

  const models = buildMotoModels(deduped.kept, { now, generatedAt });
  const report = buildMotoReport(
    deduped.kept.filter(listing => Date.parse(listing.lastSeen) >= now.getTime() - MOTO_CATALOG_FRESH_DAYS * 86_400_000),
    {
      generatedAt,
      usdUyu,
      withoutDisplacement: catalog.meta.withoutDisplacement,
      withoutDisplacementBand: catalog.meta.withoutDisplacementBand,
    }
  );

  console.log(
    `[motos] ${catalog.listings.length} avisos publicables, ${models.length} fichas de modelo, ` +
      `${catalog.meta.withoutDisplacement} sin cilindrada exacta y ${catalog.meta.withoutDisplacementBand} sin tramo, ` +
      `${report.depreciation.length} modelos con depreciación medida`
  );

  if (dryRun) {
    const band = models.find(model => model.band);
    if (band && band.band) {
      console.log(
        `[motos] ejemplo de banda: ${band.slug} n=${band.band.n} p25=US$${band.band.p25} mediana=US$${band.band.median} p75=US$${band.band.p75}`
      );
    }
    console.log("[motos] --dry-run: no se escribe nada");
    return;
  }

  // 6. Una corrida sin una sola moto publicable nunca blanquea el catálogo: falla fuerte, que es lo
  // que hace que alguien lo mire, en vez de dejar la página vacía en silencio.
  if (!catalog.listings.length) {
    throw new Error("[motos] ninguna moto publicable en esta corrida — se conserva el catálogo anterior");
  }

  // 7. Guarda de corrida flaca, antes de publicar. El denominador es lo que HAY PUBLICADO ahora
  // mismo (y no lo guardado en el ledger privado, que arrastra avisos viejos que nadie retiró),
  // porque lo que esta corrida está por pisar es exactamente eso. La primera corrida tiene el
  // catálogo vacío, así que nunca la dispara.
  const publishedCount = await countPublishedMotos().catch(async () => (await loadCatalogMeta())?.listings ?? 0);
  const refusal = collapseRefusal(publishedCount, catalog.listings.length, "catálogo de motos");
  // La negativa se anota SIEMPRE (con `null` cuando no hubo), así el documento dice "esta corrida
  // publicó" en vez de quedarse con la negativa de anteayer.
  await saveRefusal(refusal, generatedAt);
  if (refusal) {
    throw new Error(`[motos] ${refusal}`);
  }

  await publishMotoCatalog(catalog.listings, catalog.meta);
  console.log(`[motos] catálogo publicado: ${catalog.listings.length} avisos`);

  // Try/catch propio: un fallo escribiendo las fichas nunca puede costar el catálogo recién
  // publicado, que es lo que el comparador de transporte lee.
  try {
    await publishMotoModels(models, { version: 1, generatedAt, report });
    console.log(`[motos] fichas publicadas: ${models.length} modelos + el informe`);
  } catch (error) {
    console.error("[motos] no se pudieron publicar las fichas de modelo ni el informe", error);
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  main()
    .then(async () => {
      // En un dry run nunca se abrió conexión, así que tampoco se cierra: `appConnection()` crearía
      // una sólo para cerrarla.
      if (!dryRun && appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(0);
    })
    .catch(async error => {
      console.error("[motos] fallo", error);
      if (!dryRun && appDbConfigured()) await appConnection().close().catch(() => undefined);
      process.exit(1);
    });
}
