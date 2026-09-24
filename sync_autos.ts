import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { analyzeCars } from "./classes/autos/analyze";
import { buildCarDictionary } from "./classes/autos/catalog/dictionary";
import { guideKey, type CarGuideEntry } from "./classes/autos/catalog/guide";
import { attachReferences, dedupeAcrossSources, referenceMedians, sourceCoverage } from "./classes/autos/dedupe";
import { attachBodyType } from "./classes/autos/bodyType";
import { dropImplausiblePrices, priceDropSummary } from "./classes/autos/priceSanity";
import { attachFuelEconomy } from "./classes/autos/fuelEconomy";
import { inferDealerAccounts } from "./classes/autos/contacts/accounts";
import { buildCarContacts, contactSummary } from "./classes/autos/contacts/build";
import { DEALER_CONTACT_SOURCES, readDealerContacts, type DealerContactRecord } from "./classes/autos/contacts/dealers";
import { fetchCarDetails } from "./classes/autos/detail";
import { buildTrimIndex, mineTrims, type TrimCorpusRow } from "./classes/autos/catalog/trims";
import { carKey, enrichCarListing } from "./classes/autos/enrich";
import { runFacebook } from "./classes/autos/facebookRun";
import { buildMarketSnapshots } from "./classes/autos/market";
import { fold, slugify } from "./classes/autos/normalize";
import { IS_A_PART } from "./classes/autos/sources/common";
import { buildCarCatalog, buildOpportunitySnapshot, buildRiskSnapshot, CAR_CATALOG_FRESH_DAYS } from "./classes/autos/project";
import { buildCarAdvisor } from "./classes/autos/advisor";
import { buildCarReport, CAR_REPORT_POLICY } from "./classes/autos/report";
import { quantile } from "./classes/autos/stats";
import { analyzeCarRisk } from "./classes/autos/riskAnalyze";
import { harvestWebSource, sourceEnabled, WEB_SOURCES } from "./classes/autos/sources";
import type { WebCarContext } from "./classes/autos/sources/common";
import { harvestMercadoLibreCars } from "./classes/autos/sources/mercadolibre";
import {
  collapseRefusal, loadCatalogMeta, loadContactOptOuts, loadDealerContacts, loadGuideEntries, loadHarvestMeta, loadOpportunityStats,
  loadRetiredCarSpans, loadSourceMetas, loadStoredCars,
  loadVocabularies, mergeVocabularies, publishCarCatalog, publishCarContacts, publishCarMarkets, saveCarDetails, saveCarHarvest,
  loadCarPartsRecords, saveCarAdvisorSnapshot, saveCarOpportunitySnapshot, saveCarReportSnapshot, saveCarRiskSnapshot, saveDealerContacts, saveFbWanted, saveHarvestMeta, saveRefusal,
  saveSourceHarvest, saveSourceMeta, saveVocabularies,
  sourceMetaRecord,
} from "./classes/autos/store";
import type {
  CarDetail, CarHarvestResult, CarListing, CarModelVocabulary, CarSource, CarSourceResult, RawCarListing, StoredCar,
} from "./classes/autos/types";
import { fetchUsdUyuRate } from "./classes/rentals/rate";

const argument = (name: string): string | undefined =>
  process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

function storedFrom(listings: readonly RawCarListing[], details: ReadonlyMap<string, CarDetail> = new Map()): StoredCar[] {
  return listings.map(listing => {
    const key = carKey(listing.id, listing.source);
    return {
      key, firstSeen: listing.observedAt, lastSeen: listing.observedAt, listing,
      priceHistory: [{ price: listing.price, currency: listing.currency, observedAt: listing.observedAt }],
      retiredAt: null, missedFullSweeps: 0, detail: details.get(key) ?? null,
    };
  });
}

function failedSource(source: CarSource, startedAt: string, error: unknown): CarSourceResult {
  return {
    source, ok: false, complete: false, listings: [], details: new Map(), requests: 0,
    // Only the error class: messages can carry URLs or hosts.
    note: `falla del lector: ${String((error as Error)?.name || "Error")}`, startedAt, finishedAt: new Date().toISOString(),
  };
}

