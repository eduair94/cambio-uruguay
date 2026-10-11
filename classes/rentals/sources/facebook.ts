// Facebook Marketplace, read through the browser service on the 104 box (pm2
// `facebook_marketplace`, :9657) that owns the logged-in Chrome profile — the same bridge the
// chair directory uses.
//
// Marketplace can add adverts from private owners, frequently without an address beyond the
// city. Neither the portal nor a city label proves ownership, commission terms or unit identity.
// Without an exact address its adverts remain separate: barrio, price and bedroom counts alone
// never establish a cross-advert match. The limited search is always partial coverage.
//
// The bridge needs a live browser session. When it has none it answers
// `FB_MARKETPLACE_SESSION_UNAVAILABLE`, and this harvester reports `ok: false` so the run keeps
// yesterday's Marketplace rows instead of declaring them gone.
import { fetchJson } from "../net";
import {
  flatten,
  inferPropertyType,
  isPlausibleRent,
  looksLikeRentalAdvert,
  parseAttributes,
  parseLocationLine,
} from "../normalize";
import { appDbConfigured } from "../../appdb";
import type { RentalFacebookDetailDocument } from "../../models/RentalFacebookDetail";
import { rentalOfferDetails } from "../details";
import { locateFacebookRental } from "../facebookDetail";
import { guaranteesFromText } from "../guarantees";
import type { RawRental, RentalCurrency } from "../types";
import type { RentalSourceResult } from "./types";
import { FB_RENTALS_CATEGORY, readFacebookRentals, type FacebookRentalRead } from "./facebookBrowser";
import type { MarketplaceSearch } from "../../facebook/search";

const API_BASE = (process.env.RENTALS_FB_API || "http://104.234.204.107:9657/facebook/marketplace").replace(
  /\/+$/,
  ""
);

const QUERIES = ["alquiler apartamento", "alquiler casa", "alquilo apartamento", "alquiler habitacion"];

/** Search anchors, not geographic coverage: Marketplace can also return suggested distant ads.
 * Colonia was corroborated 2026-09-07 by 11 cards explicitly located in Colonia del Sacramento.
 */
const LOCATIONS = (process.env.RENTALS_FB_LOCATIONS || "montevideo,ciudad-de-la-costa,maldonado,salto,paysandu,colonia-del-sacramento")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export interface FbListing {
  id?: string;
  title?: string;
  url?: string;
  price?: { amount?: number; currency?: string };
  image?: string | null;
  location?: string | null;
  seller?: string | null;
  /** Only the browser reader has it: the bridge parses the visible grid. */
  categoryId?: string | null;
}

interface FbResponse {
  ok?: boolean;
  error?: string;
  code?: string;
  results?: FbListing[];
}

/** What the item page said, when currency-rentals-detail already read it (see facebookDetail.ts). */
export type FbRentalDetailInput = Pick<RentalFacebookDetailDocument, "description" | "pinCity" | "latitude" | "longitude"> & { neighborhood?: string | null };

