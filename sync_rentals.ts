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
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import { buildRentalProperties } from "./classes/rentals/dedupe";
import { fetchUsdUyuRate } from "./classes/rentals/rate";
import { harvestRentalMarket } from "./classes/rentals/sources";
import { sourcesAllowingExpiry } from "./classes/rentals/sources/types";
import {
  countRentals,
  loadRentalHistory,
  dropReassignedOffers,
  pruneStaleRentals,
  saveRentalMeta,
  saveRentalProperties,
} from "./classes/rentals/store";
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
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
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

  const properties = buildRentalProperties(harvest.listings, {
    usdUyu,
    today,
    offerFirstSeen: history.offerFirstSeen,
    propertyFirstSeen: history.propertyFirstSeen,
    offerToProperty: history.offerToProperty,
  });

  const merged = properties.filter((property) => property.sources.length > 1).length;
  const duplicatesCollapsed = harvest.listings.length - properties.length;
  console.log(
    `[rentals] ${harvest.listings.length} avisos -> ${properties.length} propiedades ` +
      `(${duplicatesCollapsed} repetidos unificados, ${merged} publicadas en más de un portal)`
  );

  // A full sweep that comes back with half of what we had is an outage upstream, not a market that
  // emptied overnight. Publishing it would delete thousands of live listings.
  if (mode === "full" && existing > 200 && properties.length < existing * COLLAPSE_RATIO) {
    console.error(
      `[rentals] la corrida trajo ${properties.length} propiedades contra ${existing} guardadas ` +
        `(< ${Math.round(COLLAPSE_RATIO * 100)} %) — se conserva el directorio anterior`
    );
    process.exit(1);
  }

  const { written, emptied } = await saveRentalProperties(properties, {
    today,
    okSources,
    staleOfferDays: STALE_OFFER_DAYS,
  });

  // Sacar cada aviso de las filas que ya no son su dueña, ANTES de podar: una fila que queda sin
  // ofertas la borra este barrido, y lo que sobrevive entra a la poda con su lastSeen recalculado.
  let pruned = 0;
  if (mode === "full") {
    const reassigned = await dropReassignedOffers(properties);
    if (reassigned.cleaned) {
      console.log(
        `[rentals] ${reassigned.removed} avisos sacados de ${reassigned.cleaned} filas que ya no eran su propiedad (${reassigned.deleted} filas quedaron vacías)`
      );
    }
    pruned = await pruneStaleRentals(today, PRUNE_DAYS);
  }

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
      listings: run.listings.length,
      note: run.note,
    })),
  };
  await saveRentalMeta(meta);

  console.log(
    `[rentals] listo en ${Math.round(meta.durationMs / 1000)}s :: ${written} filas escritas, ` +
      `${emptied} sin ofertas, ${pruned} podadas, ${total} propiedades publicadas`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("[rentals] falló:", error);
  process.exit(1);
});
