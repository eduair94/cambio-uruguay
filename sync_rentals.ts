// The rental directory harvest for /alquileres-uruguay.
//
// Reads MercadoLibre (through the scraper service), InfoCasas (its server-rendered payload),
// Facebook Marketplace (the browser service), Casasweb (public result pages and pagination), and
// Inmuebles El Pais (public category pages). Merges adverts into one row per PROPERTY and writes
// them to the APP database the Nuxt site reads. Partial harvests never prove an advert disappeared.
//
// Two modes:
//   * default — the full sweep. Walks every page each portal will give us, then prunes properties
//     nobody has published for three weeks.
//   * `--fast` — the hourly top-up. Reads only what the portals sort as newest (`order=3` on
//     InfoCasas, `since=today` on MercadoLibre), so a flat published at 9am is on the site by 10.
//     It NEVER prunes: it sees a slice of the market, and "not in this slice" is not evidence.
//
// Three properties this job must keep:
//   * a portal that fails degrades the run, never fails it — the page says which one is missing and
//     that portal's rows are preserved rather than deleted as "off the market";
//   * it refuses to publish a collapsed directory over a healthy one;
//   * every price is stored in pesos with the run's rate, so two portals can be compared at all.
import dotenv from "dotenv";
import "dotenv/config";
import fs from "fs";
dotenv.config({ path: "app/.env", quiet: true });

import { appDbConfigured } from "./classes/appdb";
import { recordRentalPriceLogs } from "./classes/pricehistory/marketLog";
import { refreshRentalPriceDrops } from "./classes/rentals/priceDrops";
import { applyDetailPins } from "./classes/rentals/detailPins";
import { buildRentalProperties } from "./classes/rentals/dedupe";
import { fetchUsdUyuRate } from "./classes/rentals/rate";
import { harvestRentalMarket } from "./classes/rentals/sources";
import { sourcesAllowingExpiry } from "./classes/rentals/sources/types";
import {
  carrySourceHistory,
  correctStoredRentalCurrencies,
  countRentals,
  refreshStoredRentalStayFlags,
  dropRejectedStoredRentals,
  retypeStoredRentalOffers,
  loadRentPriceRows,
  loadRentalHistory,
  loadRentalMeta,
  dropReassignedOffers,
  pruneStaleRentals,
  saveRentalMeta,
  saveRentalProperties,
} from "./classes/rentals/store";
import { flagRentalStayPrices, inferRentalCurrencies, rentPriceCohorts } from "./classes/rentals/currency";
import { RENTAL_META_KEY, type RentalMeta } from "./classes/rentals/types";

/** A full run that finds less than this share of what we already had is treated as an outage. */
const COLLAPSE_RATIO = Number(process.env.RENTALS_COLLAPSE_RATIO || 0.5);
/** Days a property may go unpublished before it leaves the directory. */
const PRUNE_DAYS = Number(process.env.RENTALS_PRUNE_DAYS || 21);
/** Days an advert may go unseen by a HEALTHY portal before it is dropped from its property. */
const STALE_OFFER_DAYS = Number(process.env.RENTALS_STALE_OFFER_DAYS || 4);