export function toRawRental(item: FbListing, _locationHint: string, detail?: FbRentalDetailInput | null): RawRental | null {
  const id = String(item.id || "").trim();
  const title = String(item.title || "").trim();
  const amount = Number(item.price?.amount);
  const currency = String(item.price?.currency || "UYU").toUpperCase();
  if (!id || !title || !Number.isFinite(amount) || amount <= 0) return null;
  if (currency !== "UYU" && currency !== "USD") return null;
  if (!looksLikeRentalAdvert(title)) return null;
  // Search suggestions include sale cards and generated titles such as "4 habitaciones Casa".
  // The query is not the advert's operation. With no description in this bridge, abstain unless
  // the card itself declares renting; do not remove older adverts based on this partial sample.
  const rentalText = flatten(title)
    .replace(/\b(?:ya no|no)\s+(?:(?:se|lo|la)\s+)?(?:alquila(?:n)?|alquilo|alquiler|arrienda(?:n)?|arriendo)\b/g, "")
    .replace(/\b(?:no (?:es|esta) (?:en|para)|sin opcion (?:de|a))\s+alquiler\b/g, "");
  const titleSaysRent = /\b(?:alquiler(?:es)?|alquilo|alquila(?:n|mos)?|alquilar|arriendo|arrienda(?:n)?|arrendamiento)\b|\balq(?:uil)?(?:\.|(?=\s|:|$))/.test(rentalText);
  // The seller filing the advert under "Propiedades en alquiler" declares the operation as much as
  // the word in the title does: Facebook generates titles like "Monoambiente 1 baño
  // Departamento/condominio" for those. A sale word with no rent word still abstains (above), and
  // the bridge never carries a category, so its cards still need the word.
  if (!titleSaysRent && item.categoryId !== FB_RENTALS_CATEGORY) return null;

  // The card's location is a city ("Montevideo", "Ciudad de la Costa"), never a street.
  // The search anchor is not evidence of where an individual suggested advert is located.
  const location = parseLocationLine(String(item.location || ""));
  // The barrio is in the TITLE, in the DESCRIPTION the detail job read, or nowhere: the bridge
  // returns no description, and the item page's pin is a ~1 km grid point 3–6 km from the property
  // (see neighborhoods.ts / facebookDetail.ts). A title naming a barrio of the card's department
  // refines the card's town; a unique locality names the department when the card gave none; the
  // pin's city only fills a missing department. Anything less stays "sin informar".
  const description = detail?.description || "";
  const { neighborhood, department } = locateFacebookRental({
    title, description, department: location.department, cardNeighborhood: location.neighborhood, pinCity: detail?.pinCity ?? null,
    detailNeighborhood: detail?.neighborhood ?? null,
  });
  const attributes = parseAttributes(description ? [title, description] : [title]);
  // A coordinate only ever comes from a corner or numbered address the seller wrote, geocoded and
  // validated by the detail job; the card and the pin never place an advert.
  const located = !!detail && typeof detail.latitude === "number" && typeof detail.longitude === "number";

  return {
    parkingSpaces: null,
    furnished: null,
    source: "facebook",
    listingId: `facebook:${id}`,
    url: String(item.url || `https://www.facebook.com/marketplace/item/${id}`),
    title,
    price: amount,
    currency: currency as RentalCurrency,
    commonExpenses: null,
    commonExpensesCurrency: null,
    sellerName: String(item.seller || "").trim() || "Facebook Marketplace",
    // Marketplace has no agency flag we can trust; most posters are private, but "most" is not a
    // fact about any given row.
    sellerType: "desconocido",
    image: String(item.image || "").trim() || null,
    publishedAt: null,
    propertyType: inferPropertyType(title),
    department,
    neighborhood,
    address: "",
    street: "",
    streetNumber: "",
    latitude: located ? detail!.latitude : null,
    longitude: located ? detail!.longitude : null,
    bedrooms: attributes.bedrooms,
    bathrooms: attributes.bathrooms,
    area: attributes.area,
    // El puente devuelve id,title,url,price,image,location,condition: no hay campo de mascotas.
    // Y el titulo no alcanza: 3 de 1.947 ofertas de Facebook lo mencionan (0,15 %, medido 2026-09-04).
    // La descripción tampoco cuenta: la política es sólo dato ESTRUCTURADO.
    petsAllowed: null,
    // Las garantías sí salen del texto, como en InfoCasas: la ficha es la única fuente en Facebook.
    guarantees: description ? guaranteesFromText(description) : [],
    ...(description ? {
      description,
      details: rentalOfferDetails({ description, images: item.image ? [item.image] : [] }),
    } : {}),
  };
}

export interface HarvestFacebookOptions {
  /** The stored item-page reads for these listingIds (`facebook:<id>`); defaults to the app DB. */
  details?: (listingIds: readonly string[]) => Promise<ReadonlyMap<string, FbRentalDetailInput>>;
  /** The browser reader; defaults to the profile Chrome (see facebookBrowser.ts). */
  browser?: typeof readFacebookRentals;
}

/**
 * The browser reader's searches. Measured 2026-10-05 on Montevideo, each scrolled to the end:
 * "alquiler" 864 cards, and every further query still added hundreds the others never showed
 * (union 2.355 after the seven, in 13 minutes) — Facebook ranks a search, it does not list a
 * category, so wording is coverage. The hourly run reads only the newest: sorted by creation
 * time, fifteen scrolls of "alquiler" reach back ~66 hours.
 */