/** What the version miner reads from a stored advert: the seller's words plus ML's own "Versión". */
const trimRowOf = (doc: StoredCar): TrimCorpusRow => ({
  brandId: doc.listing.brandId, modelId: doc.listing.modelId, brand: doc.listing.brand, model: doc.listing.model,
  title: doc.listing.title, specText: doc.listing.specText ?? null, version: doc.detail?.version ?? null,
});

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const fast = process.argv.includes("--fast");
  const analyzeOnly = process.argv.includes("--analyze-only");
  const withFacebook = process.argv.includes("--with-facebook");
  const reportFile = argument("report");
  const snapshotFile = argument("harvest-snapshot");
  const saveHarvestFile = argument("save-harvest");
  const sourcesArgument = argument("sources");
  if (sourcesArgument) process.env.AUTOS_SOURCES = sourcesArgument;
  // Replaying an old harvest into production would move lastSeen back and un-retire adverts
  // the real world has since dropped; only a --dry-run may read one.
  if (snapshotFile && !dryRun) throw new Error("--harvest-snapshot requires --dry-run");
  if (!dryRun && !appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const mlEnabled = sourceEnabled("mercadolibre");
  const now = new Date();
  const maxYear = now.getUTCFullYear() + 1;
  const usdUyu = await fetchUsdUyuRate();
  if (!(usdUyu > 0)) throw new Error("No current USD/UYU reference; keeping previous publication");

  // 1. Mercado Libre.
  let harvest: CarHarvestResult | null = null;
  if (snapshotFile) harvest = JSON.parse(fs.readFileSync(snapshotFile, "utf8").replace(/^\uFEFF/, ""));
  else if (!analyzeOnly && mlEnabled) {
    harvest = await harvestMercadoLibreCars({
      mode: fast ? "fast" : "full",
      // Sequential and spaced on purpose: a burst makes the shared bridge fall back to its proxy for
      // 10 minutes for every job (see CAR_HARVEST_RETRY). ~1,750 pages take about two hours.
      maxRequests: Number(process.env.AUTOS_ML_MAX_REQUESTS || (fast ? 800 : 4_000)),
      maxDurationMs: (fast ? 20 : 150) * 60_000,
      concurrency: Number(process.env.AUTOS_ML_CONCURRENCY || 1),
      gapMs: Number(process.env.AUTOS_ML_GAP_MS || 1_500),
      onProgress: message => console.log(message),
    });
    console.log(`[autos] harvest ${harvest.mode}: ${harvest.listings.length} adverts, ${harvest.requests} requests, ${harvest.failedPages} failed pages, ${harvest.cooldowns} outage waits${harvest.note ? `, ${harvest.note}` : ""}`);
  } else if (!mlEnabled) {
    console.log("[autos] Mercado Libre desactivado: sólo las demás fuentes y lo guardado");
  }
  if (harvest && saveHarvestFile) fs.writeFileSync(saveHarvestFile, JSON.stringify(harvest));

  let vocabularies: CarModelVocabulary[] = dryRun ? [] : await loadVocabularies();
  if (harvest) vocabularies = mergeVocabularies(vocabularies, harvest.vocabularies);
  // What Mercado Libre itself publishes, kept apart: its names beat a mined one when both match.
  const mlVocabularies = vocabularies.map(vocabulary => ({ ...vocabulary, trims: [...vocabulary.trims] }));
  if (harvest && !dryRun) {
    const saved = await saveCarHarvest(harvest);
    await saveVocabularies(vocabularies, harvest.finishedAt);
    await saveHarvestMeta(harvest);
    console.log(`[autos] stored ${saved.upserted} adverts, retired ${saved.retired}`);
  }
  const dryDocs: StoredCar[] = dryRun && harvest ? storedFrom(harvest.listings) : [];
  const loadDocs = async (): Promise<StoredCar[]> => (dryRun ? dryDocs : loadStoredCars(now));

  // 2. Every source is identified against the ML dictionary, so its cars join ML's cohorts.
  let stored = await loadDocs();
  // Mercado Libre's own facet leaves 515 of 932 models without a single version name, so the rest of
  // the vocabulary is mined from the corpus we already hold (classes/autos/catalog/trims.ts).
  vocabularies = mineTrims(stored.map(doc => trimRowOf(doc)), vocabularies);
  const trimsByModel = new Map(vocabularies.map(vocabulary => [`${vocabulary.brandId}|${vocabulary.modelId}`, vocabulary.trims]));
  const officialTrims = new Map(mlVocabularies.map(vocabulary => [`${vocabulary.brandId}|${vocabulary.modelId}`, vocabulary.trims]));
  const trimIndexes = new Map(
    [...trimsByModel].map(([key, trims]) => [key, buildTrimIndex(trims, officialTrims.get(key) ?? [])] as const),
  );
  const enrich = (doc: StoredCar, detail: CarDetail | null): CarListing => {
    const key = `${doc.listing.brandId}|${doc.listing.modelId}`;
    return enrichCarListing(doc.listing, {
      usdUyu, trims: trimsByModel.get(key) ?? [], trimIndex: trimIndexes.get(key),
      firstSeen: doc.firstSeen, lastSeen: doc.lastSeen, priceHistory: doc.priceHistory ?? [], detail,
      photoCheck: doc.photoCheck ?? null,
    });
  };
  const dictionary = buildCarDictionary(stored.map(doc => doc.listing), vocabularies);
  const guide: Map<string, CarGuideEntry> = dryRun ? new Map() : await loadGuideEntries();
  const sourceResults: CarSourceResult[] = [];
  let dealerRecords: DealerContactRecord[] = [];
  if (!analyzeOnly && !fast) {
    for (const source of WEB_SOURCES) {
      if (!sourceEnabled(source)) continue;
      const context: WebCarContext = { observedAt: new Date().toISOString(), maxYear, dictionary };
      let result: CarSourceResult;
      try {
        result = await harvestWebSource(source, context);
      } catch (error) {
        result = failedSource(source, context.observedAt, error);
      }
      console.log(`[autos] ${source}: ${result.listings.length} avisos, ${result.requests} lecturas, ${result.complete ? "completa" : result.ok ? "parcial" : "falló"}${result.note ? `, ${result.note}` : ""}`);
      sourceResults.push(result);
      if (dryRun) dryDocs.push(...storedFrom(result.listings, result.details));
      else {
        const saved = await saveSourceHarvest(result);
        await saveSourceMeta(result);
        console.log(`[autos] ${source}: stored ${saved.upserted}, retired ${saved.retired}`);
      }
    }
    // El número comercial de cada automotora sale de la página de contacto de su propia web: una
    // lectura por corrida diaria (classes/autos/contacts/dealers.ts). La horaria usa lo guardado.
    dealerRecords = await readDealerContacts(dryRun ? new Map() : await loadDealerContacts(), {
      sources: DEALER_CONTACT_SOURCES.filter(source => sourceEnabled(source)),
    });
    console.log(`[autos] contacto de automotoras: ${dealerRecords.map(record => `${record.source}=${record.ok ? record.phones.length : `0 (${record.note})`}`).join(" ")}`);
    if (!dryRun) await saveDealerContacts(dealerRecords);
  }

  // 3. Facebook: its currency is deduced against the other sources' medians (then the ML guide).
  if (!analyzeOnly && sourceEnabled("facebook") && (!dryRun || withFacebook)) {
    stored = await loadDocs();
    const known = stored.filter(doc => doc.listing.source !== "facebook").map(doc => enrich(doc, doc.detail));
    const medians = referenceMedians(known);
    const slugsById = new Map(dictionary.models.map(model => [`${model.brandId}|${model.modelId}`, [slugify(model.brand), slugify(model.model)] as const]));
    const brandCounts = new Map<string, number>();
    for (const doc of stored) brandCounts.set(doc.listing.brand, (brandCounts.get(doc.listing.brand) ?? 0) + 1);
    const facebook = await runFacebook({
      fast, dryRun, now, dictionary, maxYear, usdUyu,
      brandQueries: [...brandCounts].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([brand]) => brand),
      referenceUsd: (brandId, modelId, year) => {
        const median = medians.get(`${brandId}|${modelId}|${year}`);
        if (median) return median;
        const slugs = slugsById.get(`${brandId}|${modelId}`);
        return (slugs && guide.get(guideKey(slugs[0], slugs[1], year))?.averageUsd) || null;
      },
    });
    const result = facebook.result;
    console.log(`[autos] facebook: ${facebook.cardsRead} tarjetas, ${facebook.itemsRead} fichas, ${result.listings.length} autos identificados${result.note ? `, ${result.note}` : ""}`);
    sourceResults.push(result);
    if (dryRun) dryDocs.push(...storedFrom(result.listings, result.details));
    else {
      const saved = await saveSourceHarvest(result, { retireKeys: facebook.retireKeys });
      await saveSourceMeta(result);
      console.log(`[autos] facebook: stored ${saved.upserted}, retired ${saved.retired}`);
    }
  }

  // 4. Analysis over every source, one row per car.
  stored = await loadDocs();
  // Fuel economy and body type last: an advert that states neither takes what the OTHER adverts of
  // its model state, so both need the whole catalogue (classes/autos/fuelEconomy.ts, ./bodyType.ts).
  // Y el ultimo paso saca los avisos cuyo precio no puede ser el de ese auto, ANTES del analisis,
  // para que el mismo veredicto valga para el catalogo, las oportunidades, el riesgo y el informe
  // (classes/autos/priceSanity.ts). Un precio que no es un precio tampoco es una cohorte ni un
  // comparable.
  const enrichAll = (docs: readonly StoredCar[], extra: ReadonlyMap<string, CarDetail>): CarListing[] => {
    const enriched = attachBodyType(attachFuelEconomy(attachReferences(docs.map(doc => enrich(doc, extra.get(doc.key) ?? doc.detail)), guide)));
    // Un repuesto publicado en la categoría de autos tiene precio de repuesto, así que ninguna banda
    // de precios lo va a agarrar: se va por lo que dice ser (classes/autos/sources/common.ts).
    const parts = enriched.filter(listing => IS_A_PART.test(fold(listing.title).trim()));
    if (parts.length) console.log(`[autos] repuestos publicados como autos: ${parts.length} retirados (${parts.map(p => p.title.slice(0, 40)).join(" | ")})`);
    const partKeys = new Set(parts.map(listing => listing.key));
    const { kept, dropped } = dropImplausiblePrices(enriched.filter(listing => !partKeys.has(listing.key)));
    if (dropped.length) {
      console.log(`[autos] precios imposibles: ${dropped.length} avisos retirados ${JSON.stringify(priceDropSummary(dropped))}`);
      for (const item of dropped.slice(0, 10))
        console.log(`  ${item.key} US$${item.priceUsd}${item.median === null ? " (piso absoluto)" : ` vs mediana ${Math.round(item.median)} de su ${item.basis}`}`);
    }
    return kept;
  };
  const enrichedAll = enrichAll(stored, new Map());
  // Qué cuentas de Mercado Libre son de qué automotora, por los autos que comparten con su web: se
  // mide ANTES del dedupe, que justamente descarta a esos gemelos (classes/autos/contacts/accounts.ts).
  const dealerAccounts = inferDealerAccounts(enrichedAll);
  const accountSummary = new Map<string, number[]>();
  for (const account of dealerAccounts.values()) accountSummary.set(account.source, [...(accountSummary.get(account.source) ?? []), account.twins]);
  console.log(`[autos] cuentas de ML de automotoras: ${[...accountSummary].map(([source, twins]) => `${source}=${twins.length} (${twins.join("+")} gemelos)`).join(" ") || "ninguna"}`);
  let { kept: listings, duplicates } = dedupeAcrossSources(enrichedAll);
  const details = new Map(listings.filter(listing => listing.detail).map(listing => [listing.key, listing.detail!] as [string, CarDetail]));
  let analysis = analyzeCars(listings, { now, details, trimIndexes });

  const wantedMl = analysis.needsDetail.filter(key => key.startsWith("ml-"));
  if (!dryRun) {
    const wantedFb = analysis.needsDetail.filter(key => key.startsWith("fb-")).map(key => key.slice(3));
    await saveFbWanted(wantedFb, new Date().toISOString());
  }
  if (wantedMl.length && mlEnabled) {
    const byKey = new Map(listings.map(listing => [listing.key, listing]));
    const fetched = await fetchCarDetails(
      wantedMl.map(key => byKey.get(key)!).map(listing => ({ key: listing.key, permalink: listing.permalink })),
      { max: Number(process.env.AUTOS_DETAIL_MAX || (fast ? 120 : 400)), maxDurationMs: (fast ? 8 : 20) * 60_000 },
    );
    console.log(`[autos] advert pages: ${fetched.details.size} read, ${fetched.gone.length} gone, ${fetched.failed} failed`);
    if (!dryRun) await saveCarDetails(fetched, new Date().toISOString());
    const gone = new Set(fetched.gone);
    ({ kept: listings, duplicates } = dedupeAcrossSources(enrichAll(stored.filter(doc => !gone.has(doc.key)), fetched.details)));
    for (const [key, detail] of fetched.details) details.set(key, detail);
    analysis = analyzeCars(listings, { now, details, trimIndexes });
  }

  // 5. Publication.
  const generatedAt = new Date().toISOString();
  const lastFull = dryRun ? null : await loadHarvestMeta("uy-cars-last-full");
  const lastRun = dryRun ? null : await loadHarvestMeta("uy-cars");
  const metas = new Map<CarSource, { lastOkAt: string | null; ok: boolean }>(dryRun
    ? sourceResults.map(result => {
      const record = sourceMetaRecord(result, null);
      return [result.source, { lastOkAt: record.lastOkAt, ok: record.ok }];
    })
    : [...(await loadSourceMetas())]);
  const mlMeta = (lastRun ?? (harvest ? { ok: harvest.failedPages === 0, lastOkAt: harvest.finishedAt } : null)) as { ok?: boolean; lastOkAt?: string | null } | null;
  if (mlMeta) metas.set("mercadolibre", { ok: mlMeta.ok === true, lastOkAt: mlMeta.lastOkAt ?? null });
  // Los teléfonos (classes/autos/contacts/build.ts): sólo de avisos que entran al catálogo. El catálogo
  // lleva la bandera; el número va a su propia colección, que se publica junto con el catálogo.
  const dealers = dryRun ? new Map(dealerRecords.map(record => [record.source, record] as const)) : await loadDealerContacts();
  const optOuts = dryRun ? new Set<string>() : await loadContactOptOuts();
  const freshCutoff = now.getTime() - CAR_CATALOG_FRESH_DAYS * 86_400_000;
  const contacts = buildCarContacts(listings.filter(listing => Date.parse(listing.lastSeen) >= freshCutoff), { now, dealers, optOuts, accounts: dealerAccounts });
  const contactKeys = new Set(contacts.map(contact => contact.key));
  const contactStats = contactSummary(contacts);
  console.log(`[autos] teléfonos: ${JSON.stringify(contactStats)}`);
  const catalog = buildCarCatalog(listings, analysis, {
    now, generatedAt, usdUyu, contactKeys,
    lastFullReadAt: (lastFull?.lastOkAt as string | undefined) ?? (harvest?.mode === "full" ? harvest.finishedAt : null),
    lastReadAt: (lastRun?.finishedAt as string | undefined) ?? harvest?.finishedAt ?? null,
    reportedTotal: (lastFull?.reportedTotal as number | undefined) ?? harvest?.reportedTotal ?? null,
    sources: [],
  });
  catalog.meta.sources = sourceCoverage(catalog.listings, duplicates, metas);
  const markets = buildMarketSnapshots(listings, { now, generatedAt, freshDays: CAR_CATALOG_FRESH_DAYS, guide });
  const snapshot = buildOpportunitySnapshot(analysis, { generatedAt, usdUyu });
  // Los que están baratos CON motivo declarado: otro tablero, otra cohorte (la limpia) y ninguna
  // pretensión de que sean oportunidades. Ver classes/autos/riskAnalyze.ts.
  const riskAnalysis = analyzeCarRisk(listings, { now });
  const riskSnapshot = buildRiskSnapshot(riskAnalysis, { generatedAt, usdUyu });
  // El informe del mercado: agregados sobre los mismos avisos (classes/autos/report.ts).
  // Los retirados se piden aparte: `loadStoredCars` filtra `retiredAt: null`, y sin ellos la rotación
  // mediría sobre cero avisos. El bloque de riesgo sale del análisis para no publicar dos cifras.
  const retiredSpans = dryRun ? [] : await loadRetiredCarSpans(now);
  const report = buildCarReport(listings, stored, {
    now,
    maxYear,
    retired: retiredSpans,
    risk: {
      adverts: riskAnalysis.stats.declared,
      share: riskAnalysis.stats.input ? Math.round((riskAnalysis.stats.declared / riskAnalysis.stats.input) * 1000) / 1000 : 0,
      byCategory: riskAnalysis.categories.map(category => ({ category: category.category, adverts: category.adverts })),
    },
  });
  const reportSnapshot = { version: 1 as const, generatedAt, usdUyu, data: report };
  // El asesor de compra (/que-auto-comprar-uruguay): los mismos avisos, una tabla por modelo, y la
  // caída típica calculada igual que la del informe para que las dos páginas digan el mismo número.
  const drops = report.models.map(model => model.annualDrop).filter((drop): drop is number => drop !== null);
  // Es un agregado de más: si falla, se avisa y la corrida sigue publicando catálogo e informe.
  let advisor: ReturnType<typeof buildCarAdvisor> | null = null;
  try {
    advisor = buildCarAdvisor(listings, {
      maxYear,
      parts: dryRun ? [] : await loadCarPartsRecords(),
      typicalDrop: drops.length ? Math.round(quantile(drops, 0.5) * 1000) / 1000 : null,
    });
  } catch (error) {
    console.error("[autos] asesor falló; se conserva el snapshot anterior:", error);
  }
  const advisorSnapshot = advisor ? { version: 1 as const, generatedAt, usdUyu, data: advisor } : null;
  console.log(`[autos] catalog ${catalog.listings.length}, models ${markets.length}, opportunities ${snapshot.items.length}, duplicates ${JSON.stringify(duplicates)}`, JSON.stringify(analysis.stats));
  console.log(`[autos] informe: ${report.models.length} modelos con ${CAR_REPORT_POLICY.minimumAdverts}+ avisos, ` +
    `mediana US$ ${report.market.price.median}, ${report.depreciation.length} curvas de depreciación, ` +
    `automotora vs dueño ${report.sellerGaps.median === null ? "sin dato" : `${Math.round(report.sellerGaps.median * 100)}%`}, ` +
    `rotación ${report.rotation.measurable ? `${report.rotation.medianDays} días` : "todavía no"}`);
  if (advisor) console.log(`[autos] asesor: ${advisor.models.length} modelos, ${advisor.models.filter(model => model.parts?.index != null).length} con índice de repuestos`);
  console.log(`[autos] riesgo declarado ${riskAnalysis.stats.declared} avisos, ${riskAnalysis.stats.measured} con descuento medido`,
    JSON.stringify(riskAnalysis.categories.map(category => `${category.category}:${category.adverts}${category.medianGap === null ? "" : `/${Math.round(category.medianGap * 100)}%`}`)));
  console.log(`[autos] sources ${catalog.meta.sources.map(item => `${item.source}=${item.listings}`).join(" ")}`);

  if (reportFile) {
    const bySource = new Map<string, typeof catalog.listings>();
    for (const row of catalog.listings) bySource.set(row.source, [...(bySource.get(row.source) ?? []), row]);
    fs.writeFileSync(reportFile, JSON.stringify({
      dryRun, catalogMeta: catalog.meta, duplicates, contacts: contactStats, markets: markets.slice(0, 30), snapshot, riskSnapshot, reportSnapshot, advisorSnapshot,
      samples: Object.fromEntries([...bySource].map(([source, rows]) => [source, rows.filter((_, index) => index % Math.max(1, Math.floor(rows.length / 20)) === 0).slice(0, 20)])),
    }, null, 2));
  }
  if (dryRun) return;

  const previousCatalog = await loadCatalogMeta();
  const catalogRefusal = collapseRefusal(previousCatalog?.listings, catalog.listings.length, "catálogo");
  if (catalogRefusal) console.warn(`[autos] ${catalogRefusal}`);
  else {
    await publishCarCatalog(catalog.listings, catalog.meta);
    const catalogKeys = new Set(catalog.listings.map(row => row.key));
    const published = await publishCarContacts(contacts.filter(contact => catalogKeys.has(contact.key)), generatedAt);
    console.log(`[autos] teléfonos publicados ${published.written}, borrados ${published.removed}`);
    if (markets.length) await publishCarMarkets(markets);
    else console.log("[autos] sin modelos con avisos frescos suficientes; se saltea la publicación de mercados");
  }
  const previousStats = await loadOpportunityStats();
  const snapshotRefusal = collapseRefusal(previousStats?.input, snapshot.stats.input, "oportunidades");
  if (snapshotRefusal) console.warn(`[autos] ${snapshotRefusal}`);
  else await saveCarOpportunitySnapshot(snapshot);
  await saveCarRiskSnapshot(riskSnapshot);
  await saveCarReportSnapshot(reportSnapshot);
  // El asesor es un agregado más: una corrida flaca (catálogo rechazado) no lo reescribe, y si guardarlo
  // falla se avisa y la corrida termina igual, con su motivo de rechazo guardado.
  if (!advisorSnapshot || !advisorSnapshot.data.models.length || catalogRefusal) {
    console.warn("[autos] asesor sin publicar esta vez; se conserva el snapshot anterior");
  } else {
    try {
      await saveCarAdvisorSnapshot(advisorSnapshot);
    } catch (error) {
      console.error("[autos] no se pudo guardar el asesor; se conserva el anterior:", error);
    }
  }

  const refusalText = [catalogRefusal, snapshotRefusal].filter((reason): reason is string => !!reason).join(" · ") || null;
  await saveRefusal(refusalText, generatedAt);
}

main()
  .then(async () => {
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async error => {
    console.error("[autos] failed:", error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