async function main(): Promise<void> {
  // The app's own env calls this MONGO_URI; the root bridge insists on APP_MONGO_URI so a job can
  // never write the backend database by accident.
  // A root MONGO_URI must never masquerade as the app's URI when dotenv preserves an existing
  // environment variable. Only use the fallback read explicitly from the app's own env file.
  const appEnv = fs.existsSync("app/.env") ? dotenv.parse(fs.readFileSync("app/.env")) : {};
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || appEnv.APP_MONGO_URI || appEnv.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[rentals] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }

  const mode: "full" | "fast" = process.argv.includes("--fast") || process.env.RENTALS_FAST === "1" ? "fast" : "full";
  const startedAt = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const usdUyu = await fetchUsdUyuRate();
  if (!usdUyu) {
    console.error("[rentals] no USD reference rate — refusing to publish prices that cannot be compared");
    process.exit(1);
  }
  console.log(`[rentals] modo ${mode}, dólar de referencia ${usdUyu.toFixed(2)}`);

  const [harvest, history, existing] = await Promise.all([
    harvestRentalMarket(mode, usdUyu),
    loadRentalHistory(),
    countRentals(),
  ]);

  for (const run of harvest.runs) {
    console.log(`[rentals] ${run.ok ? "ok  " : "FAIL"} ${run.key.padEnd(14)} ${run.listings.length} avisos :: ${run.note}`);
  }

  // Only a complete sweep can use absence as evidence. Partial sources and the hourly slice
  // may add/update adverts, but never expire the older offers of a property they happen to touch.
  const okSources = sourcesAllowingExpiry(harvest.runs, mode);
  if (!harvest.runs.some((run) => run.ok && run.listings.length)) {
    console.error("[rentals] ningún portal respondió — se conserva el directorio anterior");
    process.exit(1);
  }

  // A home "in pesos" at a price no home in its zone costs in pesos is a dollar price the portal
  // labelled UYU (Facebook does it by default). Read against the published market, which the hourly
  // slice could not supply by itself; a failed read only skips the correction.
  const cohorts = rentPriceCohorts(await loadRentPriceRows().catch((error) => {
    console.warn("[rentals] sin mercado para deducir monedas:", error instanceof Error ? error.message : error);
    return [];
  }));
  const currencies = inferRentalCurrencies(harvest.listings, cohorts, usdUyu);
  if (currencies.corrected) console.log(`[rentals] ${currencies.corrected} avisos en pesos leídos como dólares por el mercado de su zona`);
  harvest.listings = currencies.listings;
  // A home far under its zone's cheapest rents is probably priced per night (summer stays in
  // Punta del Este): flagged for the reader, never removed.
  const stays = flagRentalStayPrices(harvest.listings, cohorts, usdUyu);
  if (stays.flagged) console.log(`[rentals] ${stays.flagged} avisos con un precio que parece por noche`);
  harvest.listings = stays.listings;

  const properties = buildRentalProperties(harvest.listings, {
    usdUyu,
    today,
    offerFirstSeen: history.offerFirstSeen,
    propertyFirstSeen: history.propertyFirstSeen,
    offerToProperty: history.offerToProperty,
    propertyCanonicalOffer: history.propertyCanonicalOffer,
  });

  const merged = properties.filter((property) => property.sources.length > 1).length;
  const duplicatesCollapsed = harvest.listings.length - properties.length;
  console.log(
    `[rentals] ${harvest.listings.length} avisos -> ${properties.length} propiedades ` +
      `(${duplicatesCollapsed} repetidos unificados, ${merged} publicadas en más de un portal)`
  );

  // The map pin of the Mercado Libre and Casasweb advert pages (currency-rentals-ml-detail,
  // currency-rentals-casasweb-detail): the search cards have no coordinate, so without this every
  // run would blank it. After the dedupe on purpose — a point on the rows before it would change
  // which advert is canonical in a multi-portal group.
  try {
    const located = await applyDetailPins(properties);
    for (const [source, count] of Object.entries(located)) console.log(`[rentals] ${count} propiedades de ${source} ubicadas con el pin de su ficha`);
  } catch (error) {
    console.warn("[rentals] no se pudieron reaplicar los pines de las fichas", error);
  }

  // A full sweep that comes back with half of what we had is an outage upstream, not a market that
  // emptied overnight. Publishing it would delete thousands of live listings.
  if (mode === "full" && existing > 200 && properties.length < existing * COLLAPSE_RATIO) {
    console.error(
      `[rentals] la corrida trajo ${properties.length} propiedades contra ${existing} guardadas ` +
        `(< ${Math.round(COLLAPSE_RATIO * 100)} %) — se conserva el directorio anterior`
    );
    process.exit(1);
  }

  const { written, emptied, separated, assigned } = await saveRentalProperties(properties, {
    today,
    usdUyu,
    offerOwners: history.offerToProperty,
    okSources,
    staleOfferDays: STALE_OFFER_DAYS,
  });

  // El punto de precio de cada aviso visto en esta corrida. Va acá, y no sólo en la corrida diaria de
  // `currency-market-series`, porque ese job mide una vez por día: un aviso que cambia a las 15 y otra
  // vez a las 20 queda con un solo punto, y uno que sube y baja el mismo día no queda. Propio
  // `try/catch`: un fallo del historial nunca puede costar el directorio que ya se guardó.
  try {
    const logged = await recordRentalPriceLogs(properties, today);
    console.log(`[rentals] historial de precio: ${logged.written} avisos`);
  } catch (error) {
    console.error("[rentals] no se pudo registrar el historial de precios", error);
  }
  // "Bajó de precio": se lee de la serie que se acaba de escribir. Mismo motivo para el try/catch.
  try {
    const drops = await refreshRentalPriceDrops(properties, today);
    console.log(`[rentals] bajas de precio: ${drops.drops} propiedades, ${drops.written} filas actualizadas`);
  } catch (error) {
    console.error("[rentals] no se pudieron calcular las bajas de precio", error);
  }

  // Sacar cada aviso de las filas que ya no son su dueña, ANTES de podar: una fila que queda sin
  // ofertas la borra este barrido, y lo que sobrevive entra a la poda con su lastSeen recalculado.
  let pruned = 0;
  // This cleanup follows positive assignments, not absence. It is safe in an hourly slice too:
  // only adverts assigned above are removed from their superseded owners; unseen IDs stay.
  const reassigned = await dropReassignedOffers(assigned);
  if (reassigned.cleaned) {
    console.log(
        `[rentals] ${reassigned.removed} avisos sacados de ${reassigned.cleaned} filas que ya no eran su propiedad (${reassigned.deleted} filas quedaron vacías)`
    );
  }
  if (mode === "full") pruned = await pruneStaleRentals(today, PRUNE_DAYS);
  {
    // Stored adverts the filter now rejects (seasons, per-night stays, things for hire) would
    // otherwise stay public until their 10 days ran out on the partial portals. A reading of each
    // advert's own title, not absence, so the hourly slice may run it too.
    const rejected = await dropRejectedStoredRentals().catch((error) => {
      console.warn("[rentals] no se pudieron revisar los avisos guardados:", error instanceof Error ? error.message : error);
      return { offers: 0, properties: 0, deleted: 0 };
    });
    if (rejected.offers) {
      console.log(`[rentals] ${rejected.offers} avisos guardados que ya no son alquiler mensual de un inmueble (${rejected.properties} filas, ${rejected.deleted} borradas)`);
    }
  }
  // Types that are a function of the title (all of Facebook's; a residence heading anywhere): re-read
  // the stored ones with today's rule, before the currency pass, which asks whether an advert is a home.
  const retyped = await retypeStoredRentalOffers().catch((error) => {
    console.warn("[rentals] no se pudieron releer los tipos guardados:", error instanceof Error ? error.message : error);
    return { offers: 0, properties: 0 };
  });
  if (retyped.offers) console.log(`[rentals] ${retyped.offers} avisos guardados con el tipo de hoy (${retyped.properties} filas)`);
  // Adverts this run did not see again keep their stored price; read those against the market too.
  const storedCurrencies = await correctStoredRentalCurrencies(cohorts, usdUyu).catch((error) => {
    console.warn("[rentals] no se pudieron revisar las monedas guardadas:", error instanceof Error ? error.message : error);
    return 0;
  });
  if (storedCurrencies) console.log(`[rentals] ${storedCurrencies} propiedades guardadas con un precio en pesos leído como dólares`);
  // After the currency pass: the flag reads the price as it now stands.
  const storedStays = await refreshStoredRentalStayFlags(cohorts, usdUyu).catch((error) => {
    console.warn("[rentals] no se pudieron revisar los precios por noche:", error instanceof Error ? error.message : error);
    return { offers: 0, properties: 0 };
  });
  if (storedStays.offers) console.log(`[rentals] ${storedStays.offers} avisos guardados con la marca de precio por noche puesta o quitada (${storedStays.properties} filas)`);

  const total = await countRentals();
  const meta: RentalMeta = {
    key: RENTAL_META_KEY,
    generatedAt: new Date().toISOString(),
    mode,
    durationMs: Date.now() - startedAt,
    usdUyu,
    properties: total,
    offers: properties.reduce((sum, property) => sum + property.offers.length, 0),
    merged,
    sources: harvest.runs.map((run) => ({
      key: run.key,
      ok: run.ok,
      complete: mode === "full" && run.complete === true,
      listings: run.listings.length,
      note: run.note,
      ...(run.access ? { access: run.access } : {}),
    })),
  };
  // A failed read of the previous summary only loses the streak dates, never the run itself.
  await saveRentalMeta(carrySourceHistory(meta, await loadRentalMeta().catch(() => null)));

  console.log(
    `[rentals] listo en ${Math.round(meta.durationMs / 1000)}s :: ${written} filas escritas, ` +
      `${emptied} sin ofertas, ${separated} grupos separados sin perder avisos, ${pruned} podadas, ${total} propiedades publicadas`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("[rentals] falló:", error);
  process.exit(1);
});