// The last two came from a capture-recapture check the same night (13 searches the run never
// made, 1.143 valid adverts): wordings with "alquiler" found 97–99 % already stored, while
// "apartamento para alquilar" found 77 % and "arriendo" 58 % — Facebook matches the word, so a
// seller who wrote "alquilar" or "arriendo" never shows in an "alquiler" search.
const BROWSER_QUERIES = [
  "alquiler", "alquiler apartamento", "alquiler casa", "alquiler monoambiente", "alquiler habitacion", "se alquila", "alquilo",
  "apartamento para alquilar", "arriendo",
];

/**
 * A second capture-recapture (2026-10-10, 19 lists of 30 scrolls against 9.141 stored Facebook
 * offers; the "alquiler" control found 99 % stored, so the yardstick held). Valid adverts already
 * stored, and how many were not:
 * - the "Propiedades en alquiler" CATEGORY, which is not a search: 46 % from Montevideo (110 new),
 *   9 % from Maldonado (93), 4 % from Salto (51), mostly adverts of the interior;
 * - words sellers write instead of "alquiler": "departamento" 73 % (163 new; Facebook's generated
 *   "2 habitaciones 1 baño Departamento/condominio" titles), "garantía" 42 % (142), "monoambiente"
 *   77 % (116), "dormitorios" 82 % (85), "porto seguro" 78 % (44), "contrato" 85 % (32).
 * Left out on purpose: "renta" (78 new, but it brings the sales pitched by their yield, "Monoambiente
 * con RENTA 6.1%"), "alquilar" (39, with dumpsters and chemical toilets), "apartamento" (23),
 * "habitaciones" (21), "pieza" (7), "baño" (2) and "inquilino" (none).
 */
const BROWSER_MORE_QUERIES = ["departamento", "garantía", "monoambiente", "dormitorios", "porto seguro", "contrato"];

/**
 * Premises, measured 2026-10-11 against a store that already held the night's 12.925 adverts:
 * "alquiler oficina" 83 % stored (107 new), "alquiler local comercial" 80 % (91). "alquiler garaje"
 * was 93 % (23) and stays out.
 */
const PREMISES_QUERIES = ["alquiler oficina", "alquiler local comercial"];

/**
 * Facebook's bedroom and property-type filters split the Montevideo category too, less than price
 * (2026-10-11, same store): 1, 2 and 3+ bedrooms 81 % stored, ~50 new each; apartments 78 % (61).
 * Houses (88 %), a finer price band ($ 18–20.000, 91 %: the night's bands already reach it), the last
 * seven days (87 %) and Maldonado in price bands (80–89 %, mostly Montevideo) gave less and stay out.
 * These go to the hourly rotation, not the night.
 */
const FILTER_LISTS: ReadonlyArray<Readonly<Record<string, string | number>>> = [
  { minBedrooms: 1, maxBedrooms: 1 }, { minBedrooms: 2, maxBedrooms: 2 }, { minBedrooms: 3 }, { propertyType: "apartment-condo" },
];

/** Marketplace's slug for the "Propiedades en alquiler" category list. */
export const FB_RENTALS_CATEGORY_SLUG = "propertyrentals";

const searches = (locations: readonly string[], queries: readonly string[]): MarketplaceSearch[] =>
  locations.flatMap(location => queries.map(query => ({ location, query })));

const categoryLists = (locations: readonly string[]): MarketplaceSearch[] =>
  locations.map(location => ({ location, query: "categoría Propiedades en alquiler", category: FB_RENTALS_CATEGORY_SLUG }));

/**
 * Montevideo's rentals category in price bands (pesos, Marketplace's own filter). A list is a
 * ranking Facebook cuts at a few hundred cards; each band reaches as deep as the whole category did.
 * Measured 2026-10-11, 30 scrolls each, valid adverts already stored → new: $ 1–15.000 35 % → 70,
 * 15–22.000 60 % → 144, 22–32.000 41 % → 192, 32–50.000 34 % → 199, 50.000 and up 18 % → 163. The
 * top band stops at $ 200.000: past that are the sales misfiled as rentals.
 */
export const RENTAL_PRICE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [1, 15_000], [15_000, 22_000], [22_000, 32_000], [32_000, 50_000], [50_000, 200_000],
];

const bandLists = (location: string): MarketplaceSearch[] =>
  RENTAL_PRICE_BANDS.map(([minPrice, maxPrice]) => ({
    location, query: `categoría $ ${minPrice}–${maxPrice}`, category: FB_RENTALS_CATEGORY_SLUG, params: { minPrice, maxPrice },
  }));

/**
 * Department capitals read with Marketplace's own radius. Without it an anchor barely filters: the
 * category "from Rivera" was Paysandú, Salto and Florida, and "from Tacuarembó" mostly Montevideo.
 * With `radius=40` it is the town (2026-10-11, new adverts in the anchor's own department): Salto
 * 79 of 80, Tacuarembó 86/86, Colonia 60/60, Paysandú 40/40, Rivera 24/24, Rocha 23/23, Maldonado
 * 27/35, San José 31/33, Durazno 25/29, Treinta y Tres 14/15, Artigas 12/12, Canelones 19/42 (the
 * rest Montevideo's edge). Not here because Facebook does not resolve the slug and answers the
 * national list: melo, fray-bentos, mercedes, trinidad, florida, minas and, with a radius,
 * ciudad-de-la-costa. Small towns can end on their first page, so these lists are `narrow`.
 */
export const RENTAL_LOCAL_ANCHORS = [
  "salto", "tacuarembo", "colonia-del-sacramento", "paysandu", "rivera", "rocha", "maldonado", "san-jose-de-mayo",
  "durazno", "treinta-y-tres", "artigas", "canelones",
];

const localLists = (anchors: readonly string[]): MarketplaceSearch[] =>
  anchors.map(location => ({
    location, query: "categoría local", category: FB_RENTALS_CATEGORY_SLUG, params: { radius: 40 }, narrow: true,
  }));

/**
 * The barrio in the words: Facebook ranks first the adverts that name it, which an "alquiler"
 * search leaves deep. "alquiler pocitos" found 112 adverts not stored (82 % already were), "alquiler
 * cordon" 81 (2026-10-11). The barrios with the most rentals in the directory.
 */
const BARRIO_QUERIES = [
  "alquiler pocitos", "alquiler cordon", "alquiler centro", "alquiler punta carretas", "alquiler parque rodo",
  "alquiler tres cruces", "alquiler malvin", "alquiler buceo",
];

/**
 * The deep lists the hourly run takes three at a time, in Facebook's own order and 40 scrolls deep
 * (the newest-first lists stay at 15): read during the day, not only at night.
 */
export function rentalRotatingLists(home: string): MarketplaceSearch[] {
  const filtered = FILTER_LISTS.map(params => ({
    location: home, query: "categoría filtrada", category: FB_RENTALS_CATEGORY_SLUG, params,
  }));
  return [...bandLists(home), ...localLists(RENTAL_LOCAL_ANCHORS), ...searches([home], BARRIO_QUERIES), ...filtered]
    .map(search => ({ ...search, sort: "relevance" as const, maxScrolls: 40 }));
}

/** The lists the hourly run reads this hour: a different set every hour, each list about three times a day. */
export function rentalHourlyRotation(home: string, hour: number, size = 3): MarketplaceSearch[] {
  const lists = rentalRotatingLists(home);
  const start = (Math.max(0, Math.floor(hour)) * size) % lists.length;
  return [...lists.slice(start), ...lists.slice(0, start)].slice(0, size);
}

function browserPlan(mode: "full" | "fast", now = new Date()): Parameters<typeof readFacebookRentals>[0] {
  const minutes = Number(process.env.RENTALS_FB_BROWSER_MINUTES || (mode === "fast" ? 12 : 150));
  const [home] = LOCATIONS;
  return mode === "fast"
    ? {
      // The newest first: two searches and the category sorted by newest, which stops at its first
      // 24 cards but those are today's (11 of 20 valid ones were not stored, 2026-10-10). Then three
      // deep lists in Facebook's own order, a different set every hour, so the price bands, the
      // towns and the barrios are read again during the day and not only at night.
      searches: [
        ...searches([home!], ["alquiler", "alquiler apartamento"]),
        ...categoryLists([home!]).map(list => ({ ...list, narrow: true })),
        ...rentalHourlyRotation(home!, now.getUTCHours()),
      ],
      sort: "newest", maxScrolls: 15, stagnantRounds: 6,
      maxDurationMs: minutes * 60_000, lockWaitMs: 10 * 60_000,
    }
    : {
      // Ordered by what each list adds, because Facebook throttles a session that scrolls a lot and
      // two stalled lists end the run: what is read first must be what nothing else finds. The
      // broadest search; Montevideo's category in price bands; the other anchors' category (no
      // radius: each is a different national slice, 4–9 % already stored); the words without
      // "alquiler"; the department capitals within their radius; the "alquiler" wordings that mostly
      // repeat each other; the other anchors' searches (Maldonado alone added 494 adverts
      // Montevideo's never showed); the barrios. 62 lists (24 until 2026-10-10), 150 minutes, and a
      // list that stops adding anything new to the run is cut (`runNovelty`) so more of them fit.
      searches: [
        ...searches([home!], BROWSER_QUERIES.slice(0, 1)),
        ...bandLists(home!),
        ...categoryLists(LOCATIONS.slice(1)),
        ...searches([home!], [...BROWSER_MORE_QUERIES.slice(0, 4), ...BROWSER_QUERIES.slice(7), ...BROWSER_MORE_QUERIES.slice(4), ...PREMISES_QUERIES]),
        ...localLists(RENTAL_LOCAL_ANCHORS),
        ...searches([home!], BROWSER_QUERIES.slice(1, 7)),
        ...searches(LOCATIONS.slice(1), BROWSER_QUERIES.slice(0, 3)),
        ...searches([home!], BARRIO_QUERIES),
      ],
      maxScrolls: 150, stagnantRounds: 10, maxDurationMs: minutes * 60_000,
      // A list whose last 10 scrolls (~240 cards) added fewer than 3 the run had not seen is spent:
      // the clock goes to the next list (on 2026-10-11 it ran out at list 35 of 60).
      runNovelty: { rounds: 10, minNew: 3 },
      // Another job's Marketplace read (autos, retail) lasts minutes; the full sweep waits it out.
      lockWaitMs: 30 * 60_000,
    };
}

/** "alquiler 864/864; categoría $ 1–15000 301/120; …" — each read list, in the order read. */
export function rentalListsSummary(searches: readonly MarketplaceSearch[], read: Pick<FacebookRentalRead, "perSearch" | "fresh">): string {
  const label = (search: MarketplaceSearch) => {
    const params = Object.entries(search.params ?? {}).map(([name, value]) => `${name}=${value}`).join(",");
    return `${search.location === "montevideo" ? "" : `${search.location}:`}${search.query}${params ? `[${params}]` : ""}`;
  };
  return searches
    .map((search, index) => ({ search, cards: read.perSearch[index]?.length ?? 0, fresh: read.fresh?.[index] ?? 0 }))
    .filter(row => row.cards > 0)
    .map(row => `${label(row.search)} ${row.cards}/${row.fresh}`)
    .join("; ");
}

/** Card → row, keeping what the item page taught, and the plausibility floor per type. */
async function convert(cards: readonly FbListing[], usdUyu: number, options: HarvestFacebookOptions): Promise<{ listings: RawRental[]; rejected: number }> {
  // The item pages already read by currency-rentals-detail: a re-harvest must keep the barrio,
  // the coordinate and the description learned there, or it would rebuild the identity from the
  // bare card and forget them.
  const ids = cards.map(card => String(card.id || "").trim()).filter(Boolean);
  const details = await (options.details ?? storedDetails)(ids.map(id => `facebook:${id}`));
  const byId = new Map<string, RawRental>();
  let rejected = 0;
  for (const item of cards) {
    const listing = toRawRental(item, "", details.get(`facebook:${String(item.id || "").trim()}`) ?? null);
    if (!listing) { rejected++; continue; }
    const priceUyu = listing.currency === "USD" ? listing.price * usdUyu : listing.price;
    if (!isPlausibleRent(priceUyu, listing.propertyType)) { rejected++; continue; }
    byId.set(listing.listingId, listing);
  }
  return { listings: [...byId.values()], rejected };
}

async function storedDetails(listingIds: readonly string[]): Promise<ReadonlyMap<string, FbRentalDetailInput>> {
  if (!listingIds.length || !appDbConfigured()) return new Map();
  const { loadFacebookDetails } = await import("../facebookDetailStore");
  return loadFacebookDetails(listingIds);
}

export async function harvestFacebookMarketplace(mode: "full" | "fast", usdUyu: number, options: HarvestFacebookOptions = {}): Promise<RentalSourceResult> {
  if (process.env.RENTALS_FB_ENABLED === "0") {
    return { key: "facebook", ok: true, complete: false, listings: [], note: "deshabilitado por configuración" };
  }

  let fallbackReason = "";
  if (process.env.RENTALS_FB_BROWSER !== "0") {
    const plan = browserPlan(mode);
    const read = await (options.browser ?? readFacebookRentals)(plan);
    if (read.busy) {
      // Not the bridge: it drives the same Chrome another job is scrolling right now. ok:false
      // keeps the stored Marketplace rows instead of declaring them gone.
      return { key: "facebook", ok: false, complete: false, listings: [], note: read.note || "navegador ocupado" };
    }
    if (read.lists > 0) {
      // What each list delivered and how much of it no earlier list had: the data to reorder or
      // drop lists by, instead of guessing (pm2 log; the stored note stays short).
      console.log(`[rentals] facebook por lista (tarjetas/nuevas): ${rentalListsSummary(plan.searches, read)}`);
      const { listings, rejected } = await convert(read.cards, usdUyu, options);
      return {
        key: "facebook",
        // Scrolled to the end, a search is still Facebook's ranking of the market, not the market.
        complete: false,
        ok: true,
        listings,
        note: `navegador: ${listings.length} avisos únicos de ${read.cards.length} tarjetas (${read.reads} lecturas); ${rejected} descartados; `
          + `${read.lists} búsquedas (${read.exhausted} leídas hasta el final, ${read.stalled} sin cargar más que la primera página, `
          + `${read.spent ?? 0} cortadas por no sumar nada nuevo), ${read.failed} fallidas`
          + (read.note ? `; ${read.note}` : ""),
      };
    }
    fallbackReason = `navegador sin lecturas (${read.note || "sin búsquedas"}); `;
  }

  const configuredLimit = Number(process.env.RENTALS_FB_LIMIT || 40);
  const perQuery = Number.isFinite(configuredLimit) ? Math.min(120, Math.max(1, Math.floor(configuredLimit))) : 40;
  const locations = mode === "fast" ? LOCATIONS.slice(0, 1) : LOCATIONS;
  const queries = mode === "fast" ? QUERIES.slice(0, 2) : QUERIES;

  const cards = new Map<string, FbListing>();
  let successful = 0;
  let failed = 0;
  let rawRows = 0;
  let rejected = 0;
  let lastError = "";

  for (const location of locations) {
    for (const query of queries) {
      const url = `${API_BASE}/search?${new URLSearchParams({
        q: query,
        location,
        limit: String(perQuery),
      })}`;
      let transport = "";
      const payload = await fetchJson<FbResponse>(url, {
        timeoutMs: 120_000, retries: 1, unthrottled: true, onFailure: (reason) => { transport = reason; },
      });
      if (!payload) {
        failed++;
        // A dead bridge (connection refused) and a slow one (timeout) need different fixes.
        lastError = `sin respuesta del servicio${transport ? ` (${transport})` : ""}`;
        continue;
      }
      if (payload.ok !== true || payload.error || !Array.isArray(payload.results)) {
        failed++;
        // Provider errors may contain internal URLs or account diagnostics. Report only a code.
        lastError = /^FB_MARKETPLACE_[A-Z_]{1,60}$/.test(payload.code || "")
          ? payload.code! : "respuesta inválida del servicio";
        continue;
      }
      successful++;
      rawRows += payload.results.length;

      for (const item of payload.results) {
        const id = String(item?.id || "").trim();
        if (id && !cards.has(id)) cards.set(id, item);
      }
    }
  }

  const converted = await convert([...cards.values()], usdUyu, options);
  rejected = converted.rejected;

  return {
    key: "facebook",
    // The bridge returns a limited set per city/query, never the entire live marketplace.
    complete: false,
    ok: successful > 0,
    listings: converted.listings,
    note: `${fallbackReason}${converted.listings.length} avisos únicos de ${rawRows} lecturas; ${rejected} descartados; `
      + `${successful}/${locations.length * queries.length} consultas respondidas, ${failed} fallidas; `
      + `cobertura parcial: ${locations.length} ciudades de búsqueda, hasta ${perQuery} tarjetas por consulta, con sugerencias de otras zonas`
      + (failed ? `; último fallo: ${lastError}` : ""),
  };
}
